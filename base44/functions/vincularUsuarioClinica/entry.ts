import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ONLY admin can link users
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const { email, clinica_id, perfil = 'user' } = await req.json();

    if (!email || !clinica_id) {
      return Response.json({ error: 'Missing email or clinica_id' }, { status: 400 });
    }

    // Find target user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Update user with clinica_id
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      clinica_id,
      perfil,
      onboarding_completo: true
    });

    return Response.json({ 
      success: true,
      message: `User ${email} linked to clinic ${clinica_id}`,
      user: { email, clinica_id, perfil }
    });

  } catch (error) {
    console.error('Link user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});