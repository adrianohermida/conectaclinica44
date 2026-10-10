import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: Enviar cobrança + PDF anexo via SendGrid
 * Gera PDF da fatura e envia com template profissional
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fatura_id, conta_receber_id } = await req.json();

    // Buscar dados
    const conta = conta_receber_id 
      ? await base44.entities.ContaReceber.filter({ id: conta_receber_id })[0]
      : null;
    
    if (!conta) {
      return Response.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const contato = await base44.entities.Contato.filter({ id: conta.contato_id })[0];
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    // Gerar PDF (chamada function existente ou inline simples)
    let pdfBase64 = null;
    if (fatura_id) {
      const pdfResponse = await base44.functions.invoke('gerarFaturaPDF', { fatura_id });
      pdfBase64 = pdfResponse.data.pdf_base64;
    }

    // Enviar email
    const resultado = await enviarEmail({
      tipo: 'cobranca',
      para: contato.email,
      assunto: `Cobrança - ${clinica.nome}`,
      variaveis: {
        paciente_nome: contato.nome,
        clinica_nome: clinica.nome,
        valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor),
        vencimento: new Date(conta.data_vencimento).toLocaleDateString('pt-BR'),
        descricao: conta.descricao || 'Serviços médicos',
        link_pagamento: `https://app.conectaclinica.com.br/portal/pagamento/${conta.id}`,
        parcela: conta.parcela || '1/1'
      },
      anexos: pdfBase64 ? [{
        content: pdfBase64,
        filename: `fatura_${conta.numero}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      }] : undefined
    });

    // Registrar envio
    if (resultado.success) {
      await base44.entities.ContaReceber.update(conta.id, {
        email_enviado: true,
        data_ultimo_email: new Date().toISOString()
      });
    }

    return Response.json(resultado);
  } catch (error) {
    console.error('[EnviarCobranca] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});