import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRITICAL P0: Cria AssinaturaClinica com WILDCARD (*) para acesso total
 * Usado para beta testers e validação de auditoria
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.clinica_id) {
      return Response.json({ error: 'Usuário sem clinica_id' }, { status: 400 });
    }

    // Verificar se já existe
    const existing = await base44.asServiceRole.entities.AssinaturaClinica.filter({
      clinica_id: user.clinica_id
    });

    if (existing.length > 0) {
      // Atualizar com wildcard
      await base44.asServiceRole.entities.AssinaturaClinica.update(existing[0].id, {
        modulos_inclusos: ['*'],
        status: 'ativa',
        plano_slug: 'enterprise'
      });

      return Response.json({
        success: true,
        action: 'updated',
        assinatura: existing[0]
      });
    }

    // Criar nova
    const assinatura = await base44.asServiceRole.entities.AssinaturaClinica.create({
      clinica_id: user.clinica_id,
      clinica_nome: user.clinica_nome || 'Beta Clinic',
      clinica_email: user.email,
      plano_slug: 'enterprise',
      modulos_inclusos: ['*'],
      status: 'ativa',
      data_inicio: new Date().toISOString().split('T')[0],
      limites: {
        max_usuarios: 999,
        max_pacientes: 999999,
        max_agendamentos_mes: 999999,
        creditos_ia_mes: 999999,
        creditos_consulta_mes: 999999,
        storage_gb: 999
      }
    });

    return Response.json({
      success: true,
      action: 'created',
      assinatura
    });

  } catch (error) {
    console.error('[criarAssinaturaBeta] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});