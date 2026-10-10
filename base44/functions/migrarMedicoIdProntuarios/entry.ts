import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BLOQUEADOR DIA 0: Migrar medico_crm → medico_id
 * CRÍTICO: Arquitetura atual sem foreign key = prontuários órfãos quando médico muda CRM
 * 
 * Tempo: 60min (migration + backfill + validação)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado - apenas SuperAdmin' }, { status: 403 });
    }

    const { modo } = await req.json();

    // MODO 1: Diagnóstico (não altera dados)
    if (modo === 'diagnostico') {
      const prontuarios = await base44.asServiceRole.entities.Prontuario.list('-created_date', 1000);
      const medicos = await base44.asServiceRole.entities.Medico.list('-created_date', 500);

      console.log('📊 Diagnóstico iniciado:', {
        total_prontuarios: prontuarios.length,
        total_medicos: medicos.length
      });

      // AMOSTRA para debug
      const amostraProntuarios = prontuarios.slice(0, 5).map(p => ({
        medico_crm: p.medico_crm,
        medico_nome: p.medico_nome,
        tem_medico_id: !!p.medico_id
      }));

      const amostraMedicos = medicos.slice(0, 5).map(m => ({
        crm: m.crm,
        crms_array: m.crms,
        nome: m.nome_completo
      }));

      console.log('Amostra prontuários:', amostraProntuarios);
      console.log('Amostra médicos:', amostraMedicos);

      const diagnostico = {
        total_prontuarios: prontuarios.length,
        prontuarios_sem_medico_id: prontuarios.filter(p => !p.medico_id).length,
        prontuarios_orfaos: [],
        medicos_cadastrados: medicos.length,
        conflitos_crm: [],
        formatos_detectados: {
          prontuario_crm_sample: amostraProntuarios,
          medico_crm_sample: amostraMedicos
        }
      };

      // CRITICAL: Médico entity tem ARRAY crms[], não string crm
      // Precisamos buscar dentro do array
      const matchesPorEstrategia = {
        match_crm_string: 0,
        match_crms_array: 0,
        match_por_nome: 0,
        sem_match: 0
      };

      for (const pront of prontuarios.filter(p => !p.medico_id)) {
        let medicoEncontrado = null;

        // ESTRATÉGIA 1: Match direto crm (deprecated field)
        medicoEncontrado = medicos.find(m => m.crm === pront.medico_crm);
        if (medicoEncontrado) {
          matchesPorEstrategia.match_crm_string++;
          continue;
        }

        // ESTRATÉGIA 2: Match no array crms[] (formato novo: [{numero, estado}])
        medicoEncontrado = medicos.find(m => 
          m.crms?.some(crmObj => {
            const crmFormatado = `${crmObj.numero}/${crmObj.estado}`;
            return crmFormatado === pront.medico_crm || crmObj.numero === pront.medico_crm;
          })
        );
        if (medicoEncontrado) {
          matchesPorEstrategia.match_crms_array++;
          continue;
        }

        // ESTRATÉGIA 3: Match por nome (fallback)
        if (pront.medico_nome) {
          medicoEncontrado = medicos.find(m => 
            m.nome_completo?.toLowerCase() === pront.medico_nome?.toLowerCase()
          );
          if (medicoEncontrado) {
            matchesPorEstrategia.match_por_nome++;
            continue;
          }
        }

        // Órfão confirmado
        matchesPorEstrategia.sem_match++;
        diagnostico.prontuarios_orfaos.push({
          id: pront.id,
          paciente: pront.paciente_nome,
          medico_crm: pront.medico_crm,
          medico_nome: pront.medico_nome,
          data: pront.data_atendimento
        });
      }

      diagnostico.estrategias_matching = matchesPorEstrategia;

      // Detectar CRMs duplicados nos médicos
      const crmMap = {};
      medicos.forEach(m => {
        const crmKey = m.crm || (m.crms?.[0] ? `${m.crms[0].numero}/${m.crms[0].estado}` : 'sem-crm');
        if (!crmMap[crmKey]) crmMap[crmKey] = [];
        crmMap[crmKey].push(m.nome_completo);
      });

      for (const [crm, nomes] of Object.entries(crmMap)) {
        if (nomes.length > 1) {
          diagnostico.conflitos_crm.push({
            crm,
            medicos: nomes,
            prontuarios_afetados: prontuarios.filter(p => p.medico_crm === crm).length
          });
        }
      }

      return Response.json({
        success: true,
        diagnostico,
        recomendacao: diagnostico.prontuarios_orfaos.length > 0
          ? `⚠️ ${diagnostico.prontuarios_orfaos.length} prontuários órfãos (${matchesPorEstrategia.sem_match} sem match) - analisar formatos`
          : diagnostico.conflitos_crm.length > 0
          ? `⚠️ ${diagnostico.conflitos_crm.length} CRMs duplicados - limpar duplicatas primeiro`
          : '✅ Pronto para migration'
      });
    }

    // MODO 2: Migração (backfill medico_id) - MULTI-ESTRATÉGIA + BATCH
    if (modo === 'migrar') {
      const prontuarios = await base44.asServiceRole.entities.Prontuario.filter({ medico_id: null });
      const medicos = await base44.asServiceRole.entities.Medico.list();

      let sucesso = 0;
      let falhas = 0;
      let criados = 0;
      let skipped = 0;
      const logs = [];

      // CRÍTICO: Processar em batch (50 por vez) para evitar rate limit
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(prontuarios.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = prontuarios.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
        console.log(`📦 Batch ${batchIndex + 1}/${totalBatches} (${batch.length} prontuários)`);

        for (const pront of batch) {
          // FILTRO: Skip prontuários sem clinica_id (dados corrompidos)
          if (!pront.clinica_id) {
            skipped++;
            logs.push({
              tipo: 'SKIP_CLINICA_NULL',
              prontuario_id: pront.id,
              problema: 'clinica_id null - dado corrompido'
            });
            continue;
          }
        let medico = null;

        // ESTRATÉGIA 1: Match crm direto (deprecated)
        medico = medicos.find(m => m.crm === pront.medico_crm);

        // ESTRATÉGIA 2: Match no array crms[]
        if (!medico) {
          medico = medicos.find(m => 
            m.crms?.some(crmObj => {
              const crmFormatado = `${crmObj.numero}/${crmObj.estado}`;
              return crmFormatado === pront.medico_crm || crmObj.numero === pront.medico_crm;
            })
          );
        }

        // ESTRATÉGIA 3: Match por nome
        if (!medico && pront.medico_nome) {
          medico = medicos.find(m => 
            m.nome_completo?.toLowerCase().trim() === pront.medico_nome?.toLowerCase().trim()
          );
        }

        // ESTRATÉGIA 4: CRIAR MÉDICO se órfão (auto-healing)
        if (!medico && pront.medico_crm && pront.medico_nome) {
          // CRÍTICO: Skip se prontuário sem clinica_id (dados corrompidos)
          if (!pront.clinica_id) {
            falhas++;
            logs.push({
              tipo: 'SKIP_SEM_CLINICA',
              prontuario_id: pront.id,
              crm: pront.medico_crm,
              erro: 'Prontuário sem clinica_id - dados corrompidos, impossível criar médico'
            });
            continue;
          }

          try {
            // Parse CRM (formato esperado: 12345/AM ou só 12345)
            const crmParts = pront.medico_crm.includes('/') 
              ? pront.medico_crm.split('/')
              : [pront.medico_crm, 'SP']; // Default SP se não tem estado

            const novoMedico = await base44.asServiceRole.entities.Medico.create({
              clinica_id: pront.clinica_id,
              nome_completo: pront.medico_nome,
              crm: pront.medico_crm, // Manter deprecated por compatibilidade
              crms: [{
                numero: crmParts[0],
                estado: crmParts[1] || 'SP',
                especialidade: 'Não informado'
              }],
              email: `medico_${crmParts[0]}@temp.conectaclinica.com.br`, // Email placeholder
              ativo: true
            });

            medico = novoMedico;
            criados++;
            logs.push({
              tipo: 'CRIADO',
              medico_id: novoMedico.id,
              crm: pront.medico_crm,
              nome: pront.medico_nome
            });
          } catch (error) {
            falhas++;
            logs.push({
              tipo: 'ERRO_CRIAR_MEDICO',
              prontuario_id: pront.id,
              crm: pront.medico_crm,
              erro: error.message
            });
            continue; // CRITICAL: Não tentar update se falhou criar médico
          }
        }

        if (medico) {
          try {
            await base44.asServiceRole.entities.Prontuario.update(pront.id, {
              medico_id: medico.id
            });
            sucesso++;
          } catch (error) {
            falhas++;
            logs.push({
              tipo: 'ERRO_UPDATE',
              prontuario_id: pront.id,
              erro: error.message
            });
          }
        } else {
          falhas++;
          logs.push({
            tipo: 'ORFAO_NAO_RESOLVIDO',
            prontuario_id: pront.id,
            crm_buscado: pront.medico_crm,
            nome_buscado: pront.medico_nome
          });
        }
      }

        // Delay entre batches para evitar rate limit (250ms)
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      return Response.json({
        success: true,
        total_processados: prontuarios.length,
        sucesso,
        falhas,
        skipped,
        medicos_criados: criados,
        logs_erros: logs.filter(l => !['CRIADO'].includes(l.tipo)),
        medicos_novos: logs.filter(l => l.tipo === 'CRIADO'),
        dados_corrompidos: logs.filter(l => l.tipo.startsWith('SKIP'))
      });
    }

    // MODO 3: LIMPAR dados corrompidos (clinica_id NULL)
    if (modo === 'limpar_corrompidos') {
      const prontuarios = await base44.asServiceRole.entities.Prontuario.list('-created_date', 1000);
      const corrompidos = prontuarios.filter(p => !p.clinica_id);

      if (corrompidos.length === 0) {
        return Response.json({
          success: true,
          message: '✅ Nenhum dado corrompido encontrado'
        });
      }

      console.log(`🗑️ Deletando ${corrompidos.length} prontuários sem clinica_id`);

      let deletados = 0;
      const logs = [];

      for (const pront of corrompidos) {
        try {
          await base44.asServiceRole.entities.Prontuario.delete(pront.id);
          deletados++;
          logs.push({
            prontuario_id: pront.id,
            paciente: pront.paciente_nome,
            medico_crm: pront.medico_crm,
            data: pront.data_atendimento
          });
        } catch (error) {
          console.error(`Erro ao deletar ${pront.id}:`, error.message);
        }
      }

      return Response.json({
        success: true,
        deletados,
        total_corrompidos: corrompidos.length,
        detalhes: logs,
        message: `🗑️ ${deletados} prontuários corrompidos DELETADOS permanentemente`
      });
    }

    // MODO 4: Validação pós-migration
    if (modo === 'validar') {
      const prontuarios = await base44.asServiceRole.entities.Prontuario.list('-created_date', 1000);
      const medicos = await base44.asServiceRole.entities.Medico.list();

      const validacao = {
        total: prontuarios.length,
        com_medico_id: prontuarios.filter(p => p.medico_id).length,
        sem_medico_id: prontuarios.filter(p => !p.medico_id).length,
        medico_id_invalido: [],
        consistencia_ok: true
      };

      // Validar foreign key (medico_id existe na entity Medico)
      for (const pront of prontuarios.filter(p => p.medico_id)) {
        const medicoExiste = medicos.some(m => m.id === pront.medico_id);
        if (!medicoExiste) {
          validacao.medico_id_invalido.push({
            prontuario_id: pront.id,
            medico_id: pront.medico_id,
            problema: 'medico_id aponta para médico inexistente'
          });
          validacao.consistencia_ok = false;
        }
      }

      return Response.json({
        success: true,
        validacao,
        resultado: validacao.consistencia_ok && validacao.sem_medico_id === 0
          ? '✅ Migration 100% OK - arquitetura sólida'
          : `⚠️ ${validacao.sem_medico_id} prontuários sem medico_id ou inconsistências`
      });
    }

    return Response.json({ error: 'Modo inválido. Use: diagnostico | migrar | validar | limpar_corrompidos' }, { status: 400 });

  } catch (error) {
    console.error('Erro migration medico_id:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});