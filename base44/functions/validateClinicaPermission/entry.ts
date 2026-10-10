import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDAÇÃO DE PERMISSÃO POR MÓDULO
 * Toda função backend crítica deve chamar isso
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        permitido: false, 
        motivo: 'not_authenticated' 
      }, { status: 401 });
    }

    const { modulo, clinica_id } = await req.json();
    const targetClinicaId = clinica_id || user.clinica_id;

    // SuperAdmin = sempre permitido
    if (user.role === 'admin') {
      return Response.json({ permitido: true, motivo: 'superadmin' });
    }

    if (!targetClinicaId) {
      return Response.json({ 
        permitido: false, 
        motivo: 'no_clinic' 
      }, { status: 403 });
    }

    // Buscar plano via fonte única
    const { data: plano } = await base44.asServiceRole.functions.invoke('getClinicaPlanoPorId', {
      clinica_id: targetClinicaId
    });

    // Wildcard = acesso total
    if (plano.modulos_inclusos?.includes('*')) {
      return Response.json({ permitido: true, motivo: 'plano_completo' });
    }

    // Validar módulo específico
    const permitido = plano.modulos_inclusos?.includes(modulo);

    console.log('[ValidatePermission]', { 
      clinica_id: targetClinicaId, 
      modulo, 
      plano_slug: plano.plano_slug,
      modulos_inclusos: plano.modulos_inclusos,
      permitido 
    });

    return Response.json({
      permitido,
      motivo: permitido ? 'modulo_ativo' : 'modulo_nao_disponivel',
      plano_slug: plano.plano_slug,
      modulos_inclusos: plano.modulos_inclusos
    }, { status: permitido ? 200 : 403 });
  } catch (error) {
    console.error('[Validate Permission Error]', error);
    return Response.json({ 
      permitido: false, 
      motivo: 'error',
      error: error.message 
    }, { status: 500 });
  }
});