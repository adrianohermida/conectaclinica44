import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: CRON - Alertar contas vencendo em 3 dias
 * Rodar diariamente (08:00 BRT)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // CRON sem user auth - usar service role direto
    const hoje = new Date();
    const em3dias = new Date();
    em3dias.setDate(hoje.getDate() + 3);
    
    const diaInicio = em3dias.toISOString().split('T')[0];
    const diaFim = em3dias.toISOString().split('T')[0];

    // Buscar contas vencendo em 3 dias (não pagas)
    const contas = await base44.asServiceRole.entities.ContaReceber.filter({
      status: 'pendente',
      data_vencimento: { $gte: diaInicio, $lte: diaFim }
    });

    console.log(`[AlertarVencimentos] ${contas.length} contas vencendo em 3 dias`);

    const enviados = [];
    const erros = [];

    for (const conta of contas) {
      try {
        const contato = await base44.asServiceRole.entities.Contato.filter({ id: conta.contato_id })[0];
        const clinica = await base44.asServiceRole.entities.Clinica.filter({ id: conta.clinica_id })[0];

        if (!contato?.email) {
          console.warn(`[AlertarVencimentos] Contato ${conta.contato_id} sem email`);
          continue;
        }

        await enviarEmail({
          tipo: 'alerta_vencimento',
          para: contato.email,
          assunto: `Lembrete: Vencimento em 3 dias - ${clinica.nome}`,
          variaveis: {
            paciente_nome: contato.nome,
            clinica_nome: clinica.nome,
            valor: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor),
            vencimento: new Date(conta.data_vencimento).toLocaleDateString('pt-BR'),
            descricao: conta.descricao || 'Serviços médicos',
            link_pagamento: `https://app.conectaclinica.com.br/portal/pagamento/${conta.id}`,
            dias_restantes: '3'
          }
        });

        enviados.push(conta.id);
      } catch (error) {
        console.error(`[AlertarVencimentos] Erro conta ${conta.id}:`, error);
        erros.push({ conta_id: conta.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      total_contas: contas.length,
      enviados: enviados.length,
      erros: erros.length,
      detalhes: { enviados, erros }
    });
  } catch (error) {
    console.error('[AlertarVencimentos] Erro fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});