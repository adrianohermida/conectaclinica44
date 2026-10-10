import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: Gerar + enviar fatura mensal automática
 * CRON: Dia 1 de cada mês (09:00 BRT)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // CRON sem auth - service role
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const mesRef = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

    // Buscar todas clínicas ativas
    const clinicas = await base44.asServiceRole.entities.Clinica.filter({ status: 'ativa' });

    const enviados = [];
    const erros = [];

    for (const clinica of clinicas) {
      try {
        // Gerar fatura (usar function existente)
        const faturaResponse = await base44.asServiceRole.functions.invoke('gerarFatura', {
          clinica_id: clinica.id,
          mes_referencia: mesRef
        });

        if (!faturaResponse.data.fatura_id) {
          throw new Error('Fatura não gerada');
        }

        const fatura = faturaResponse.data;

        // Buscar admin da clínica
        const admins = await base44.asServiceRole.entities.User.filter({
          clinica_id: clinica.id,
          role: 'admin'
        });

        if (admins.length === 0) continue;

        const admin = admins[0];

        // Gerar PDF
        const pdfResponse = await base44.asServiceRole.functions.invoke('gerarFaturaPDF', {
          fatura_id: fatura.fatura_id
        });

        // Enviar email com PDF
        await enviarEmail({
          tipo: 'fatura_mensal',
          para: admin.email,
          assunto: `Fatura ${mesRef} - ${clinica.nome}`,
          variaveis: {
            clinica_nome: clinica.nome,
            mes_referencia: new Date(mesRef + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
            valor_total: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor_total || 0),
            itens_count: fatura.detalhamento?.length || 0,
            link_fatura: `https://app.conectaclinica.com.br/financeiro/faturas/${fatura.fatura_id}`
          },
          anexos: pdfResponse.data.pdf_base64 ? [{
            content: pdfResponse.data.pdf_base64,
            filename: `fatura_${mesRef}_${clinica.nome}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }] : []
        });

        enviados.push(clinica.id);

      } catch (error) {
        console.error(`[FaturaMensal] Erro clinica ${clinica.id}:`, error);
        erros.push({ clinica_id: clinica.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      mes_referencia: mesRef,
      total_clinicas: clinicas.length,
      enviados: enviados.length,
      erros: erros.length,
      detalhes: { enviados, erros }
    });

  } catch (error) {
    console.error('[FaturaMensal] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});