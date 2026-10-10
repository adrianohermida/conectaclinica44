import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Verificar DNS do domínio da clínica no SendGrid
 * Chamado pelo botão "Verificar DNS Agora"
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain, config_id } = await req.json();
    
    if (!domain) {
      return Response.json({ error: 'domain obrigatório' }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ error: 'SENDGRID_API_KEY não configurada' }, { status: 500 });
    }

    // Buscar domain_id via domain string
    const listRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!listRes.ok) {
      return Response.json({ error: 'Falha ao buscar domains' }, { status: 500 });
    }

    const allDomains = await listRes.json();
    const domainData = allDomains.find(d => d.domain === domain);
    
    if (!domainData) {
      return Response.json({ error: 'Domain não encontrado no SendGrid' }, { status: 404 });
    }

    const domain_id = domainData.id;

    // Chamar API de validação do SendGrid
    const validateResponse = await fetch(
      `https://api.sendgrid.com/v3/whitelabel/domains/${domain_id}/validate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!validateResponse.ok) {
      const error = await validateResponse.json();
      return Response.json({ 
        success: false, 
        error: error.errors?.[0]?.message || 'Falha ao verificar DNS' 
      }, { status: validateResponse.status });
    }

    const validation = await validateResponse.json();

    // Atualizar ConfiguracaoEmail com status
    if (config_id) {
      const updateData = {
        dkim_status: validation.validation_results?.dkim?.valid ? 'verificado' : 'pendente',
        testado_em: new Date().toISOString(),
        teste_sucesso: validation.valid
      };

      // Se verificado, pode ativar
      if (validation.valid) {
        updateData.ativo = true;
        
        // Configurar alias se ainda não tem
        const config = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ id: config_id });
        if (config[0] && !config[0].alias_recebimento) {
          const aliasRes = await base44.asServiceRole.functions.invoke('configurarAliasRecebimento', {
            config_id: config_id,
            email_institucional: config[0].email_remetente
          });
          
          if (aliasRes.data.success) {
            updateData.alias_recebimento = aliasRes.data.alias_recebimento;
            updateData.inbound_parse_configurado = aliasRes.data.redirect_criado;
          }
        }
      }

      await base44.asServiceRole.entities.ConfiguracaoEmail.update(config_id, updateData);
    }

    return Response.json({
      success: true,
      valid: validation.valid,
      dkim_valid: validation.validation_results?.dkim?.valid || false,
      spf_valid: validation.validation_results?.spf?.valid || false,
      message: validation.valid 
        ? '✅ Domínio verificado com sucesso! Email ativado.'
        : '⏳ DNS ainda não propagado. Aguarde até 48h e tente novamente.'
    });

  } catch (error) {
    console.error('[verificarDNSDominio] ERRO:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});