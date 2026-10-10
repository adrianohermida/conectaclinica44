import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION: Vincular Medico.usuario_id com User.id baseado em email
 * CRÍTICO: Resolve permissões quebradas (médico A editando prontuários médico B)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Migration] 🚀 Iniciando migration usuario_id em Medicos...');

    // STEP 1: Buscar TODOS users (email → ID)
    const users = await base44.asServiceRole.entities.User.list();
    const emailToUserId = new Map();
    
    users.forEach(u => {
      if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id);
    });

    console.log(`[Migration] 👥 ${emailToUserId.size} users mapeados (email → ID)`);

    // STEP 2: Buscar médicos SEM usuario_id
    const medicos = await base44.asServiceRole.entities.Medico.filter({
      usuario_id: { $exists: false }
    }, '-created_date', 1000);

    console.log(`[Migration] 👨‍⚕️ ${medicos.length} médicos órfãos encontrados`);

    let corrigidos = 0;
    let erros = 0;
    const errosDetalhados = [];

    // STEP 3: Atualizar em lote
    for (const medico of medicos) {
      try {
        if (!medico.email) {
          erros++;
          errosDetalhados.push({
            medico_id: medico.id,
            nome: medico.nome_completo,
            erro: 'Email não cadastrado'
          });
          continue;
        }

        const userId = emailToUserId.get(medico.email.toLowerCase());

        if (!userId) {
          erros++;
          errosDetalhados.push({
            medico_id: medico.id,
            nome: medico.nome_completo,
            email: medico.email,
            erro: 'User não encontrado - médico deve aceitar convite primeiro'
          });
          continue;
        }

        await base44.asServiceRole.entities.Medico.update(medico.id, {
          usuario_id: userId
        });

        corrigidos++;
      } catch (error) {
        erros++;
        errosDetalhados.push({
          medico_id: medico.id,
          erro: error.message
        });
      }
    }

    console.log(`[Migration] ✅ ${corrigidos} corrigidos | ❌ ${erros} erros`);

    return Response.json({
      success: true,
      total: medicos.length,
      corrigidos,
      erros,
      erros_detalhados: errosDetalhados,
      acao_necessaria: erros > 0 ? 'Enviar convites para médicos sem User vinculado' : null
    });
  } catch (error) {
    console.error('[Migration] ❌ FALHA:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});