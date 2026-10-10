import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO: Auditoria completa equipe Prevenclin
 * - Listar todos users da clínica
 * - Verificar médicos sem user vinculado
 * - Verificar convites pendentes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - SuperAdmin only' }, { status: 403 });
    }

    const PREVENCLIN_ID = '693b0e83f39075985e2a5568';

    // 1. Users da clínica
    const todosUsers = await base44.asServiceRole.entities.User.list();
    const usersPrevenclin = todosUsers.filter(u => u.clinica_id === PREVENCLIN_ID);

    // 2. Médicos da clínica
    const medicos = await base44.asServiceRole.entities.Medico.filter({
      clinica_id: PREVENCLIN_ID,
      ativo: true
    });

    // 3. Médicos SEM user vinculado
    const medicosSemUser = medicos.filter(m => 
      !usersPrevenclin.some(u => u.email === m.email)
    );

    // 4. Convites pendentes
    const convites = await base44.asServiceRole.entities.ConviteUsuario.filter({
      clinica_id: PREVENCLIN_ID
    });
    const convitesPendentes = convites.filter(c => c.status === 'pendente');

    // 5. Prontuários por médico
    const prontuarios = await base44.asServiceRole.entities.Prontuario.filter({
      clinica_id: PREVENCLIN_ID
    });

    const estatisticas = {
      total_users: usersPrevenclin.length,
      total_medicos: medicos.length,
      medicos_sem_user: medicosSemUser.length,
      convites_pendentes: convitesPendentes.length,
      total_prontuarios: prontuarios.length
    };

    return Response.json({
      success: true,
      estatisticas,
      users: usersPrevenclin.map(u => ({
        id: u.id,
        nome: u.full_name,
        email: u.email,
        cargo: u.cargo,
        role: u.role
      })),
      medicos: medicos.map(m => ({
        id: m.id,
        nome: m.nome_completo,
        email: m.email,
        crm: m.crm,
        tem_user: usersPrevenclin.some(u => u.email === m.email)
      })),
      medicos_sem_user: medicosSemUser.map(m => ({
        id: m.id,
        nome: m.nome_completo,
        email: m.email,
        crm: m.crm,
        prontuarios_count: prontuarios.filter(p => p.medico_crm === m.crm).length
      })),
      convites_pendentes: convitesPendentes.map(c => ({
        email: c.email_convidado,
        perfil: c.perfil_atribuido,
        enviado_em: c.data_envio,
        expira_em: c.data_expiracao
      }))
    });

  } catch (error) {
    console.error('[diagnosticoEquipePrevenclin] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});