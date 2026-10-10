import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * WEBHOOK AUTHENTIQUE - Notificações de assinatura
 * 
 * Eventos suportados:
 * - document.signed: Documento assinado por todos
 * - document.rejected: Documento rejeitado
 * - signature.signed: Assinatura individual concluída
 * 
 * CRITICAL: Configurar URL no Authentique Dashboard:
 * https://[seu-app].base44.app/api/functions/authentique/webhook
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // VALIDAÇÃO: Authentique não suporta HMAC signature, apenas validar se payload é válido
    const payload = await req.json();
    const { event, document } = payload;

    console.log('[Authentique] 🔔 Webhook recebido:', { event, document_id: document?.id });

    if (!event || !document) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Processar evento
    switch (event) {
      case 'document.signed': {
        // Buscar log de assinatura
        const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({
          authentique_document_id: document.id
        });

        if (logs.length === 0) {
          console.warn('[Authentique] ⚠️ Documento não encontrado:', document.id);
          return Response.json({ 
            warning: 'Documento não encontrado no sistema',
            document_id: document.id 
          });
        }

        const log = logs[0];

        // Atualizar status como assinado
        await base44.asServiceRole.entities.AssinaturaDigitalLog.update(log.id, {
          status: 'assinado',
          arquivo_assinado_url: document.signed_file_url || document.file?.signed,
          data_conclusao: new Date().toISOString(),
          signatarios: log.signatarios.map(sig => ({
            ...sig,
            status: 'assinado',
            data_assinatura: new Date().toISOString()
          }))
        });

        console.log('[Authentique] ✅ Documento assinado:', { log_id: log.id, document_id: document.id });

        // Notificar clínica via email
        try {
          await base44.asServiceRole.functions.invoke('notificarAssinaturaCompleta', {
            log_id: log.id
          });
        } catch (notifError) {
          console.warn('[Authentique] ⚠️ Falha ao notificar:', notifError.message);
        }

        // Se for termo legal, atualizar aceite
        if (log.aceite_termo_id) {
          try {
            const aceites = await base44.asServiceRole.entities.AceiteTermoLegal.filter({
              id: log.aceite_termo_id
            });

            if (aceites.length > 0) {
              await base44.asServiceRole.entities.AceiteTermoLegal.update(aceites[0].id, {
                timestamp_icp_brasil: {
                  provider: 'Authentique',
                  document_id: document.id,
                  signed_at: new Date().toISOString(),
                  signed_file_url: document.signed_file_url
                }
              });
            }
          } catch (termoError) {
            console.warn('[Authentique] ⚠️ Erro ao atualizar termo:', termoError.message);
          }
        }

        break;
      }

      case 'document.rejected': {
        const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({
          authentique_document_id: document.id
        });

        if (logs.length > 0) {
          await base44.asServiceRole.entities.AssinaturaDigitalLog.update(logs[0].id, {
            status: 'rejeitado',
            data_conclusao: new Date().toISOString(),
            observacoes: 'Documento rejeitado por signatário'
          });

          console.log('[Authentique] ❌ Documento rejeitado:', { log_id: logs[0].id });

          // Notificar clínica sobre rejeição
          try {
            await base44.asServiceRole.functions.invoke('sendgrid/send', {
              clinica_id: logs[0].clinica_id,
              to: logs[0].created_by, // Email de quem enviou
              subject: `⚠️ Assinatura Digital Rejeitada - ${logs[0].documento_nome}`,
              html: `
                <h2>Assinatura Rejeitada</h2>
                <p>O documento <strong>${logs[0].documento_nome}</strong> foi rejeitado por um dos signatários.</p>
                <p>Verifique os detalhes no painel de assinaturas digitais.</p>
              `,
              tipo_email: 'notificacao'
            });
          } catch (emailError) {
            console.warn('[Authentique] ⚠️ Falha ao enviar email rejeição:', emailError.message);
          }
        }

        break;
      }

      case 'signature.signed': {
        // Assinatura individual (não necessariamente completa)
        const logs = await base44.asServiceRole.entities.AssinaturaDigitalLog.filter({
          authentique_document_id: document.id
        });

        if (logs.length > 0) {
          const log = logs[0];
          const signature = payload.signature; // Dados da assinatura individual

          // Atualizar signatário específico
          const signatariosAtualizados = log.signatarios.map(sig => {
            if (sig.email === signature?.email) {
              return {
                ...sig,
                status: 'assinado',
                data_assinatura: new Date().toISOString()
              };
            }
            return sig;
          });

          await base44.asServiceRole.entities.AssinaturaDigitalLog.update(log.id, {
            signatarios: signatariosAtualizados
          });

          console.log('[Authentique] ✍️ Assinatura parcial:', { 
            log_id: log.id, 
            signatario: signature?.email 
          });
        }

        break;
      }

      default:
        console.log('[Authentique] ℹ️ Evento não tratado:', event);
    }

    return Response.json({ received: true, event });

  } catch (error) {
    console.error('[Authentique] ❌ Erro webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});