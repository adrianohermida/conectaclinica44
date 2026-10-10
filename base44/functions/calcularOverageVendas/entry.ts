import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CALCULAR OVERAGE VENDAS - Pricing Dinâmico
 * 
 * Calcula cobranças extras por uso acima do plano:
 * - Starter: 50 vendas/mês → R$ 0.50/venda extra
 * - Profissional: 200 vendas/mês → R$ 0.40/venda extra
 * - Enterprise: ilimitado
 * 
 * Usado em billing mensal para gerar cobranças adicionais
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: apenas SuperAdmin' }, { status: 403 });
    }

    const { clinica_id, mes, ano } = await req.json();

    if (!clinica_id || !mes || !ano) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: clinica_id, mes, ano' 
      }, { status: 400 });
    }

    // Buscar plano ativo da clínica
    const assinaturas = await base44.asServiceRole.entities.AssinaturaClinica.filter({ 
      clinica_id,
      status: 'ativa'
    });

    if (assinaturas.length === 0) {
      return Response.json({ 
        error: 'Clínica sem assinatura ativa' 
      }, { status: 404 });
    }

    const planoSlug = assinaturas[0].plano_slug;

    // Definir limites por plano
    const limites = {
      'starter': { vendas_incluidas: 50, preco_extra: 0.50 },
      'profissional': { vendas_incluidas: 200, preco_extra: 0.40 },
      'enterprise': { vendas_incluidas: Infinity, preco_extra: 0 }
    };

    const config = limites[planoSlug] || limites['starter'];

    // Contar vendas no período
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const dataFim = new Date(ano, mes, 0);
    const dataFimStr = format(dataFim, 'yyyy-MM-dd');

    const vendas = await base44.asServiceRole.entities.Venda.filter({ 
      clinica_id 
    });

    const vendasMes = vendas.filter(v => 
      v.data_venda >= dataInicio && v.data_venda <= dataFimStr
    );

    const totalVendas = vendasMes.length;
    const vendasExtras = Math.max(0, totalVendas - config.vendas_incluidas);
    const valorOverage = vendasExtras * config.preco_extra;

    return Response.json({
      success: true,
      clinica_id,
      periodo: `${mes}/${ano}`,
      plano: planoSlug,
      vendas_incluidas: config.vendas_incluidas,
      total_vendas: totalVendas,
      vendas_extras: vendasExtras,
      preco_por_extra: config.preco_extra,
      valor_overage: valorOverage,
      cobranca_adicional: valorOverage > 0
    });

  } catch (error) {
    console.error('Erro ao calcular overage:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});

function format(date, formatStr) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}