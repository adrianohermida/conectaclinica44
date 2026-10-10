import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Vincula médico existente a um User (cria convite ou user direto)
 * Caso: Médico cadastrado mas sem acesso ao sistema
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { medico_id, criar_convite = true } = await req.json();

    if (!medico_id) {
      return Response.json({ error: 'Missing medico_id' }, { status: 400 });
    }

    // Buscar médico
    const medicos = await base44.asServiceRole.entities.Medico.filter({ id: medico_id });
    
    if (medicos.length === 0) {
      return Response.json({ error: 'Médico não encontrado' }, { status: 404 });
    }

    const medico = medicos[0];

    // Verificar se já tem user
    const todosUsers = await base44.asServiceRole.entities.User.list();
    const userExistente = todosUsers.find(u => u.email === medico.email);

    if (userExistente) {
      // Apenas vincular à clínica
      if (userExistente.clinica_id !== user.clinica_id) {
        await base44.asServiceRole.entities.User.update(userExistente.id, {
          clinica_id: user.clinica_id,
          cargo: 'medico'
        });
        return Response.json({
          success: true,
          acao: 'vinculado',
          user_id: userExistente.id,
          mensagem: 'Médico vinculado à clínica'
        });
      } else {
        return Response.json({
          success: true,
          acao: 'ja_vinculado',
          user_id: userExistente.id,
          mensagem: 'Médico já possui acesso à clínica'
        });
      }
    }

    if (criar_convite) {
      // Criar convite
      const response = await base44.functions.invoke('enviarConviteUsuario', {
        email_convidado: medico.email,
        perfil_atribuido: 'medico',
        full_name: medico.nome_completo
      });

      return Response.json({
        success: true,
        acao: 'convite_enviado',
        convite_link: response.data.link,
        mensagem: `Convite enviado para ${medico.email}`
      });
    } else {
      return Response.json({
        success: false,
        mensagem: 'Defina criar_convite=true para enviar convite'
      });
    }

  } catch (error) {
    console.error('[vincularMedicoAoUser] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});