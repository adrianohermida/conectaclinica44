import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VALIDAR SENDER GENÉRICO: Verifica se noreply@conectaclinica.com.br existe no SendGrid
 * EXECUTAR: 1x ao inicializar app nova clínica (gate de envio de emails)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    
    // Listar senders verificados
    const res = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!res.ok) {
      return Response.json({ 
        error: 'Falha ao consultar SendGrid',
        status: res.status
      }, { status: 500 });
    }

    const { results } = await res.json();
    
    const senderGenerico = results?.find(s => 
      s.from_email === 'noreply@conectaclinica.com.br'
    );

    // AUDIT: Salvar resultado
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: null,
      tipo_operacao: 'validar_sender_generico',
      usuario_id: user.id,
      usuario_email: user.email,
      entidade_afetada: 'ConfiguracaoEmail',
      detalhes: {
        sender_exists: !!senderGenerico,
        verified: senderGenerico?.verified || false,
        locked: senderGenerico?.locked || false,
        id: senderGenerico?.id || null
      },
      sucesso: !!senderGenerico
    });

    return Response.json({
      exists: !!senderGenerico,
      verified: senderGenerico?.verified || false,
      sender: senderGenerico || null,
      action: senderGenerico?.verified 
        ? '✅ Sender genérico OK - auto-bootstrap habilitado'
        : '⚠️ Sender genérico não verificado - crie em SendGrid → Sender Authentication'
    });
  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});