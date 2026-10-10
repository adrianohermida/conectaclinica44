import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Aceite NÃO precisa de user autenticado (é público)
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    // Buscar convite
    const convites = await base44.asServiceRole.entities.ConviteUsuario.filter({ token });
    
    if (convites.length === 0) {
      return Response.json({ error: 'Convite não encontrado' }, { status: 404 });
    }

    const convite = convites[0];

    // Validar status
    if (convite.status === 'aceito') {
      return Response.json({ error: 'Convite já aceito anteriormente' }, { status: 400 });
    }

    if (convite.status === 'cancelado') {
      return Response.json({ error: 'Convite foi cancelado' }, { status: 400 });
    }

    if (convite.status !== 'pendente') {
      return Response.json({ error: `Convite ${convite.status}` }, { status: 400 });
    }

    // Validar expiração
    if (new Date(convite.data_expiracao) < new Date()) {
      await base44.asServiceRole.entities.ConviteUsuario.update(convite.id, {
        status: 'expirado'
      });
      return Response.json({ error: 'Convite expirado' }, { status: 400 });
    }

    // Buscar user pelo email
    const users = await base44.asServiceRole.entities.User.filter({
      email: convite.email_convidado
    });

    let userId;

    if (users.length === 0) {
      // User ainda não existe - retornar flag para criar
      return Response.json({
        success: true,
        action: 'criar_usuario',
        convite_data: {
          email: convite.email_convidado,
          clinica_id: convite.clinica_id,
          clinica_nome: convite.clinica_nome,
          perfil: convite.perfil_atribuido,
          token: convite.token
        }
      });
    } else {
      userId = users[0].id;
    }

    // Verificar se já existe vínculo
    const vinculosExistentes = await base44.asServiceRole.entities.UsuarioClinica.filter({
      user_id: userId,
      clinica_id: convite.clinica_id
    });

    if (vinculosExistentes.length > 0) {
      const vinculo = vinculosExistentes[0];
      
      // Reativar se inativo
      if (!vinculo.ativo) {
        await base44.asServiceRole.entities.UsuarioClinica.update(vinculo.id, {
          ativo: true,
          perfil: convite.perfil_atribuido,
          data_entrada: new Date().toISOString()
        });
      } else {
        // Já está ativo - só atualizar perfil se diferente
        if (vinculo.perfil !== convite.perfil_atribuido) {
          await base44.asServiceRole.entities.UsuarioClinica.update(vinculo.id, {
            perfil: convite.perfil_atribuido
          });
        }
      }
    } else {
      // Criar vínculo novo
      const clinicas = await base44.asServiceRole.entities.Clinica.filter({ 
        id: convite.clinica_id 
      });
      
      await base44.asServiceRole.entities.UsuarioClinica.create({
        user_id: userId,
        user_email: convite.email_convidado,
        clinica_id: convite.clinica_id,
        clinica_nome: clinicas[0]?.nome || convite.clinica_nome,
        perfil: convite.perfil_atribuido,
        ativo: true,
        data_entrada: new Date().toISOString()
      });
    }

    // Marcar convite como aceito
    await base44.asServiceRole.entities.ConviteUsuario.update(convite.id, {
      status: 'aceito',
      data_aceite: new Date().toISOString()
    });

    return Response.json({
      success: true,
      action: 'redirect_to_app',
      clinica_id: convite.clinica_id,
      clinica_nome: convite.clinica_nome,
      perfil: convite.perfil_atribuido
    });

  } catch (error) {
    console.error('Erro ao aceitar convite:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro desconhecido ao processar convite'
    }, { status: 500 });
  }
});