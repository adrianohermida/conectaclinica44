import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🗑️ LIMPA CONFIGS ÓRFÃS - Remove configs que apontam domains inexistentes
 * Use após remover domains do SendGrid
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'SuperAdmin only' }, { status: 401 });
    }

    const { dry_run = true } = await req.json();

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    // 1. Buscar domains do SendGrid
    const domainsRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!domainsRes.ok) {
      throw new Error('Falha ao buscar domains');
    }
    
    const allDomains = await domainsRes.json();
    const existingDomainIds = allDomains.map(d => String(d.id));

    // 2. Buscar TODAS configs
    const allConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      provedor: 'dominio_proprio'
    });

    // 3. Identificar órfãs
    const orfas = allConfigs.filter(config => {
      if (!config.dkim_domain_id) return false;
      return !existingDomainIds.includes(String(config.dkim_domain_id));
    });

    // 4. EXECUTAR LIMPEZA
    let removidos = 0;
    const log = [];

    if (!dry_run) {
      for (const config of orfas) {
        await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config.id);
        removidos++;
        log.push(`✅ Removido: ${config.dkim_domain} (${config.clinica_id}) - domain_id ${config.dkim_domain_id} inexistente`);
      }
    } else {
      orfas.forEach(config => {
        log.push(`⚠️ SERIA removido: ${config.dkim_domain} (${config.clinica_id}) - domain_id ${config.dkim_domain_id}`);
      });
    }

    return Response.json({
      success: true,
      dry_run,
      total_configs: allConfigs.length,
      configs_orfas_detectadas: orfas.length,
      configs_removidos: removidos,
      log,
      mensagem: dry_run 
        ? `⚠️ DRY RUN - ${orfas.length} configs órfãos seriam removidos`
        : `✅ ${removidos} configs órfãos removidos`
    });
  } catch (error) {
    console.error('[limparConfigsOrfas] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});