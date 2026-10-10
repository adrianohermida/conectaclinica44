import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Vincula domínio órfão do SendGrid a uma clínica específica
 * Use: Quando domínio foi criado manualmente no SendGrid e precisa ser "claimed"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { domain_id, clinica_id } = await req.json();
    
    if (!domain_id || !clinica_id) {
      return Response.json({ success: false, error: 'domain_id e clinica_id obrigatórios' }, { status: 400 });
    }

    // Validar permissão
    if (user.role !== 'admin' && user.clinica_id !== clinica_id) {
      return Response.json({ success: false, error: 'Sem permissão' }, { status: 403 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ success: false, error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    // 1. Buscar domain no SendGrid
    const domainsRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });
    
    if (!domainsRes.ok) {
      throw new Error('Falha ao buscar domains');
    }
    
    const allDomains = await domainsRes.json();
    const domain = allDomains.find(d => String(d.id) === String(domain_id));
    
    if (!domain) {
      return Response.json({ success: false, error: 'Domain não encontrado no SendGrid' }, { status: 404 });
    }

    // 2. Verificar se JÁ vinculado a OUTRA clínica
    const existingConfigs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      dkim_domain_id: String(domain_id),
      provedor: 'dominio_proprio'
    });

    if (existingConfigs.length > 0 && existingConfigs[0].clinica_id !== clinica_id) {
      return Response.json({ 
        success: false, 
        error: `Domain já vinculado à clínica ${existingConfigs[0].clinica_id}`,
        clinica_atual: existingConfigs[0].clinica_id
      }, { status: 409 });
    }

    // 3. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];
    
    if (!clinica) {
      return Response.json({ success: false, error: 'Clínica não encontrada' }, { status: 404 });
    }

    // 4. Criar/atualizar config
    const configData = {
      clinica_id,
      provedor: 'dominio_proprio',
      dkim_domain: domain.domain,
      dkim_domain_id: String(domain.id),
      dkim_status: domain.valid ? 'verificado' : 'pendente',
      email_remetente: `contato@${domain.domain}`,
      nome_remetente: clinica.nome || 'Clínica',
      ativo: domain.valid
    };

    let config;
    if (existingConfigs.length > 0) {
      config = await base44.asServiceRole.entities.ConfiguracaoEmail.update(existingConfigs[0].id, configData);
    } else {
      config = await base44.asServiceRole.entities.ConfiguracaoEmail.create(configData);
    }

    return Response.json({
      success: true,
      config_id: config.id,
      domain: domain.domain,
      verified: domain.valid,
      mensagem: `Domain ${domain.domain} vinculado com sucesso`
    });
  } catch (error) {
    console.error('[vincularDominioOrfao] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});