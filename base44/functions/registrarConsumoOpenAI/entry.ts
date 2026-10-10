import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FASE 6: REGISTRAR CONSUMO OPENAI
 * Chamado após cada InvokeLLM para tracking
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clinica_id, tokens, custo_usd, tipo } = await req.json();

    if (!clinica_id || !tokens) {
      return Response.json({ error: 'clinica_id e tokens obrigatórios' }, { status: 400 });
    }

    const mesReferencia = new Date().toISOString().slice(0, 7); // YYYY-MM
    const cambio = 5.90; // Fixo por simplicidade (pode buscar API externa)

    // Buscar ou criar registro do mês
    const consumos = await base44.asServiceRole.entities.ConsumoOpenAI.filter({
      clinica_id,
      mes_referencia: mesReferencia
    });

    const custoUSD = custo_usd || (tokens * 0.002 / 1000); // ~$0.002/1k tokens (estimativa gpt-4o-mini)
    const custoBRL = custoUSD * cambio;

    if (consumos.length === 0) {
      // Criar novo
      await base44.asServiceRole.entities.ConsumoOpenAI.create({
        clinica_id,
        mes_referencia: mesReferencia,
        total_tokens: tokens,
        total_requisicoes: 1,
        custo_total_usd: custoUSD,
        custo_total_brl: custoBRL,
        detalhamento: [{
          data: new Date().toISOString(),
          tipo: tipo || 'llm',
          tokens,
          custo_usd: custoUSD
        }]
      });
    } else {
      // Atualizar existente
      const consumo = consumos[0];
      const novoTotal = consumo.custo_total_brl + custoBRL;
      const percentualUso = (novoTotal / consumo.limite_mensal_brl) * 100;

      const detalhamento = consumo.detalhamento || [];
      detalhamento.push({
        data: new Date().toISOString(),
        tipo: tipo || 'llm',
        tokens,
        custo_usd: custoUSD
      });

      const updateData = {
        total_tokens: consumo.total_tokens + tokens,
        total_requisicoes: consumo.total_requisicoes + 1,
        custo_total_usd: consumo.custo_total_usd + custoUSD,
        custo_total_brl: novoTotal,
        detalhamento
      };

      // FASE 6: Auto-pause se >100% do limite
      if (novoTotal >= consumo.limite_mensal_brl && !consumo.pausado_automaticamente) {
        updateData.pausado_automaticamente = true;
        updateData.data_pausa = new Date().toISOString();
        
        console.log(`[ConsumoOpenAI] PAUSADO: Clínica ${clinica_id} atingiu R$${novoTotal.toFixed(2)}`);
        
        // Enviar email ao admin
        await base44.integrations.Core.SendEmail({
          to: 'contato@conectaclinica.com.br',
          subject: `🚨 IA PAUSADA: Clínica ${clinica_id} atingiu limite`,
          body: `Consumo: R$ ${novoTotal.toFixed(2)} / R$ ${consumo.limite_mensal_brl}. IA foi pausada automaticamente.`
        });
      }

      // FASE 6: Alerta 80%
      if (percentualUso >= 80 && !consumo.alerta_80_enviado && !consumo.pausado_automaticamente) {
        updateData.alerta_80_enviado = true;
        
        // Buscar email da clínica
        const clinicas = await base44.asServiceRole.entities.Clinica.filter({ id: clinica_id });
        if (clinicas[0]?.email) {
          await base44.integrations.Core.SendEmail({
            to: clinicas[0].email,
            subject: '⚠️ Alerta: 80% do limite de créditos IA atingido',
            body: `Sua clínica está próxima do limite mensal de créditos IA.\n\nConsumo atual: R$ ${novoTotal.toFixed(2)}\nLimite: R$ ${consumo.limite_mensal_brl}\n\nUpgrade para IA Premium: ilimitado por R$ 2.999/mês.`
          });
        }
      }

      await base44.asServiceRole.entities.ConsumoOpenAI.update(consumo.id, updateData);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('[ConsumoOpenAI] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});