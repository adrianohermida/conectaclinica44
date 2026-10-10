import { base44 } from "@/api/base44Client";

export async function invokeIAComCache(tipo, input, jsonSchema, options = {}) {
  const { forceRefresh = false, validadeDias = 7 } = options;
  
  const hashInput = await gerarHash(JSON.stringify({ tipo, input, jsonSchema }));
  
  if (!forceRefresh) {
    const cached = await base44.entities.CacheIA.filter({ hash_input: hashInput });
    if (cached.length > 0) {
      const cache = cached[0];
      const valido = new Date(cache.valido_ate) > new Date();
      
      if (valido) {
        await base44.entities.CacheIA.update(cache.id, {
          ...cache,
          hits: cache.hits + 1,
          ultima_utilizacao: new Date().toISOString()
        });
        
        await registrarMetrica(tipo, 0, true, cache.tempo_resposta_ms);
        return cache.output;
      }
    }
  }
  
  const inicio = Date.now();
  const resultado = await base44.integrations.Core.InvokeLLM({
    prompt: input,
    response_json_schema: jsonSchema,
    add_context_from_internet: options.useInternet || false
  });
  const tempoResposta = Date.now() - inicio;
  const custoEstimado = 0.0006;
  
  const validoAte = new Date();
  validoAte.setDate(validoAte.getDate() + validadeDias);
  
  await base44.entities.CacheIA.create({
    hash_input: hashInput,
    tipo_analise: tipo,
    input_resumido: input.substring(0, 200),
    output: resultado,
    modelo_usado: "gpt-4o-mini",
    custo_usd: custoEstimado,
    tempo_resposta_ms: tempoResposta,
    hits: 1,
    ultima_utilizacao: new Date().toISOString(),
    valido_ate: validoAte.toISOString()
  });
  
  await registrarMetrica(tipo, custoEstimado, false, tempoResposta);
  return resultado;
}

async function gerarHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registrarMetrica(tipo, custo, fromCache, tempoMs) {
  try {
    const user = await base44.auth.me();
    const hoje = new Date().toISOString().split('T')[0];
    
    const metricas = await base44.entities.MetricasIA.filter({ data: hoje, tipo_analise: tipo });
    
    if (metricas.length > 0) {
      const m = metricas[0];
      await base44.entities.MetricasIA.update(m.id, {
        ...m,
        total_chamadas: m.total_chamadas + 1,
        cache_hits: m.cache_hits + (fromCache ? 1 : 0),
        custo_total_usd: m.custo_total_usd + custo,
        economia_cache_usd: fromCache ? m.economia_cache_usd + 0.0006 : m.economia_cache_usd,
        tempo_medio_resposta_ms: ((m.tempo_medio_resposta_ms * m.total_chamadas) + tempoMs) / (m.total_chamadas + 1),
        usuarios_unicos: [...new Set([...(m.usuarios_unicos || []), user.email])]
      });
    } else {
      await base44.entities.MetricasIA.create({
        data: hoje,
        tipo_analise: tipo,
        total_chamadas: 1,
        cache_hits: fromCache ? 1 : 0,
        custo_total_usd: custo,
        economia_cache_usd: fromCache ? 0.0006 : 0,
        tempo_medio_resposta_ms: tempoMs,
        usuarios_unicos: [user.email]
      });
    }
  } catch (e) {
    console.error("Erro ao registrar métrica IA:", e);
  }
}