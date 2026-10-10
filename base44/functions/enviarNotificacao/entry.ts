import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * ENVIAR NOTIFICAÇÃO UNIVERSAL
 * - Suporta email, push, WhatsApp
 * - Valida multi-tenant
 * - Registra audit log
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { 
      clinica_id, 
      destinatario_id, 
      tipo, 
      assunto, 
      corpo, 
      categoria,
      metadata 
    } = await req.json();

    if (!clinica_id || !destinatario_id || !corpo) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: clinica_id, destinatario_id, corpo' 
      }, { status: 400 });
    }

    // VALIDAÇÃO MULTI-TENANT
    if (user.role !== 'admin' && clinica_id !== user.clinica_id) {
      return Response.json({ 
        error: 'Acesso negado - operação em clínica diferente' 
      }, { status: 403 });
    }

    // Buscar config de notificações
    const configs = await base44.asServiceRole.entities.ConfiguracaoNotificacao.filter({ clinica_id });
    const config = configs[0] || { notificacao_push: true };

    // Buscar destinatário
    const allUsers = await base44.asServiceRole.entities.User.list();
    const destinatario = allUsers.find(u => u.id === destinatario_id);

    if (!destinatario) {
      return Response.json({ error: 'Destinatário não encontrado' }, { status: 404 });
    }

    // CRIAR NOTIFICAÇÃO INTERNA (sempre)
    const notificacao = await base44.asServiceRole.entities.MensagemInterna.create({
      clinica_id,
      destinatario_id,
      destinatario_nome: destinatario.full_name || destinatario.email,
      remetente_id: user.id,
      remetente_nome: user.full_name || 'Sistema',
      tipo_conversa: 'notificacao_sistema',
      assunto: assunto || 'Notificação',
      corpo: corpo,
      conteudo: corpo,
      categoria: categoria || 'sistema',
      lida: false,
      metadata
    });

    const canais = [];

    // EMAIL (se configurado)
    if (config.email_tickets && tipo === 'email') {
      try {
        // Verificar se usa Base44 built-in ou SMTP customizado
        const configsEmail = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ clinica_id });
        const configEmail = configsEmail[0] || { usar_email_builtin: true };

        if (configEmail.usar_email_builtin !== false) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "ConectaClínica",
            to: destinatario.email,
            subject: assunto || 'Notificação',
            body: corpo
          });
          canais.push('email_builtin');
        } else if (configEmail.ativo) {
          // TODO: SMTP customizado (SendGrid/Mailgun)
          canais.push('email_smtp_pendente');
        }
      } catch (emailError) {
        console.warn('⚠️ Email falhou:', emailError);
      }
    }

    // WHATSAPP (se configurado)
    if (config.whatsapp_lembretes && tipo === 'whatsapp' && destinatario.whatsapp) {
      try {
        await base44.asServiceRole.functions.invoke('enviarNotificacaoWhatsApp', {
          clinica_id,
          numero: destinatario.whatsapp,
          mensagem: corpo
        });
        canais.push('whatsapp');
      } catch (whatsappError) {
        console.warn('⚠️ WhatsApp falhou:', whatsappError);
      }
    }

    // AUDIT LOG
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      tipo_operacao: 'enviar_notificacao',
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        destinatario_id,
        categoria,
        canais,
        timestamp: new Date().toISOString()
      }
    });

    return Response.json({ 
      success: true,
      notificacao_id: notificacao.id,
      canais_enviados: canais
    });

  } catch (error) {
    console.error('❌ Erro enviar notificação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});