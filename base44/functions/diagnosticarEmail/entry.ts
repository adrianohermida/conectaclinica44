import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO COMPLETO: Email → Inbound Parse → Tickets
 * Verifica toda a cadeia de recebimento de emails
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id } = await req.json();
    const targetClinicaId = clinica_id || user.clinica_id;

    if (!targetClinicaId) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    console.log('[diagnosticarEmail] Iniciando para clinica_id:', targetClinicaId);

    const diagnostico = {
      clinica_id: targetClinicaId,
      timestamp: new Date().toISOString(),
      status: 'ok',
      problemas: [],
      warnings: [],
      config: {},
      sendgrid: {},
      recomendacoes: []
    };

    // 1. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.list();
    const clinica = clinicas.find(c => c.id === targetClinicaId);
    
    if (!clinica) {
      diagnostico.status = 'erro';
      diagnostico.problemas.push('❌ Clínica não encontrada');
      console.error('[diagnosticarEmail] Clínica não encontrada:', targetClinicaId);
      return Response.json(diagnostico);
    }

    console.log('[diagnosticarEmail] Clínica:', clinica.nome, '| Slug:', clinica.slug);

    diagnostico.config.clinica_nome = clinica.nome;
    diagnostico.config.clinica_slug = clinica.slug;

    // 2. Buscar configurações de email
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ 
      clinica_id: targetClinicaId 
    });

    if (configs.length === 0) {
      diagnostico.status = 'erro';
      diagnostico.problemas.push('❌ CRÍTICO: Nenhuma ConfiguracaoEmail criada');
      diagnostico.recomendacoes.push('Vá em Administração → Email e configure');
      console.error('[diagnosticarEmail] Nenhuma config encontrada para clinica_id:', targetClinicaId);
      return Response.json(diagnostico);
    }

    const config = configs[0];
    console.log('[diagnosticarEmail] Config encontrada:', config.id, '| Alias:', config.alias_recebimento);
    diagnostico.config = {
      id: config.id,
      provedor: config.provedor,
      email_remetente: config.email_remetente,
      nome_remetente: config.nome_remetente,
      alias_recebimento: config.alias_recebimento,
      ativo: config.ativo,
      inbound_parse_configurado: config.inbound_parse_configurado,
      enviar_confirmacao_automatica: config.enviar_confirmacao_automatica
    };

    // 3. Validar alias
    if (!config.alias_recebimento) {
      diagnostico.status = 'erro';
      diagnostico.problemas.push('❌ CRÍTICO: alias_recebimento não gerado');
      diagnostico.recomendacoes.push('Desative e ative novamente o recebimento de emails');
    } else {
      const aliasEsperado = `${clinica.slug}@conectaclinica.com.br`;
      if (config.alias_recebimento !== aliasEsperado) {
        diagnostico.warnings.push(`⚠️ Alias atual: ${config.alias_recebimento} | Esperado: ${aliasEsperado}`);
      }
    }

    // 4. Validar ativo
    if (!config.ativo) {
      diagnostico.status = 'warning';
      diagnostico.warnings.push('⚠️ Recebimento de emails DESATIVADO');
      diagnostico.recomendacoes.push('Ative o toggle "Receber tickets por email"');
    }

    // 5. Verificar SendGrid Inbound Parse
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      diagnostico.status = 'erro';
      diagnostico.problemas.push('❌ SENDGRID_API_KEY não configurada no ambiente');
      return Response.json(diagnostico);
    }

    try {
      const parseRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (parseRes.ok) {
        const parseData = await parseRes.json();
        const parseSettings = parseData.result || [];
        
        diagnostico.sendgrid.inbound_parse_count = parseSettings.length;
        diagnostico.sendgrid.inbound_parse_settings = parseSettings;

        const conectaClinicaParse = parseSettings.find(s => s.hostname === 'conectaclinica.com.br');
        
        if (!conectaClinicaParse) {
          diagnostico.status = 'erro';
          diagnostico.problemas.push('❌ CRÍTICO: SendGrid Inbound Parse NÃO configurado para conectaclinica.com.br');
          diagnostico.recomendacoes.push('Clique em "Configurar agora" no painel amarelo');
        } else {
          diagnostico.sendgrid.webhook_url = conectaClinicaParse.url;
          diagnostico.sendgrid.spam_check = conectaClinicaParse.spam_check;
          
          const BASE44_BASE_URL = Deno.env.get('BASE44_BASE_URL');
          const webhookEsperado = `${BASE44_BASE_URL}/api/webhookReceberEmail`;
          
          // Normalizar URLs (remover protocolo) para comparação
          const urlAtualNorm = (conectaClinicaParse.url || '').replace(/^https?:\/\//, '');
          const urlEsperadaNorm = webhookEsperado.replace(/^https?:\/\//, '');
          
          if (urlAtualNorm !== urlEsperadaNorm) {
            diagnostico.warnings.push(`⚠️ Webhook URL diferente\nAtual: ${conectaClinicaParse.url}\nEsperado: ${webhookEsperado}`);
          }
        }
      } else {
        diagnostico.warnings.push('⚠️ Não foi possível verificar Inbound Parse no SendGrid');
      }
    } catch (sgError) {
      diagnostico.warnings.push(`⚠️ Erro ao consultar SendGrid: ${sgError.message}`);
    }

    // 6. Verificar se inbound_parse_configurado está correto
    if (config.inbound_parse_configurado && !diagnostico.sendgrid.webhook_url) {
      diagnostico.problemas.push('❌ INCONSISTÊNCIA: DB diz que Inbound Parse está configurado, mas SendGrid API não mostra');
      diagnostico.recomendacoes.push('Desative e reative o recebimento para forçar reconfiguração');
    }

    // 7. Testar envio (se tiver email_remetente)
    if (config.email_remetente) {
      try {
        const testeRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: user.email }],
              subject: `[DIAGNÓSTICO] Teste ${clinica.nome}`
            }],
            from: {
              email: config.email_remetente,
              name: config.nome_remetente
            },
            content: [{
              type: 'text/plain',
              value: `Teste de envio para ${clinica.nome}. Se recebeu, envio está OK.`
            }]
          })
        });

        if (testeRes.ok) {
          diagnostico.sendgrid.envio_teste = 'OK';
        } else {
          const erro = await testeRes.text();
          diagnostico.sendgrid.envio_teste = `FALHOU: ${erro}`;
          diagnostico.problemas.push(`❌ Envio falhou: ${erro}`);
        }
      } catch (sendError) {
        diagnostico.sendgrid.envio_teste = `ERRO: ${sendError.message}`;
      }
    }

    // 8. Verificar tickets recentes via email
    const tickets = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id: targetClinicaId,
      canal: 'email'
    });
    
    diagnostico.tickets_email_count = tickets.length;
    diagnostico.ultimo_ticket_email = tickets.length > 0 ? {
      numero: tickets[0].numero_ticket,
      data: tickets[0].created_date,
      assunto: tickets[0].assunto
    } : null;

    // 9. Verificar EmailRecebido
    const emailsRecebidos = await base44.asServiceRole.entities.EmailRecebido.filter({
      clinica_id: targetClinicaId
    });
    
    diagnostico.emails_recebidos_count = emailsRecebidos.length;
    diagnostico.ultimo_email_recebido = emailsRecebidos.length > 0 ? {
      from: emailsRecebidos[0].from_email,
      to: emailsRecebidos[0].to_email,
      data: emailsRecebidos[0].created_date,
      processed: emailsRecebidos[0].processed
    } : null;

    // 10. Resumo e conclusão
    if (diagnostico.problemas.length === 0 && diagnostico.warnings.length === 0) {
      diagnostico.status = 'ok';
      diagnostico.mensagem = '✅ Email configurado corretamente. Envie teste para verificar.';
    } else if (diagnostico.problemas.length > 0) {
      diagnostico.status = 'erro';
      diagnostico.mensagem = `❌ ${diagnostico.problemas.length} problema(s) crítico(s) encontrado(s)`;
    } else {
      diagnostico.status = 'warning';
      diagnostico.mensagem = `⚠️ ${diagnostico.warnings.length} aviso(s)`;
    }

    console.log('[diagnosticarEmail] ✅ Completo:', diagnostico.status, '| Problemas:', diagnostico.problemas.length, '| Warnings:', diagnostico.warnings.length);

    return Response.json(diagnostico);

  } catch (error) {
    console.error('[diagnosticarEmail] Erro:', error);
    return Response.json({ 
      status: 'erro',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});