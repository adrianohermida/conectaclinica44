import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FUNÇÃO DE EMERGÊNCIA - Auto-concessão de permissões admin
 * Use APENAS uma vez e DELETE depois
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Pegar usuário autenticado
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Atualizar permissões do próprio usuário
    await base44.auth.updateMe({
      perfil: 'admin',
      permissoes: {
        modulos: ['*'],
        acoes: { '*': ['*'] }
      },
      modulos_visitados: user.modulos_visitados || [],
      preferencias: user.preferencias || {}
    });

    return Response.json({ 
      success: true, 
      message: `✅ Você agora tem permissões admin completas`,
      user: {
        email: user.email,
        perfil: 'admin',
        permissoes: { modulos: ['*'], acoes: { '*': ['*'] } }
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});