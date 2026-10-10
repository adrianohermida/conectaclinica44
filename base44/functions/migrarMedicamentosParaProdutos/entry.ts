import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MIGRATION: Medicamento → Produto (one-time)
 * 
 * Migra todos os registros de Medicamento para Produto
 * Preserva todos os dados, adiciona tipo = 'medicamento'
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // APENAS SuperAdmin pode executar migration
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: apenas SuperAdmin' }, { status: 403 });
    }

    // Buscar TODOS os medicamentos
    const medicamentos = await base44.asServiceRole.entities.Medicamento.list('-created_date', 1000);

    if (medicamentos.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhum medicamento para migrar',
        migrados: 0
      });
    }

    const migrados = [];
    const erros = [];

    for (const med of medicamentos) {
      try {
        // Criar Produto equivalente
        const produto = await base44.asServiceRole.entities.Produto.create({
          clinica_id: med.clinica_id,
          nome: med.nome,
          tipo: 'medicamento',
          categoria: med.categoria,
          descricao: `Medicamento migrado: ${med.principio_ativo || ''}`,
          
          // Preços
          preco_base: med.preco_venda || 0,
          custo: med.preco_custo || 0,
          margem_lucro: med.preco_custo > 0 
            ? ((med.preco_venda - med.preco_custo) / med.preco_custo * 100).toFixed(2)
            : 0,
          
          // Campos específicos de medicamento
          principio_ativo: med.principio_ativo,
          fabricante: med.fabricante,
          codigo_barras: med.codigo_barras,
          registro_anvisa: med.registro_anvisa,
          apresentacao: med.apresentacao,
          dosagem: med.dosagem,
          unidade_medida: med.unidade_medida || 'comprimido',
          
          // Estoque
          quantidade_estoque: med.quantidade_estoque || 0,
          estoque_minimo: med.estoque_minimo || 0,
          estoque_maximo: med.estoque_maximo || 0,
          lote: med.lote,
          validade: med.validade,
          localizacao: med.localizacao,
          fornecedor: med.fornecedor,
          
          // Controles
          tarja: med.tarja || 'sem_tarja',
          receita_obrigatoria: med.receita_obrigatoria || false,
          controlado: med.controlado || false,
          ativo: med.ativo !== false,
          observacoes: med.observacoes || `ID original: ${med.id}`
        });

        migrados.push({ 
          medicamento_id: med.id, 
          produto_id: produto.id,
          nome: med.nome
        });

      } catch (error) {
        erros.push({ 
          medicamento_id: med.id, 
          nome: med.nome,
          erro: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      total_medicamentos: medicamentos.length,
      migrados: migrados.length,
      erros: erros.length,
      detalhes: { migrados, erros },
      message: `✅ Migration concluída: ${migrados.length}/${medicamentos.length} medicamentos migrados para Produto`
    });

  } catch (error) {
    console.error('Erro na migration:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});