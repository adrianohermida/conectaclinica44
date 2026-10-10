import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Listar clínicas com permissão de service role
 * Frontend não consegue acessar Clinica.list() diretamente por falta de permissão
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL: Verificar se é admin
    const isAdmin = user.role === 'admin' || user.email === 'contato@aetherlab.com.br';
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Buscar com service role (bypass permissões)
    let clinicas = await base44.asServiceRole.entities.Clinica.list('-created_date', 100);
    
    // CRITICAL: SDK retorna array ou objeto wrapper - normalizar
    if (!Array.isArray(clinicas)) {
      clinicas = [];
    }
    
    console.log(`✅ [listarClinicas] ${clinicas.length} clínicas retornadas para user ${user.email}`);
    
    return Response.json({ 
      success: true,
      data: clinicas,
      count: clinicas.length
    });
    
  } catch (error) {
    console.error('❌ [listarClinicas] Erro:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});