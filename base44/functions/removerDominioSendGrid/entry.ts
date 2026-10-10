import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Remove domínio do SendGrid e config local
 */
Deno.serve(async (req) => {
  console.log('[removerDominioSendGrid] 🚀 INICIANDO');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domain_id, clinica_id } = body;
    
    console.log('[removerDominioSendGrid] Domain ID:', domain_id, 'Clínica:', clinica_id);
    
    if (!domain_id || !clinica_id) {
      return Response.json({ success: false, error: 'domain_id e clinica_id obrigatórios' }, { status: 400 });
    }

    // Validate permission
    if (user.role !== 'admin' && user.clinica_id !== clinica_id) {
      return Response.json({ success: false, error: 'Sem permissão para esta clínica' }, { status: 403 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ success: false, error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    // Deletar no SendGrid
    const deleteRes = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${domain_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      }
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const error = await deleteRes.text();
      console.error('[removerDominioSendGrid] Erro SendGrid:', error);
      return Response.json({ success: false, error: `SendGrid: ${error}` }, { status: 500 });
    }

    console.log('[removerDominioSendGrid] ✅ Removido do SendGrid');

    // 🧹 CRÍTICO: Limpar TODAS configs órfãs deste domain (não só desta clínica)
    const configsOrfas = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      dkim_domain_id: String(domain_id)
    });

    let cleanupCount = 0;
    for (const config of configsOrfas) {
      await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config.id);
      cleanupCount++;
      console.log('[removerDominioSendGrid] 🧹 Config órfã limpa:', config.id, 'clinica:', config.clinica_id);
    }

    console.log('[removerDominioSendGrid] ✅ Cleanup completo:', cleanupCount, 'configs removidas');

    return Response.json({ 
      success: true,
      configs_removidas: cleanupCount
    });
  } catch (error) {
    console.error('[removerDominioSendGrid] ❌ ERRO:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});