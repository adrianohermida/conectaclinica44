import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION: Preencher medico_id em Prontuarios órfãos + validar integridade
 * CRÍTICO: Pós-migration medico_id será required (CFM 1.821/07)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Migration] 🚀 Iniciando migration medico_id...');

    // STEP 1: Buscar TODOS médicos (cache CRM → ID)
    const medicos = await base44.asServiceRole.entities.Medico.list();
    const crmToId = new Map();
    
    medicos.forEach(m => {
      const crm = m.crm || (m.crms?.[0] ? `${m.crms[0].numero}/${m.crms[0].estado}` : null);
      if (crm) crmToId.set(crm, m.id);
    });

    console.log(`[Migration] 📋 ${crmToId.size} médicos mapeados (CRM → ID)`);

    // STEP 2: Buscar prontuários SEM medico_id
    const prontuarios = await base44.asServiceRole.entities.Prontuario.filter({
      medico_id: { $exists: false }
    }, '-created_date', 1000);

    console.log(`[Migration] 📊 ${prontuarios.length} prontuários órfãos encontrados`);

    let corrigidos = 0;
    let erros = 0;
    const errosDetalhados = [];

    // STEP 3: Atualizar em lote (batch 10)
    for (let i = 0; i < prontuarios.length; i += 10) {
      const batch = prontuarios.slice(i, i + 10);
      
      await Promise.all(batch.map(async (p) => {
        try {
          const medicoId = crmToId.get(p.medico_crm);
          
          if (!medicoId) {
            erros++;
            errosDetalhados.push({
              prontuario_id: p.id,
              paciente: p.paciente_nome,
              medico_crm: p.medico_crm,
              erro: 'Médico não encontrado no sistema'
            });
            return;
          }

          await base44.asServiceRole.entities.Prontuario.update(p.id, {
            medico_id: medicoId
          });

          corrigidos++;
        } catch (error) {
          erros++;
          errosDetalhados.push({
            prontuario_id: p.id,
            erro: error.message
          });
        }
      }));
    }

    console.log(`[Migration] ✅ ${corrigidos} corrigidos | ❌ ${erros} erros`);

    return Response.json({
      success: true,
      total: prontuarios.length,
      corrigidos,
      erros,
      erros_detalhados: errosDetalhados
    });
  } catch (error) {
    console.error('[Migration] ❌ FALHA:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});