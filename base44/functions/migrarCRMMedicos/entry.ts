import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION: Adicionar campo 'crm' (string) na entidade Medico
 * BATCHING + RETRY para prevenir rate limit
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check - APENAS SuperAdmin pode rodar migrations
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - SuperAdmin only' }, { status: 403 });
    }

    // FASE 1: Diagnóstico
    const todosMedicos = await base44.asServiceRole.entities.Medico.list();
    const medicosSemCRM = todosMedicos.filter(m => !m.crm);
    const medicosComCRM = todosMedicos.filter(m => m.crm);

    console.log(`[MIGRATION] Total médicos: ${todosMedicos.length}`);
    console.log(`[MIGRATION] Sem campo 'crm': ${medicosSemCRM.length}`);
    console.log(`[MIGRATION] Com campo 'crm': ${medicosComCRM.length}`);

    if (medicosSemCRM.length === 0) {
      return Response.json({
        status: 'skip',
        message: 'Migration já executada - todos médicos possuem campo crm',
        diagnostico: {
          total: todosMedicos.length,
          migrados: medicosComCRM.length,
          pendentes: 0
        }
      });
    }

    // FASE 2: Migration com BATCHING + DELAY
    const resultados = {
      total: medicosSemCRM.length,
      sucesso: 0,
      falhas: 0,
      erros: []
    };

    const BATCH_SIZE = 5;
    const DELAY_MS = 3000;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Processar em batches
    for (let i = 0; i < medicosSemCRM.length; i += BATCH_SIZE) {
      const batch = medicosSemCRM.slice(i, i + BATCH_SIZE);
      console.log(`[MIGRATION] Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(medicosSemCRM.length/BATCH_SIZE)} (${batch.length} médicos)`);

      await Promise.all(batch.map(async (medico) => {
        try {
          let crmFormatado = null;
          
          if (medico.crms && medico.crms.length > 0 && medico.crms[0].numero) {
            const primeiroCRM = medico.crms[0];
            crmFormatado = `${primeiroCRM.numero}/${primeiroCRM.estado || 'AM'}`;
          } else {
            console.warn(`[MIGRATION] Médico ${medico.id} sem CRM válido`);
            resultados.erros.push({
              medico_id: medico.id,
              nome: medico.nome_completo,
              erro: 'CRM não encontrado em crms array'
            });
            resultados.falhas++;
            return;
          }

          await base44.asServiceRole.entities.Medico.update(medico.id, {
            crm: crmFormatado
          });

          resultados.sucesso++;
          console.log(`[MIGRATION] ✅ ${medico.nome_completo} - ${crmFormatado}`);

        } catch (error) {
          resultados.falhas++;
          resultados.erros.push({
            medico_id: medico.id,
            nome: medico.nome_completo,
            erro: error.message
          });
          console.error(`[MIGRATION] ❌ ${medico.id}:`, error.message);
        }
      }));

      // Delay entre batches
      if (i + BATCH_SIZE < medicosSemCRM.length) {
        console.log(`[MIGRATION] Delay ${DELAY_MS}ms...`);
        await sleep(DELAY_MS);
      }
    }

    // FASE 3: Validação
    const medicosApos = await base44.asServiceRole.entities.Medico.list();
    const comCRMApos = medicosApos.filter(m => m.crm);
    const taxa = (comCRMApos.length / medicosApos.length) * 100;

    return Response.json({
      status: 'success',
      message: `Migration concluída - ${resultados.sucesso}/${resultados.total} médicos migrados`,
      resultados,
      validacao: {
        total_apos_migration: medicosApos.length,
        com_crm: comCRMApos.length,
        taxa_sucesso: `${taxa.toFixed(1)}%`
      }
    });

  } catch (error) {
    console.error('[MIGRATION] Erro fatal:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});