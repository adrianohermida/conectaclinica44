import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VERIFICAR MX RECORDS - DIAGNÓSTICO BRUTAL
 * Valida se domínio aponta para SendGrid
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await req.json();
    const targetDomain = domain || 'conectaclinica.com.br';

    console.log('[MX CHECK] Domain:', targetDomain);

    // Google DNS-over-HTTPS para MX records
    const mxRes = await fetch(
      `https://dns.google/resolve?name=${targetDomain}&type=MX`
    );

    if (!mxRes.ok) {
      throw new Error('DNS lookup failed');
    }

    const mxData = await mxRes.json();
    const mxRecords = mxData.Answer?.filter(r => r.type === 15) || [];

    console.log('[MX CHECK] Records found:', mxRecords.length);

    // Validar se aponta para SendGrid
    const sendgridMX = mxRecords.some(record =>
      record.data?.includes('sendgrid.net')
    );

    // Verificar Inbound Parse no SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const inboundRes = await fetch(
      'https://api.sendgrid.com/v3/user/webhooks/parse/settings',
      { headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` } }
    );

    let inboundParse = null;
    if (inboundRes.ok) {
      const data = await inboundRes.json();
      inboundParse = data.result?.find(s =>
        s.hostname === `mail.${targetDomain}`
      );
    }

    const diagnostico = {
      domain: targetDomain,
      mx_records: mxRecords.map(r => ({
        priority: r.data?.split(' ')[0],
        server: r.data?.split(' ')[1]
      })),
      aponta_sendgrid: sendgridMX,
      inbound_parse_configurado: !!inboundParse,
      inbound_parse_hostname: inboundParse?.hostname,
      status: sendgridMX && inboundParse ? 'OK' : 'BLOQUEADO',
      problemas: []
    };

    if (!sendgridMX) {
      diagnostico.problemas.push({
        severidade: 'CRÍTICO',
        problema: `MX records de ${targetDomain} NÃO apontam para SendGrid`,
        impacto: 'Emails enviados para @conectaclinica.com.br NÃO chegam ao webhook',
        acao: `Adicionar MX record: mx.sendgrid.net (prioridade 10) no DNS de ${targetDomain}`
      });
    }

    if (!inboundParse) {
      diagnostico.problemas.push({
        severidade: 'ALTO',
        problema: `Inbound Parse NÃO configurado para mail.${targetDomain}`,
        impacto: 'SendGrid não sabe para onde encaminhar emails',
        acao: 'Configurar Inbound Parse no SendGrid'
      });
    }

    if (mxRecords.length === 0) {
      diagnostico.problemas.push({
        severidade: 'CRÍTICO',
        problema: 'Nenhum MX record encontrado',
        impacto: 'Domínio NÃO pode receber emails',
        acao: 'Configurar MX records no provedor DNS'
      });
    }

    return Response.json(diagnostico);

  } catch (error) {
    console.error('[MX CHECK] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});