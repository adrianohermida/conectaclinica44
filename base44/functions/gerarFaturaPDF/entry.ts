import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * GERAR FATURA PDF - Portal Paciente (LGPD Art. 18)
 * 
 * Gera PDF da fatura de uma venda
 * Apenas o paciente dono pode baixar (auth obrigatório)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venda_id } = await req.json();

    if (!venda_id) {
      return Response.json({ error: 'venda_id obrigatório' }, { status: 400 });
    }

    // Fetch venda
    const vendas = await base44.asServiceRole.entities.Venda.filter({ id: venda_id });
    if (vendas.length === 0) {
      return Response.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const venda = vendas[0];

    // SEGURANÇA: Validar que o user logado é o paciente da venda
    const contatos = await base44.asServiceRole.entities.Contato.filter({ 
      user_id: user.id,
      tipo_contato: "paciente"
    });

    if (contatos.length === 0 || contatos[0].id !== venda.paciente_id) {
      return Response.json({ error: 'Acesso negado: venda pertence a outro paciente' }, { status: 403 });
    }

    // Gerar PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.setTextColor(126, 87, 255);
    doc.text('ConectaClínica', 20, 25);

    doc.setFontSize(16);
    doc.setTextColor(32, 33, 36);
    doc.text(`Fatura #${venda.id.slice(-6)}`, 20, 40);

    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104);
    doc.text(`Data: ${venda.data_venda}`, 20, 50);
    doc.text(`Status: ${venda.status_pagamento.toUpperCase()}`, 20, 56);

    // Cliente
    doc.setFontSize(12);
    doc.setTextColor(32, 33, 36);
    doc.text('Cliente:', 20, 70);
    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104);
    doc.text(venda.paciente_nome, 20, 77);

    // Tabela de Itens
    doc.setFontSize(12);
    doc.setTextColor(32, 33, 36);
    doc.text('Itens:', 20, 92);

    let y = 102;
    (venda.itens || []).forEach((item, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.setTextColor(95, 99, 104);
      doc.text(`${idx + 1}. ${item.produto}`, 25, y);
      doc.text(`Qtd: ${item.quantidade}`, 120, y);
      doc.text(`R$ ${item.preco_unitario.toFixed(2)}`, 150, y);
      doc.text(`R$ ${item.subtotal.toFixed(2)}`, 175, y);
      y += 8;
    });

    // Totais
    y += 10;
    doc.setDrawColor(232, 234, 237);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(32, 33, 36);
    doc.text('Subtotal:', 130, y);
    doc.text(`R$ ${venda.valor_total.toFixed(2)}`, 175, y);
    y += 8;

    if (venda.desconto > 0) {
      doc.text('Desconto:', 130, y);
      doc.setTextColor(234, 67, 53);
      doc.text(`- R$ ${venda.desconto.toFixed(2)}`, 175, y);
      y += 8;
    }

    doc.setFontSize(14);
    doc.setTextColor(52, 168, 83);
    doc.text('TOTAL:', 130, y);
    doc.text(`R$ ${venda.valor_final.toFixed(2)}`, 175, y);

    // Forma Pagamento
    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104);
    doc.text(`Forma de Pagamento: ${venda.forma_pagamento.toUpperCase()}`, 20, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(189, 193, 198);
    doc.text('ConectaClínica - Gestão Inteligente de Saúde', 20, 280);
    doc.text('contato@prevenclin.com.br | +55 92 3028-1656', 20, 285);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=fatura_${venda.id.slice(-6)}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar fatura:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});