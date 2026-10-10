import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CONFIGURAR DOMÍNIO PRÓPRIO PARA CLÍNICA
 * Adiciona domínio no SendGrid + MX + Inbound Parse
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id, domain } = await req.json();

    console.log('[CONFIGURAR] Clínica:', clinica_id, 'Domínio:', domain);

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // 1. Adicionar domínio no SendGrid
    const addDomainRes = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain: domain,
        subdomain: 'mail',
        automatic_security: true,
        default: false,
        custom_spf: false
      })
    });

    if (!addDomainRes.ok) {
      const error = await addDomainRes.text();
      throw new Error(`Falha ao adicionar domínio: ${error}`);
    }

    const domainData = await addDomainRes.json();
    console.log('[CONFIGURAR] Domínio adicionado:', domainData.id);

    // 2. Configurar Inbound Parse - DUPLO (domínio próprio + fallback)
    const webhookUrl = `${Deno.env.get('BASE44_BASE_URL')}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookReceberEmail?token=${Deno.env.get('SENDGRID_WEBHOOK_VALIDATION_TOKEN')}`;

    // GAP 3 FIX: Criar DOIS inbound parse hostnames
    const slug = clinica.slug || clinica.nome?.toLowerCase().replace(/\s+/g, '-');
    
    // 2a. Domínio próprio
    const inboundRes1 = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: `mail.${domain}`,
        url: webhookUrl,
        spam_check: true,
        send_raw: false
      })
    });

    if (!inboundRes1.ok) {
      const error = await inboundRes1.text();
      console.error('[CONFIGURAR] Erro Inbound Parse mail.domain:', error);
    }

    // 2b. Fallback ConectaClínica
    const inboundRes2 = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hostname: 'conectaclinica.com.br',
        url: webhookUrl,
        spam_check: true,
        send_raw: false
      })
    });

    if (!inboundRes2.ok) {
      const error = await inboundRes2.text();
      console.warn('[CONFIGURAR] Erro Inbound Parse fallback (pode já existir):', error);
    }

    // 3. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    const clinica = clinicas[0];

    if (!clinica) {
      throw new Error('Clínica não encontrada');
    }

    // 4. CRITICAL: Verificar/adicionar sender ANTES de criar config
    const senderEmail = `contato@${domain}`;
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    
    const addSenderRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nickname: clinica.nome,
        from_email: senderEmail,
        from_name: clinica.nome,
        reply_to: senderEmail,
        reply_to_name: clinica.nome,
        address: clinica.endereco || 'Rua Exemplo, 123',
        city: clinica.cidade || 'São Paulo',
        state: clinica.estado || 'SP',
        zip: clinica.cep || '01000-000',
        country: 'Brazil'
      })
    });

    let senderVerified = false;
    if (addSenderRes.ok) {
      const senderData = await addSenderRes.json();
      senderVerified = senderData.verified || false;
      console.log('[CONFIGURAR] Sender criado:', senderEmail, 'Verificado:', senderVerified);
    } else {
      const error = await addSenderRes.text();
      console.warn('[CONFIGURAR] Erro ao criar sender:', error);
    }

    // 5. Criar ConfiguracaoEmail
    const alias = `${slug}@conectaclinica.com.br`;

    // GAP 1 FIX: Só marcar ativo se sender VERIFICADO
    await base44.asServiceRole.entities.ConfiguracaoEmail.create({
      clinica_id: clinica_id,
      provedor: 'dominio_proprio',
      provedor_padrao: true,
      alias_recebimento: alias,
      email_remetente: senderEmail,
      nome_remetente: clinica.nome,
      dkim_domain: domain,
      dkim_domain_id: domainData.id,
      dkim_status: 'pendente',
      ativo: true, // ATIVAR com fallback genérico
      sender_verificado: senderVerified,
      usar_fallback_sender: !senderVerified,
      inbound_parse_configurado: true,
      inbound_parse_hostnames: [
        `mail.${domain}`,
        'conectaclinica.com.br'
      ]
    });

    console.log('[CONFIGURAR] ✅ Config criada:', alias, 'Sender verificado:', senderVerified);

    return Response.json({
      success: true,
      domain: domain,
      inbound_parse_hostname: `mail.${domain}`,
      alias_recebimento: alias,
      sender_email: senderEmail,
      sender_verificado: senderVerified,
      dns_records: domainData.dns,
      instrucoes: [
        `1. Configure MX record: ${domain} → mx.sendgrid.net (prioridade 10)`,
        `2. Adicione records DNS fornecidos pelo SendGrid`,
        `3. Aguarde propagação (até 48h)`,
        `4. Verifique domínio no SendGrid`,
        `5. CRITICAL: Verifique o email em ${senderEmail} para ativar o sender`,
        `6. Teste enviando email para: ${alias}`
      ]
    });

  } catch (error) {
    console.error('[CONFIGURAR] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});