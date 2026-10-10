import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    // Buscar todos os users da clínica via service role
    const users = await base44.asServiceRole.entities.User.list();
    const clinicaUsers = users.filter(u => u.clinica_id === clinica_id);

    if (clinicaUsers.length === 0) {
      return Response.json({ error: 'Nenhum usuário encontrado para essa clínica' }, { status: 404 });
    }

    // Atualizar cada user com permissões de admin
    const updates = [];
    for (const user of clinicaUsers) {
      const update = await base44.asServiceRole.entities.User.update(user.id, {
        role: 'admin',
        perfil: 'admin',
        permissoes: {
          modulos: ['*'],
          acoes: ['*']
        }
      });
      updates.push(update);
    }

    return Response.json({
      success: true,
      message: `${updates.length} usuário(s) atualizado(s) com permissões de admin`,
      users: updates.map(u => ({ id: u.id, email: u.email, role: u.role, perfil: u.perfil }))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});