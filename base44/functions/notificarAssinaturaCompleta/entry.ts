import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NOTIFICAR ASSINATURA COMPLETA
 * Envia email para clínica quando documento for assinado por todos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { log_id } = await req.json();

    if (!log_id) {
      return Response.json({ error: 'log_id obrigatório' }, { status: 400 });
    }

    // Buscar log
    const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({ id: log_id });
    if (logs.length === 0) {
      return Response.json({ error: 'Log não encontrado' }, { status: 404 });
    }

    const log = logs[0];

    // Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: log.clinica_id });
    const clinica = clinicas[0];

    // Montar lista de signatários
    const listaSignatarios = log.signatarios
      .map(sig => `• ${sig.nome} (${sig.email}) - ${sig.status}`)
      .join('<br>');

    // Enviar email usando wrapper
    const resultado = await base44.asServiceRole.functions.invoke('sendgrid/send', {
      clinica_id: log.clinica_id,
      to: log.created_by || clinica.email,
      subject: `✅ Assinatura Digital Completa - ${log.documento_nome}`,
      html: `
        <h2>🎉 Documento Assinado com Sucesso</h2>
        <p>O documento <strong>${log.documento_nome}</strong> foi assinado por todos os signatários.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Documento:</strong> ${log.documento_nome}<br>
          <strong>Tipo:</strong> ${log.documento_tipo}<br>
          <strong>Data conclusão:</strong> ${new Date(log.data_conclusao).toLocaleString('pt-BR')}<br>
          <strong>Provider:</strong> Authentique (ICP-Brasil)
        </div>

        <h3>Signatários:</h3>
        <p style="font-size: 14px;">${listaSignatarios}</p>

        ${log.arquivo_assinado_url ? `
          <div style="margin: 30px 0;">
            <a href="${log.arquivo_assinado_url}" 
               style="background: #7E57FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              📥 Baixar Documento Assinado
            </a>
          </div>
        ` : ''}

        <hr>
        <p style="color: #666; font-size: 12px;">
          Este documento possui validade jurídica (ICP-Brasil) e pode ser usado como prova em processos legais.<br>
          ${clinica?.nome || 'ConectaClínica'}
        </p>
      `,
      tipo_email: 'notificacao'
    });

    console.log('[NotificarAssinatura] ✅ Email enviado:', {
      log_id,
      destinatario: log.created_by || clinica.email,
      message_id: resultado.data.message_id
    });

    return Response.json({ 
      success: true,
      email_enviado: true,
      message_id: resultado.data.message_id
    });

  } catch (error) {
    console.error('[NotificarAssinatura] ❌ Erro:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});