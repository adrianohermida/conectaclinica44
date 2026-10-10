import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CORRIGIR REPLY-TO DE TODOS OS SENDERS
 * CRÍTICO: Reply-To DEVE ser alias@conectaclinica.com.br
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    // 1. Buscar TODAS configs ativas
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({
      ativo: true,
      alias_recebimento: { $ne: null }
    });

    console.log('[CORRIGIR] Configs encontradas:', configs.length);

    // 2. Buscar TODOS senders no SendGrid
    const sendersRes = await fetch('https://api.sendgrid.com/v3/verified_senders', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    if (!sendersRes.ok) {
      throw new Error('Failed to fetch senders');
    }

    const sendersData = await sendersRes.json();
    const senders = sendersData.results || [];

    console.log('[CORRIGIR] Senders no SendGrid:', senders.length);

    const correcoes = [];

    // 3. Para cada config, verificar sender correspondente
    for (const config of configs) {
      if (!config.email_remetente || !config.alias_recebimento) continue;

      // Buscar sender por from_email
      const sender = senders.find(s => s.from_email === config.email_remetente);

      if (!sender) {
        console.warn(`[CORRIGIR] Sender não encontrado para: ${config.email_remetente}`);
        continue;
      }

      // Verificar se reply_to está ERRADO
      if (sender.reply_to !== config.alias_recebimento) {
        console.log(`[CORRIGIR] ❌ ${sender.from_email} → reply_to: ${sender.reply_to} (DEVERIA SER: ${config.alias_recebimento})`);

        // Atualizar sender
        const updateRes = await fetch(`https://api.sendgrid.com/v3/verified_senders/${sender.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reply_to: config.alias_recebimento
          })
        });

        if (updateRes.ok) {
          console.log(`[CORRIGIR] ✅ Corrigido: ${sender.from_email}`);
          correcoes.push({
            sender: sender.from_email,
            reply_to_antigo: sender.reply_to,
            reply_to_novo: config.alias_recebimento,
            status: 'corrigido'
          });
        } else {
          const error = await updateRes.text();
          console.error(`[CORRIGIR] ❌ Falha ao atualizar ${sender.from_email}:`, error);
          correcoes.push({
            sender: sender.from_email,
            status: 'falhou',
            erro: error
          });
        }
      } else {
        console.log(`[CORRIGIR] ✅ ${sender.from_email} → reply_to JÁ CORRETO`);
      }
    }

    return Response.json({
      total_configs: configs.length,
      total_senders: senders.length,
      correcoes_realizadas: correcoes.length,
      correcoes
    });

  } catch (error) {
    console.error('[CORRIGIR] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});