import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Integração com Santander e Getnet para importação de transações
// Nota: Esta é uma implementação base que será expandida com credenciais reais

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo_integracao, data_inicio, data_fim, conta_id } = await req.json();

    if (!tipo_integracao || !data_inicio || !data_fim) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: tipo_integracao, data_inicio, data_fim' 
      }, { status: 400 });
    }

    let transacoes = [];

    // Integração Santander (Open Banking)
    if (tipo_integracao === 'santander') {
      const santanderToken = Deno.env.get('SANTANDER_API_KEY');
      
      if (!santanderToken) {
        return Response.json({
          success: false,
          error: 'SANTANDER_API_KEY não configurado. Configure nas variáveis de ambiente.'
        });
      }

      // API do Santander Open Banking
      const santanderResponse = await fetch(
        'https://trust-open.api.santander.com.br/bank_account_information/v2/accounts/transactions',
        {
          headers: {
            'Authorization': `Bearer ${santanderToken}`,
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({
            data_inicio: data_inicio,
            data_fim: data_fim,
            conta_id: conta_id
          })
        }
      );

      const dadosSantander = await santanderResponse.json();
      
      if (dadosSantander.data?.transactions) {
        transacoes = dadosSantander.data.transactions.map(t => ({
          data: t.bookingDate || t.valueDate,
          descricao: t.remittanceInformation || t.creditorName || t.debtorName || "Transação bancária",
          valor: t.transactionAmount.amount * (t.creditDebitIndicator === 'DEBIT' ? -1 : 1),
          tipo: t.creditDebitIndicator === 'DEBIT' ? 'debito' : 'credito',
          referencia: t.transactionId,
          origem: 'santander'
        }));
      }
    }

    // Integração Getnet (Gateway de Pagamento)
    if (tipo_integracao === 'getnet') {
      const getnetClientId = Deno.env.get('GETNET_CLIENT_ID');
      const getnetClientSecret = Deno.env.get('GETNET_CLIENT_SECRET');
      const getnetSellerId = Deno.env.get('GETNET_SELLER_ID');

      if (!getnetClientId || !getnetClientSecret) {
        return Response.json({
          success: false,
          error: 'Credenciais Getnet não configuradas. Configure GETNET_CLIENT_ID e GETNET_CLIENT_SECRET.'
        });
      }

      // Obter token OAuth Getnet
      const authResponse = await fetch('https://api.getnet.com.br/auth/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(getnetClientId + ':' + getnetClientSecret)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'scope=oob&grant_type=client_credentials'
      });

      const authData = await authResponse.json();

      if (authData.access_token) {
        // Buscar transações
        const getnetResponse = await fetch(
          `https://api.getnet.com.br/v1/transactions?seller_id=${getnetSellerId}&start_date=${data_inicio}&end_date=${data_fim}`,
          {
            headers: {
              'Authorization': `Bearer ${authData.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const dadosGetnet = await getnetResponse.json();

        if (dadosGetnet.transactions) {
          transacoes = dadosGetnet.transactions.map(t => ({
            data: t.payment_date || t.created_at?.split('T')[0],
            descricao: `Pagamento cartão ${t.card?.brand || ''} - ${t.order_id || ''}`,
            valor: t.amount ? t.amount / 100 : 0,
            tipo: 'credito',
            referencia: t.payment_id,
            origem: 'getnet',
            detalhes: {
              bandeira: t.card?.brand,
              parcelas: t.installments,
              status: t.status
            }
          }));
        }
      }
    }

    if (transacoes.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma transação encontrada no período',
        transacoes: []
      });
    }

    // Usar IA para categorizar transações
    const prompt = `Categorize automaticamente as seguintes transações bancárias da clínica médica PrevenClin:

${transacoes.map((t, i) => `${i + 1}. Data: ${t.data} | Descrição: ${t.descricao} | Valor: R$ ${t.valor.toFixed(2)}`).join('\n')}

Para cada transação, sugira a categoria mais apropriada:
- Para receitas: "consulta", "procedimento", "venda_produtos", "convenio", "particular"
- Para despesas: "salarios", "medicamentos", "aluguel", "energia", "agua", "telefone", "impostos", "fornecedores", "manutencao", "marketing"

Retorne um array com a categoria sugerida para cada transação, na mesma ordem.`;

    const categorizacao = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          categorias: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Aplicar categorias
    transacoes = transacoes.map((t, i) => ({
      ...t,
      categoria_sugerida: categorizacao.categorias?.[i] || "outros"
    }));

    // Tentar conciliar com contas a pagar/receber
    const contasReceber = await base44.asServiceRole.entities.ContaReceber.filter({ status: "pendente" });
    const contasPagar = await base44.asServiceRole.entities.ContaPagar.filter({ status: "pendente" });

    const conciliacoes = [];

    for (const transacao of transacoes) {
      if (transacao.tipo === 'credito' && transacao.valor > 0) {
        const match = contasReceber.find(c => 
          Math.abs(c.valor - transacao.valor) < 1 &&
          Math.abs(new Date(c.data_vencimento).getTime() - new Date(transacao.data).getTime()) < 7 * 24 * 60 * 60 * 1000
        );

        if (match) {
          await base44.asServiceRole.entities.ContaReceber.update(match.id, {
            status: "recebido",
            data_recebimento: transacao.data
          });

          conciliacoes.push({
            tipo: "receber",
            conta_id: match.id,
            descricao: match.descricao,
            valor: transacao.valor
          });
        }
      } else if (transacao.tipo === 'debito' && transacao.valor < 0) {
        const match = contasPagar.find(c => 
          Math.abs(c.valor - Math.abs(transacao.valor)) < 1 &&
          Math.abs(new Date(c.data_vencimento).getTime() - new Date(transacao.data).getTime()) < 7 * 24 * 60 * 60 * 1000
        );

        if (match) {
          await base44.asServiceRole.entities.ContaPagar.update(match.id, {
            status: "pago",
            data_pagamento: transacao.data
          });

          conciliacoes.push({
            tipo: "pagar",
            conta_id: match.id,
            descricao: match.descricao,
            valor: Math.abs(transacao.valor)
          });
        }
      }
    }

    return Response.json({
      success: true,
      transacoes_importadas: transacoes.length,
      transacoes: transacoes,
      conciliacoes_automaticas: conciliacoes.length,
      conciliacoes: conciliacoes,
      tipo_integracao: tipo_integracao
    });

  } catch (error) {
    console.error('Erro na integração bancária:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});