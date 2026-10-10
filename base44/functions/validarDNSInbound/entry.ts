import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDAR DNS PARA INBOUND EMAIL
 * CRÍTICO: Verifica MX records antes de ativar recebimento
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await req.json();

    if (!domain) {
      return Response.json({ error: 'Domain obrigatório' }, { status: 400 });
    }

    // Validar MX records usando DNS-over-HTTPS (Google)
    const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const dnsData = await dnsRes.json();

    const mxRecords = dnsData.Answer?.filter(a => a.type === 15) || [];
    const hasSendGridMX = mxRecords.some(mx => 
      mx.data?.includes('mx.sendgrid.net')
    );

    // Validar CNAME para mail.domain (Inbound Parse)
    const cnameRes = await fetch(`https://dns.google/resolve?name=mail.${domain}&type=CNAME`);
    const cnameData = await cnameRes.json();
    const hasCNAME = cnameData.Answer?.some(a => 
      a.data?.includes('sendgrid.net')
    );

    const status = {
      domain,
      mx_configurado: hasSendGridMX,
      mx_records: mxRecords.map(mx => ({
        priority: mx.data?.split(' ')[0],
        server: mx.data?.split(' ')[1]
      })),
      cname_mail_configurado: hasCNAME,
      pode_receber: hasSendGridMX,
      instrucoes: hasSendGridMX ? null : {
        tipo: 'MX',
        nome: domain,
        valor: 'mx.sendgrid.net',
        prioridade: 10,
        ttl: 3600
      }
    };

    return Response.json(status);

  } catch (error) {
    console.error('[validarDNSInbound] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});