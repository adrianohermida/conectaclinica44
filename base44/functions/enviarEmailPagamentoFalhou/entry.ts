import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * CRÍTICO: Email urgente quando pagamento Stripe falha
 * Input: { clinica_id, invoice_id, valor, metodo_falhou }
 * Chamado por: stripeWebhook (invoice.payment_failed)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clinica_id, invoice_id, valor, metodo_falhou, tentativa } = await req.json();

    if (!clinica_id || !invoice_id) {
      return Response.json({ error: 'clinica_id e invoice_id obrigatórios' }, { status: 400 });
    }

    // 1. Buscar clínica
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
    if (clinicas.length === 0) {
      return Response.json({ error: 'Clínica não encontrada' }, { status: 404 });
    }

    const clinica = clinicas[0];

    // 2. Buscar admin da clínica
    const admins = await base44.asServiceRole.entities.User.filter({ 
      clinica_id,
      role: 'admin'
    });

    if (admins.length === 0) {
      console.warn(`[PagamentoFalhou] Nenhum admin encontrado para clinica ${clinica_id}`);
      return Response.json({ error: 'Admin não encontrado' }, { status: 404 });
    }

    const admin = admins[0];

    // 3. Gerar link atualizar pagamento
    const linkAtualizar = `https://app.conectaclinica.com.br/GerenciarAssinatura?action=update_payment`;

    // 4. Enviar email URGENTE
    await enviarEmailSendGrid({
      base44,
      clinica_id,
      template_tipo: 'pagamento_falhou',
      destinatario: admin.email,
      vars: {
        nome_admin: admin.full_name || admin.email,
        clinica_nome: clinica.nome,
        valor: `R$ ${(valor / 100).toFixed(2)}`,
        metodo_falhou: metodo_falhou || 'Cartão de crédito',
        link_atualizar: linkAtualizar,
        tentativa: tentativa || 1,
        data_falha: new Date().toLocaleDateString('pt-BR')
      }
    });

    // 5. Registrar auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      user_id: admin.id,
      acao: 'email_pagamento_falhou_enviado',
      detalhes: `Invoice: ${invoice_id}, Valor: R$${(valor / 100).toFixed(2)}`,
      categoria: 'billing_critical'
    });

    console.log(`[PagamentoFalhou] Email URGENTE enviado para ${admin.email}`);

    return Response.json({ success: true, destinatario: admin.email });

  } catch (error) {
    console.error('[PagamentoFalhou] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});