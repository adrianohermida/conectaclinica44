import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Criar Venda + ContaReceber + Atualizar Estoque
 * 
 * Fluxo:
 * 1. Validar estoque disponível
 * 2. Criar registro de Venda
 * 3. Auto-gerar ContaReceber vinculada
 * 4. Atualizar estoque dos produtos
 * 5. Registrar movimentação de estoque
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth obrigatório
    const user = await base44.auth.me();
    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    // ========================================
    // RATE LIMITING - Anti-fraude
    // ========================================
    const agora = new Date();
    const horaAtras = new Date(agora.getTime() - 60 * 60 * 1000);
    const diaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    // Contar vendas do usuário na última hora
    const vendasUsuarioHora = await base44.asServiceRole.entities.Venda.filter({ 
      clinica_id: user.clinica_id,
      vendedor_id: user.id
    });
    const vendasUltimaHora = vendasUsuarioHora.filter(v => 
      new Date(v.created_date) >= horaAtras
    ).length;

    if (vendasUltimaHora >= 20) {
      return Response.json({ 
        error: 'RATE LIMIT: Máximo 20 vendas/hora por usuário. Aguarde antes de continuar.',
        retry_after: 3600 - Math.floor((agora - horaAtras) / 1000)
      }, { status: 429 });
    }

    // Contar vendas da clínica no último dia (limite por plano)
    const vendasClinicaDia = await base44.asServiceRole.entities.Venda.filter({ 
      clinica_id: user.clinica_id
    });
    const vendasUltimoDia = vendasClinicaDia.filter(v => 
      new Date(v.created_date) >= diaAtras
    ).length;

    // Buscar plano da clínica
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
      clinica_id: user.clinica_id,
      status: 'ativa'
    });

    const planoSlug = assinaturas.length > 0 ? assinaturas[0].plano_slug : 'starter';

    const limiteDiario = {
      'starter': 100,
      'profissional': 500,
      'enterprise': 10000
    }[planoSlug] || 100;

    if (vendasUltimoDia >= limiteDiario) {
      return Response.json({ 
        error: `LIMITE DIÁRIO: Plano ${planoSlug} permite até ${limiteDiario} vendas/dia. Considere upgrade.`,
        plano_atual: planoSlug,
        vendas_hoje: vendasUltimoDia,
        limite: limiteDiario
      }, { status: 429 });
    }

    // DETECÇÃO PADRÃO ANÔMALO: >10 vendas em <5min = suspeito
    const cincoMinAtras = new Date(agora.getTime() - 5 * 60 * 1000);
    const vendasUltimos5Min = vendasUsuarioHora.filter(v => 
      new Date(v.created_date) >= cincoMinAtras
    ).length;

    if (vendasUltimos5Min >= 10) {
      // Bloquear + notificar SuperAdmin
      await base44.asServiceRole.entities.LogAuditoria.create({
        clinica_id: user.clinica_id,
        usuario_email: user.email,
        acao: 'venda_bloqueada_anomalia',
        detalhes: `Padrão anômalo detectado: ${vendasUltimos5Min} vendas em 5 minutos`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        severidade: 'critica'
      }).catch(() => {});

      return Response.json({ 
        error: 'BLOQUEIO DE SEGURANÇA: Padrão anômalo detectado. Entre em contato com suporte.',
        vendas_5min: vendasUltimos5Min
      }, { status: 403 });
    }
    const {
      paciente_id,
      paciente_nome,
      itens, // [{ produto_id, quantidade, preco_unitario }]
      desconto = 0,
      forma_pagamento = 'dinheiro',
      observacoes = ''
    } = payload;

    // Validação básica
    if (!paciente_id || !paciente_nome || !itens || itens.length === 0) {
      return Response.json({ 
        error: 'Dados incompletos: paciente_id, paciente_nome e itens são obrigatórios' 
      }, { status: 400 });
    }

    // 1. VALIDAR ESTOQUE E CALCULAR TOTAIS
    const produtosDetalhes = [];
    let valor_total = 0;

    for (const item of itens) {
      const produto = await base44.asServiceRole.entities.Produto.filter({ 
        id: item.produto_id 
      }).then(res => res[0]);

      if (!produto) {
        return Response.json({ 
          error: `Produto ${item.produto_id} não encontrado` 
        }, { status: 404 });
      }

      // Validar estoque (apenas para produtos físicos)
      if (produto.tipo === 'produto' || produto.tipo === 'medicamento') {
        if ((produto.quantidade_estoque || 0) < item.quantidade) {
          return Response.json({ 
            error: `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.quantidade_estoque}` 
          }, { status: 400 });
        }
      }

      const subtotal = item.quantidade * item.preco_unitario;
      valor_total += subtotal;

      produtosDetalhes.push({
        produto_id: produto.id,
        produto: produto.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal,
        tipo: produto.tipo,
        custo: produto.custo || 0
      });
    }

    const valor_final = valor_total - desconto;

    // 2. CRIAR VENDA
    const venda = await base44.asServiceRole.entities.Venda.create({
      clinica_id: user.clinica_id,
      paciente_id,
      paciente_nome,
      data_venda: new Date().toISOString().split('T')[0],
      itens: produtosDetalhes,
      valor_total,
      desconto,
      valor_final,
      forma_pagamento,
      status_pagamento: forma_pagamento === 'dinheiro' ? 'pago' : 'pendente',
      vendedor_id: user.id,
      vendedor_nome: user.full_name || user.email
    });

    // 3. AUTO-GERAR CONTARECEBER
    const contaReceber = await base44.asServiceRole.entities.ContaReceber.create({
      clinica_id: user.clinica_id,
      descricao: `Venda #${venda.id.slice(-6)} - ${paciente_nome}`,
      categoria: 'venda_produtos',
      paciente_nome,
      paciente_id,
      valor: valor_final,
      data_vencimento: new Date().toISOString().split('T')[0],
      status: forma_pagamento === 'dinheiro' ? 'recebido' : 'pendente',
      data_recebimento: forma_pagamento === 'dinheiro' ? new Date().toISOString().split('T')[0] : null
    });

    // Vincular ContaReceber à Venda
    await base44.asServiceRole.entities.Venda.update(venda.id, {
      ...venda,
      conta_receber_id: contaReceber.id
    });

    // 4. ATUALIZAR ESTOQUE (apenas produtos físicos)
    const movimentacoes = [];
    for (const item of produtosDetalhes) {
      if (item.tipo === 'produto' || item.tipo === 'medicamento') {
        const produto = await base44.asServiceRole.entities.Produto.filter({ 
          id: item.produto_id 
        }).then(res => res[0]);

        const novo_estoque = (produto.quantidade_estoque || 0) - item.quantidade;

        // Atualizar estoque do produto
        await base44.asServiceRole.entities.Produto.update(item.produto_id, {
          ...produto,
          quantidade_estoque: novo_estoque
        });

        // Registrar movimentação
        const mov = await base44.asServiceRole.entities.MovimentacaoEstoque.create({
          clinica_id: user.clinica_id,
          medicamento_id: item.produto_id,
          medicamento_nome: item.produto,
          tipo_movimentacao: 'saida',
          quantidade: item.quantidade,
          data_movimentacao: new Date().toISOString().split('T')[0],
          motivo: `Venda #${venda.id.slice(-6)}`,
          estoque_anterior: produto.quantidade_estoque || 0,
          estoque_atual: novo_estoque,
          valor_unitario: item.preco_unitario,
          valor_total: item.subtotal,
          responsavel: user.full_name || user.email
        });

        movimentacoes.push(mov);
      }
    }

    // 5. REGISTRAR CONSUMO DE RECURSO (SuperAdmin Monitoring)
    try {
      await base44.asServiceRole.entities.ConsumoRecurso.create({
        clinica_id: user.clinica_id,
        tipo_recurso: 'venda_marketplace',
        quantidade: 1,
        custo_estimado: 0.02,
        data_consumo: new Date().toISOString(),
        detalhes: {
          venda_id: venda.id,
          valor_venda: valor_final,
          itens_count: produtosDetalhes.length
        }
      });
    } catch (err) {
      console.warn('Aviso: ConsumoRecurso não registrado:', err.message);
    }

    // 6. AUDIT LOG COMPLETO - Anti-fraude
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: user.clinica_id,
      usuario_email: user.email,
      usuario_id: user.id,
      acao: 'venda_criada',
      entidade: 'Venda',
      entidade_id: venda.id,
      detalhes: {
        paciente_id,
        paciente_nome,
        valor_final,
        itens_count: produtosDetalhes.length,
        forma_pagamento,
        produtos: produtosDetalhes.map(p => p.produto),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      },
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      severidade: 'info'
    }).catch(() => {}); // Silent fail se LogAuditoria não existir

    return Response.json({
      success: true,
      venda,
      conta_receber: contaReceber,
      movimentacoes,
      message: `Venda realizada! ${movimentacoes.length} item(ns) de estoque atualizado(s).`
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar venda:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});