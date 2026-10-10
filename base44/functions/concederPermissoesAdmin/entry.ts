import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const caller = await base44.auth.me();
    if (!caller || caller.email !== 'contato@aetherlab.com.br') {
      return Response.json({ error: 'Unauthorized - only AetherLab can grant permissions' }, { status: 403 });
    }

    const { user_email, clinica_id } = await req.json();

    if (!user_email || !clinica_id) {
      return Response.json({ error: 'user_email and clinica_id required' }, { status: 400 });
    }

    // Buscar usuário por email
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Atualizar APENAS permissoes e perfil (NÃO role)
    const updated = await base44.asServiceRole.entities.User.update(user.id, {
      perfil: 'admin',
      permissoes: {
        modulos: ['*'],
        acoes: { '*': ['*'] }
      },
      clinica_id: clinica_id,
      modulos_visitados: user.modulos_visitados || [],
      preferencias: user.preferencias || {}
    });

    return Response.json({ 
      success: true, 
      message: `Permissões admin concedidas para ${user_email}`,
      user: {
        id: updated.id,
        email: updated.email,
        perfil: updated.perfil,
        permissoes: updated.permissoes
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});