import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const banco = formData.get('banco');
    const agencia = formData.get('agencia');
    const conta = formData.get('conta');
    const tipo_conta = formData.get('tipo_conta');
    const periodo_inicio = formData.get('periodo_inicio');
    const periodo_fim = formData.get('periodo_fim');

    if (!file) {
      return Response.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Upload do arquivo
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: file
    });

    const arquivo_url = uploadResult.file_url;

    // Buscar conteúdo do arquivo para processar
    const fileResponse = await fetch(arquivo_url);
    const fileText = await fileResponse.text();

    // Usar IA para extrair transações do extrato
    const prompt = `Analise este extrato bancário e extraia todas as transações.
    
Extrato:
${fileText}

Extraia e retorne no seguinte formato JSON:
- data: data da transação (formato YYYY-MM-DD)
- descricao: descrição da transação
- valor: valor (positivo para crédito, negativo para débito)
- tipo: "credito" ou "debito"
- categoria_sugerida: categoria sugerida baseada na descrição (ex: "consulta", "venda_produtos", "medicamentos", "aluguel", "salarios", etc)

Retorne apenas transações válidas encontradas.`;

    const resultadoIA = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          transacoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                data: { type: "string" },
                descricao: { type: "string" },
                valor: { type: "number" },
                tipo: { type: "string" },
                categoria_sugerida: { type: "string" }
              }
            }
          },
          saldo_inicial: { type: "number" },
          saldo_final: { type: "number" }
        }
      }
    });

    const transacoes = resultadoIA.transacoes || [];

    // Registrar o extrato
    const extrato = await base44.asServiceRole.entities.ExtratosBancarios.create({
      banco: banco,
      agencia: agencia,
      conta: conta,
      tipo_conta: tipo_conta,
      periodo_inicio: periodo_inicio,
      periodo_fim: periodo_fim,
      arquivo_url: arquivo_url,
      nome_arquivo: file.name,
      processado: true,
      data_importacao: new Date().toISOString().split('T')[0],
      transacoes_importadas: transacoes.length,
      saldo_inicial: resultadoIA.saldo_inicial || 0,
      saldo_final: resultadoIA.saldo_final || 0
    });

    // Tentar conciliar com contas a pagar/receber
    const contasReceber = await base44.asServiceRole.entities.ContaReceber.filter({
      status: "pendente"
    });

    const contasPagar = await base44.asServiceRole.entities.ContaPagar.filter({
      status: "pendente"
    });

    const conciliacoes = [];

    for (const transacao of transacoes) {
      if (transacao.tipo === "credito") {
        // Tentar conciliar com contas a receber
        const contaMatch = contasReceber.find(c => 
          Math.abs(c.valor - transacao.valor) < 0.01 &&
          Math.abs(new Date(c.data_vencimento).getTime() - new Date(transacao.data).getTime()) < 7 * 24 * 60 * 60 * 1000
        );

        if (contaMatch) {
          await base44.asServiceRole.entities.ContaReceber.update(contaMatch.id, {
            status: "recebido",
            data_recebimento: transacao.data
          });

          conciliacoes.push({
            tipo: "receber",
            conta_id: contaMatch.id,
            descricao: contaMatch.descricao,
            valor: transacao.valor
          });
        }
      } else if (transacao.tipo === "debito") {
        // Tentar conciliar com contas a pagar
        const contaMatch = contasPagar.find(c => 
          Math.abs(c.valor - Math.abs(transacao.valor)) < 0.01 &&
          Math.abs(new Date(c.data_vencimento).getTime() - new Date(transacao.data).getTime()) < 7 * 24 * 60 * 60 * 1000
        );

        if (contaMatch) {
          await base44.asServiceRole.entities.ContaPagar.update(contaMatch.id, {
            status: "pago",
            data_pagamento: transacao.data
          });

          conciliacoes.push({
            tipo: "pagar",
            conta_id: contaMatch.id,
            descricao: contaMatch.descricao,
            valor: Math.abs(transacao.valor)
          });
        }
      }
    }

    return Response.json({
      success: true,
      extrato_id: extrato.id,
      transacoes_importadas: transacoes.length,
      transacoes: transacoes,
      conciliacoes_automaticas: conciliacoes.length,
      conciliacoes: conciliacoes
    });

  } catch (error) {
    console.error('Erro ao importar extrato:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});