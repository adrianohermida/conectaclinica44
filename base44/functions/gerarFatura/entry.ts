import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GERAR FATURA - Discriminada Serviços Médicos
 * 
 * Cria fatura vinculada à venda
 * Número sequencial: FAT-2025-0001
 * Permite PIX: QR Code + comprovante
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      venda_id, 
      paciente_id, 
      forma_pagamento,
      pix_qrcode_url,
      comprovante_url
    } = await req.json();

    // Buscar venda
    const vendas = await base44.asServiceRole.entities.Venda.filter({ id: venda_id });
    if (vendas.length === 0) {
      return Response.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const venda = vendas[0];

    // Gerar número sequencial
    const faturas = await base44.asServiceRole.entities.Fatura.filter({ 
      clinica_id: user.clinica_id 
    });
    const numeroSequencial = faturas.length + 1;
    const numeroFatura = `FAT-${new Date().getFullYear()}-${String(numeroSequencial).padStart(4, '0')}`;

    // Criar fatura
    const fatura = await base44.asServiceRole.entities.Fatura.create({
      clinica_id: user.clinica_id,
      paciente_id,
      paciente_nome: venda.paciente_nome,
      numero_fatura: numeroFatura,
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itens: venda.itens,
      subtotal: venda.valor_total,
      desconto: venda.desconto || 0,
      valor_total: venda.valor_final,
      status: comprovante_url ? 'pago' : 'pendente',
      forma_pagamento,
      pix_qrcode_url,
      comprovante_url,
      venda_id
    });

    // Gerar PDF fatura
    const pdfResponse = await base44.functions.invoke('gerarFaturaPDF', {
      fatura_id: fatura.id
    });

    // Atualizar fatura com URL do recibo
    await base44.asServiceRole.entities.Fatura.update(fatura.id, {
      recibo_url: pdfResponse.data.pdf_url
    });

    // Enviar email paciente
    const pacientes = await base44.asServiceRole.entities.Paciente.filter({ id: paciente_id });
    if (pacientes.length > 0 && pacientes[0].email) {
      await base44.integrations.Core.SendEmail({
        to: pacientes[0].email,
        subject: `Fatura ${numeroFatura} - ConectaClínica`,
        body: `
          <h2>Fatura Emitida</h2>
          <p>Olá ${venda.paciente_nome},</p>
          <p>Sua fatura foi gerada com sucesso!</p>
          <p><strong>Número:</strong> ${numeroFatura}</p>
          <p><strong>Valor:</strong> R$ ${venda.valor_final.toFixed(2)}</p>
          <p><strong>Vencimento:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</p>
          <p>Acesse o portal do paciente para visualizar e baixar sua fatura.</p>
        `
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      fatura_id: fatura.id,
      numero_fatura: numeroFatura,
      pdf_url: pdfResponse.data.pdf_url
    });

  } catch (error) {
    console.error('Erro ao gerar fatura:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});