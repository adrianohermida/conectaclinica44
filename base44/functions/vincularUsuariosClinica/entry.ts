import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Vincula usuários existentes à clínica existente
 * ADMIN ONLY - Uso único para corrigir dados
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { clinica_id, user_emails } = await req.json();

    if (!clinica_id || !Array.isArray(user_emails)) {
      return Response.json({ error: 'Missing clinica_id or user_emails[]' }, { status: 400 });
    }

    const clinicas = await base44.entities.Clinica.filter({ id: clinica_id });
    if (clinicas.length === 0) {
      return Response.json({ error: 'Clinica not found' }, { status: 404 });
    }

    const results = [];

    for (const email of user_emails) {
      try {
        // Atualizar built-in user (via custom user data)
        // Nota: base44.auth.updateMe() só funciona para current user
        // Para outros users, usar User entity
        
        const userExistente = await base44.asServiceRole.entities.User.filter({ created_by: email });
        
        if (userExistente.length > 0) {
          // Atualizar User entity existente
          await base44.asServiceRole.entities.User.update(userExistente[0].id, {
            clinica_id: clinica_id,
            perfil: 'admin',
            status: 'ativo',
            onboarding_completo: true
          });
          results.push({ email, status: 'updated' });
        } else {
          // Criar User entity
          await base44.asServiceRole.entities.User.create({
            clinica_id: clinica_id,
            perfil: 'admin',
            status: 'ativo',
            permissoes: { modulos: ['*'], acoes: ['*'] },
            onboarding_completo: true,
            modulos_visitados: []
          });
          results.push({ email, status: 'created' });
        }
      } catch (error) {
        results.push({ email, status: 'error', message: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      clinica_id,
      results 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});