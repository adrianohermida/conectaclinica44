import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { 
  Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle2, XCircle, Target, DollarSign, Zap, Code
} from "lucide-react";
import { toast } from "sonner";

/**
 * ANÁLISE BRUTAL DE REFATORAMENTO
 * 
 * Compara estado atual vs ideal
 * Recomenda refatorar ou manter com ROI calculado
 */
export default function AnaliseRefatoramento({ item, onAnaliseCompleta }) {
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState(item?.ultima_analise_refatoramento || null);

  React.useEffect(() => {
    if (item?.ultima_analise_refatoramento && JSON.stringify(item.ultima_analise_refatoramento) !== JSON.stringify(resultado)) {
      setResultado(item.ultima_analise_refatoramento);
    }
  }, [item?.ultima_analise_refatoramento]);

  const executarAnalise = async () => {
    setAnalisando(true);
    try {
      toast.loading('🔬 Análise brutal de refatoramento...', { id: 'refactor', duration: 10000 });
      
      const response = await base44.functions.invoke('analisarRefatoramentoBrutal', {
        item_id: item.id
      });
      
      if (!response.data || !response.data.analise) {
        throw new Error('Resposta inválida do servidor');
      }
      
      const analise = response.data.analise;
      
      console.log('[AnaliseRefatoramento] Análise concluída:', analise.recomendacao);
      setResultado(analise);
      
      // Callback para parent (disponibiliza análise para aceitar/rejeitar)
      if (onAnaliseCompleta) {
        onAnaliseCompleta(analise);
      }
      
      if (analise.recomendacao === 'REFATORAR_IMEDIATO') {
        toast.error(`🔴 REFATORAR IMEDIATO - ROI: ${analise.roi_score}%`, { id: 'refactor', duration: 8000 });
      } else if (analise.recomendacao === 'REFATORAR_PLANEJADO') {
        toast.warning(`🟡 REFATORAR PLANEJADO - ROI: ${analise.roi_score}%`, { id: 'refactor', duration: 6000 });
      } else if (analise.recomendacao === 'MANTER_MONITORAR') {
        toast.success(`🟢 MANTER + MONITORAR - ROI: ${analise.roi_score}%`, { id: 'refactor', duration: 4000 });
      } else {
        toast.success(`✅ MANTER - Não vale o custo`, { id: 'refactor', duration: 4000 });
      }
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: 'refactor' });
    } finally {
      setAnalisando(false);
    }
  };

  const aplicarRefatoramento = async () => {
    if (!resultado?.template_ideal) return;
    
    try {
      const templateIdeal = resultado.template_ideal;
      const observacoesEstruturadas = `
━━━ TEMPLATE IDEAL APROVADO ━━━

ENTITIES: ${templateIdeal.entities?.map(e => e.name).join(', ')}
FUNCTIONS: ${templateIdeal.functions?.map(f => f.name).join(', ')}
PAGES: ${templateIdeal.pages?.map(p => p.name).join(', ')}

PERFORMANCE TARGETS:
- LCP Mobile: < ${templateIdeal.performance_targets?.lcp_mobile_segundos || 2.5}s
- Bundle: < ${templateIdeal.performance_targets?.bundle_js_kb || 300}kb

TESTES E2E:
${templateIdeal.testes_e2e?.map(t => `- ${t}`).join('\n')}

RECURSOS BASE44:
${Object.entries(templateIdeal.recursos_base44 || {}).map(([k, v]) => `${v ? '✅' : '❌'} ${k}`).join('\n')}
`;
      
      await base44.entities.ChecklistProjeto.update(item.id, {
        observacoes: observacoesEstruturadas,
        evidencias: [
          ...templateIdeal.entities?.map(e => `entities/${e.name}.json`) || [],
          ...templateIdeal.functions?.map(f => `functions/${f.name}.js`) || [],
          ...templateIdeal.pages?.map(p => `pages/${p.name}.jsx`) || []
        ],
        definition_of_done: templateIdeal.testes_e2e || [],
        status: 'em_progresso'
      });
      
      toast.success('Template aplicado - agora execute o plano');
    } catch (error) {
      toast.error('Erro ao aplicar: ' + error.message);
    }
  };

  const getRecomendacaoColor = (rec) => {
    switch (rec) {
      case 'REFATORAR_IMEDIATO': return { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' };
      case 'REFATORAR_PLANEJADO': return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' };
      case 'MANTER_MONITORAR': return { bg: '#dcfce7', border: '#22c55e', text: '#166534' };
      case 'MANTER_NAO_VALE': return { bg: '#f3f4f6', border: '#6b7280', text: '#374151' };
      default: return { bg: '#f8f9fa', border: '#5f6368', text: '#202124' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">🔬 Análise de Refatoramento</h3>
          <p className="text-sm text-gray-600">Decisão estratégica baseada em ROI real</p>
        </div>
        <Button onClick={executarAnalise} disabled={analisando} className="bg-indigo-600">
          {analisando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
          {analisando ? 'Analisando...' : 'Analisar Refatoramento'}
        </Button>
      </div>

      {resultado && (
        <div className="space-y-4">
          {/* MÉTRICAS PAGESPEED REAIS (baseado em audit) */}
          {resultado.metricas_performance_atuais && (
            <div className="p-4 rounded-lg bg-yellow-50 border-2 border-yellow-400">
              <p className="font-bold text-sm mb-3 text-yellow-800">📊 PageSpeed Insights - Métricas Atuais vs Meta 100/100</p>
              
              {/* Core Web Vitals */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.lcp_mobile_segundos > 2.5 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.lcp_mobile_segundos}s</p>
                  <p className="text-xs">LCP Mobile</p>
                  <p className="text-[9px] text-gray-700">Meta: &lt;2.5s</p>
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.lcp_desktop_segundos > 1.3 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.lcp_desktop_segundos}s</p>
                  <p className="text-xs">LCP Desktop</p>
                  <p className="text-[9px] text-gray-700">Meta: &lt;1.3s</p>
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.fcp_mobile_segundos > 1.8 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.fcp_mobile_segundos}s</p>
                  <p className="text-xs">FCP Mobile</p>
                  <p className="text-[9px] text-gray-700">Meta: &lt;1.8s</p>
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.cls_mobile > 0.1 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.cls_mobile}</p>
                  <p className="text-xs">CLS</p>
                  <p className="text-[9px] text-gray-700">Meta: 0</p>
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.tbt_mobile_ms > 150 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.tbt_mobile_ms}ms</p>
                  <p className="text-xs">TBT</p>
                  <p className="text-[9px] text-gray-700">Meta: &lt;150ms</p>
                </div>
              </div>

              {/* Bundle + Cache */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.bundle_kb > 300 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.bundle_kb}kb</p>
                  <p className="text-xs">Bundle Total</p>
                  <p className="text-[9px] text-gray-700">Meta: &lt;300kb</p>
                  {resultado.metricas_performance_atuais.bundle_js_nao_usado_kb > 0 && (
                    <p className="text-[8px] text-red-600 mt-1">-{resultado.metricas_performance_atuais.bundle_js_nao_usado_kb}kb não usado</p>
                  )}
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.cache_economia_kb > 100 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.cache_economia_kb}kb</p>
                  <p className="text-xs">Cache TTL</p>
                  <p className="text-[9px] text-gray-700">Economia disponível</p>
                </div>
                <div className={`p-2 rounded text-center ${resultado.metricas_performance_atuais.long_tasks_count > 0 ? 'bg-red-200' : 'bg-green-200'}`}>
                  <p className="text-lg font-bold">{resultado.metricas_performance_atuais.long_tasks_count}</p>
                  <p className="text-xs">Long Tasks</p>
                  <p className="text-[9px] text-gray-700">Meta: 0</p>
                </div>
              </div>
            </div>
          )}

          {/* PAGESPEED GAPS CRÍTICOS */}
          {resultado.pagespeed_gaps_criticos?.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border-2 border-red-300">
              <p className="font-bold text-sm mb-3 text-red-700">🚨 PageSpeed Gaps Críticos (Impedem 100/100)</p>
              <div className="space-y-2">
                {resultado.pagespeed_gaps_criticos.map((gap, i) => (
                  <div key={i} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-red-800 uppercase">{gap.categoria}</span>
                        <p className="text-sm text-gray-900 mt-1">{gap.problema}</p>
                        <p className="text-xs text-green-700 mt-1">💡 {gap.solucao}</p>
                      </div>
                      <div className="text-right ml-3">
                        <span className="text-xs font-bold text-red-700">-{gap.impacto_score} pts</span>
                        {gap.economia_estimada && (
                          <p className="text-[10px] text-gray-600 mt-1">{gap.economia_estimada}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFORMIDADE BASE44 + CORE WEB VITALS */}
          {resultado.conformidade_base44 && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-sm text-blue-700">🎯 Conformidade Base44 + Core Web Vitals</p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  resultado.conformidade_base44.score_conformidade >= 80 ? 'bg-green-100 text-green-700' :
                  resultado.conformidade_base44.score_conformidade >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {resultado.conformidade_base44.score_conformidade}%
                </span>
              </div>

              {/* Core Web Vitals */}
              {resultado.conformidade_base44.core_web_vitals_compliance && (
                <div className="mb-3 p-3 bg-white rounded border">
                  <p className="text-xs font-bold text-gray-700 mb-2">⚡ Core Web Vitals (Google/Base44)</p>
                  <div className="flex gap-3">
                    <div className={`px-3 py-2 rounded text-center flex-1 ${
                      resultado.conformidade_base44.core_web_vitals_compliance.lcp_ok ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <p className="text-xs font-bold">LCP</p>
                      <p className="text-[10px] text-gray-600">&lt; 2.5s</p>
                      <p className="text-lg">{resultado.conformidade_base44.core_web_vitals_compliance.lcp_ok ? '✅' : '❌'}</p>
                    </div>
                    <div className={`px-3 py-2 rounded text-center flex-1 ${
                      resultado.conformidade_base44.core_web_vitals_compliance.cls_ok ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <p className="text-xs font-bold">CLS</p>
                      <p className="text-[10px] text-gray-600">&lt; 0.1</p>
                      <p className="text-lg">{resultado.conformidade_base44.core_web_vitals_compliance.cls_ok ? '✅' : '❌'}</p>
                    </div>
                    <div className={`px-3 py-2 rounded text-center flex-1 ${
                      resultado.conformidade_base44.core_web_vitals_compliance.inp_ok ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <p className="text-xs font-bold">INP</p>
                      <p className="text-[10px] text-gray-600">&lt; 200ms</p>
                      <p className="text-lg">{resultado.conformidade_base44.core_web_vitals_compliance.inp_ok ? '✅' : '❌'}</p>
                    </div>
                  </div>
                </div>
              )}
              {resultado.conformidade_base44.recursos_faltando?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-600">Recursos Base44 Faltando:</p>
                  {resultado.conformidade_base44.recursos_faltando.map((r, i) => (
                    <div key={i} className="text-xs text-blue-600">• {r}</div>
                  ))}
                </div>
              )}
              {resultado.conformidade_base44.otimizacoes_faltando?.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-bold text-blue-600">Otimizações Faltando:</p>
                  {resultado.conformidade_base44.otimizacoes_faltando.map((o, i) => (
                    <div key={i} className="text-xs text-blue-600">• {o}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SCORES COMPARATIVOS */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: resultado.score_atual < 50 ? '#fee2e2' : resultado.score_atual < 70 ? '#fef3c7' : '#dcfce7',
              borderColor: resultado.score_atual < 50 ? '#dc2626' : resultado.score_atual < 70 ? '#f59e0b' : '#22c55e'
            }}>
              <p className="text-3xl font-bold mb-1" style={{
                color: resultado.score_atual < 50 ? '#991b1b' : resultado.score_atual < 70 ? '#92400e' : '#166534'
              }}>
                {resultado.score_atual}%
              </p>
              <p className="text-xs font-bold">Score Atual</p>
            </div>

            <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-300">
              <p className="text-3xl font-bold text-blue-700 mb-1">{resultado.score_esperado}%</p>
              <p className="text-xs font-bold text-blue-600">Score Esperado</p>
              <p className="text-[10px] text-blue-500 mt-1">(com refatoramento)</p>
            </div>

            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: resultado.delta_score > 30 ? '#dcfce7' : resultado.delta_score > 15 ? '#fef3c7' : '#fee2e2',
              borderColor: resultado.delta_score > 30 ? '#22c55e' : resultado.delta_score > 15 ? '#f59e0b' : '#dc2626'
            }}>
              <div className="flex items-center gap-2 mb-1">
                {resultado.delta_score > 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                <p className="text-3xl font-bold" style={{
                  color: resultado.delta_score > 30 ? '#16a34a' : resultado.delta_score > 15 ? '#92400e' : '#991b1b'
                }}>
                  +{resultado.delta_score}%
                </p>
              </div>
              <p className="text-xs font-bold">Ganho Potencial</p>
            </div>
          </div>

          {/* RECOMENDAÇÃO */}
          <div className="p-6 rounded-xl border-2" style={{
            backgroundColor: getRecomendacaoColor(resultado.recomendacao).bg,
            borderColor: getRecomendacaoColor(resultado.recomendacao).border
          }}>
            <div className="flex items-start gap-3 mb-3">
              {resultado.recomendacao.startsWith('REFATORAR') ? (
                <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: getRecomendacaoColor(resultado.recomendacao).text }} />
              ) : (
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: getRecomendacaoColor(resultado.recomendacao).text }} />
              )}
              <div className="flex-1">
                <p className="font-bold text-xl mb-2" style={{ color: getRecomendacaoColor(resultado.recomendacao).text }}>
                  {resultado.recomendacao.replace(/_/g, ' ')}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: getRecomendacaoColor(resultado.recomendacao).text }}>
                  {resultado.justificativa_brutal}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold" style={{ color: getRecomendacaoColor(resultado.recomendacao).text }}>
                  {resultado.roi_score}%
                </p>
                <p className="text-xs font-bold opacity-70">ROI</p>
              </div>
            </div>
          </div>

          {/* GAPS ATUAIS */}
          {resultado.gaps_atuais?.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="font-bold text-sm mb-3 text-red-700">🚨 Gaps Críticos Atuais</p>
              <div className="space-y-2">
                {resultado.gaps_atuais.map((gap, i) => (
                  <div key={i} className={`p-3 rounded border ${
                    gap.severidade === 'critica' ? 'bg-red-100 border-red-300' :
                    gap.severidade === 'alta' ? 'bg-orange-100 border-orange-300' :
                    gap.severidade === 'media' ? 'bg-yellow-100 border-yellow-300' :
                    'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-xs uppercase">{gap.tipo}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        gap.severidade === 'critica' ? 'bg-red-200 text-red-800' :
                        gap.severidade === 'alta' ? 'bg-orange-200 text-orange-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {gap.severidade}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{gap.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROS vs CONTRAS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
                <p className="font-bold text-sm text-green-700">Pros do Refatoramento</p>
              </div>
              <ul className="space-y-1.5">
                {resultado.pros_refatoramento.map((pro, i) => (
                  <li key={i} className="text-sm text-green-600 flex items-start gap-1">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-700" />
                <p className="font-bold text-sm text-red-700">Contras do Refatoramento</p>
              </div>
              <ul className="space-y-1.5">
                {resultado.contras_refatoramento.map((contra, i) => (
                  <li key={i} className="text-sm text-red-600 flex items-start gap-1">
                    <span className="text-red-500 font-bold">✗</span>
                    <span>{contra}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CUSTO vs GANHO */}
          <div className="grid grid-cols-2 gap-4">
            {/* CUSTO */}
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-orange-700" />
                <p className="font-bold text-sm text-orange-700">Custo do Refatoramento</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">Horas Estimadas:</span>
                  <span className="text-xl font-bold text-orange-700">{resultado.custo_refatoramento.horas_estimadas}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">Risco de Bugs:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    resultado.custo_refatoramento.risco_introducao_bugs === 'alto' ? 'bg-red-200 text-red-800' :
                    resultado.custo_refatoramento.risco_introducao_bugs === 'medio' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {resultado.custo_refatoramento.risco_introducao_bugs}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-600">Complexidade:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    resultado.custo_refatoramento.complexidade === 'critica' ? 'bg-red-200 text-red-800' :
                    resultado.custo_refatoramento.complexidade === 'alta' ? 'bg-orange-200 text-orange-800' :
                    resultado.custo_refatoramento.complexidade === 'media' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {resultado.custo_refatoramento.complexidade}
                  </span>
                </div>
              </div>
            </div>

            {/* GANHO */}
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-green-700" />
                <p className="font-bold text-sm text-green-700">Ganhos Esperados</p>
              </div>
              <div className="space-y-2">
                {resultado.ganhos_esperados.reducao_latencia_ms > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Latência:</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.reducao_latencia_ms}ms</span>
                  </div>
                )}
                {resultado.ganhos_esperados.reducao_bundle_kb > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Bundle Size:</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.reducao_bundle_kb}kb</span>
                  </div>
                )}
                {resultado.ganhos_esperados.reducao_lcp_seconds > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">LCP (Base44):</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.reducao_lcp_seconds}s</span>
                  </div>
                )}
                {resultado.ganhos_esperados.melhoria_cls > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">CLS (Base44):</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.melhoria_cls}</span>
                  </div>
                )}
                {resultado.ganhos_esperados.ganho_seguranca > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Segurança:</span>
                    <span className="text-sm font-bold text-green-700">+{resultado.ganhos_esperados.ganho_seguranca}%</span>
                  </div>
                )}
                {resultado.ganhos_esperados.reducao_complexidade_percent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Complexidade:</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.reducao_complexidade_percent}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Manutenibilidade:</span>
                  <span className="text-sm font-bold text-green-700">+{resultado.ganhos_esperados.ganho_manutenibilidade}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Escalabilidade:</span>
                  <span className="text-sm font-bold text-green-700">+{resultado.ganhos_esperados.ganho_escalabilidade}%</span>
                </div>
                {resultado.ganhos_esperados.reducao_bugs_futuras_percent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Redução Bugs:</span>
                    <span className="text-sm font-bold text-green-700">-{resultado.ganhos_esperados.reducao_bugs_futuras_percent}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COMPONENTES REUTILIZÁVEIS (SCAN REAL) */}
          {resultado.componentes_reutilizaveis?.length > 0 && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-purple-700" />
                <p className="font-bold text-sm text-purple-700">♻️ Componentes Reutilizáveis (Identificados no Código Real)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resultado.componentes_reutilizaveis.map((comp, i) => (
                  <div key={i} className="p-3 bg-white rounded border border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-purple-900">{comp.componente}</p>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-bold">
                        Usado em {comp.usado_em_quantos_modulos}x módulos
                      </span>
                    </div>
                    <p className="text-xs text-purple-600 mb-1">{comp.ganho_reuso}</p>
                    <p className="text-[10px] text-purple-500">📍 {comp.localizacao_atual}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-3 italic">💡 Refatorar para reuso reduz bundle size e manutenção</p>
            </div>
          )}

          {/* TEMPLATE IDEAL DETALHADO */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="font-bold text-sm mb-3 text-blue-700">📋 Template Ideal Estruturado (Executável)</p>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Entities</p>
                <p className="text-2xl font-bold text-blue-700">{resultado.template_ideal.entities?.length || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Functions</p>
                <p className="text-2xl font-bold text-purple-700">{resultado.template_ideal.functions?.length || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Pages</p>
                <p className="text-2xl font-bold text-green-700">{resultado.template_ideal.pages?.length || 0}</p>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="text-xs text-gray-600 mb-1">Testes E2E</p>
                <p className="text-2xl font-bold text-orange-700">{resultado.template_ideal.testes_e2e?.length || 0}</p>
              </div>
            </div>

            {/* Entities Detail */}
            {resultado.template_ideal.entities?.length > 0 && (
              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs font-bold text-gray-700 mb-2">🗄️ Entities Necessárias:</p>
                <div className="space-y-1">
                  {resultado.template_ideal.entities.map((e, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold text-blue-700">{e.name}</span>
                      <span className="text-gray-600"> - {e.descricao}</span>
                      {e.indices_necessarios?.length > 0 && (
                        <div className="ml-3 text-[10px] text-gray-500">
                          Índices: {e.indices_necessarios.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Functions Detail */}
            {resultado.template_ideal.functions?.length > 0 && (
              <div className="mb-3 p-3 bg-white rounded border">
                <p className="text-xs font-bold text-gray-700 mb-2">⚡ Backend Functions:</p>
                <div className="space-y-2">
                  {resultado.template_ideal.functions.map((f, i) => (
                    <div key={i} className="text-xs p-2 bg-purple-50 rounded">
                      <span className="font-bold text-purple-700">{f.name}</span>
                      <p className="text-gray-600 mt-1">{f.descricao}</p>
                      {f.integracao_externa && (
                        <p className="text-[10px] text-purple-600 mt-1">🔌 Integração: {f.integracao_externa}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Targets (PageSpeed 100/100) */}
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-xs font-bold text-gray-700 mb-2">🎯 Contrato PageSpeed 100/100 (Mobile + Desktop)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">LCP Mobile:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.lcp_mobile_segundos || 2.5}s</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">LCP Desktop:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.lcp_desktop_segundos || 1.3}s</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">FCP Mobile:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.fcp_mobile_segundos || 1.8}s</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">CLS:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.cls_score || 0.01}</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">TBT:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.tbt_ms || 150}ms</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bundle:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.bundle_js_kb || 300}kb</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cache TTL:</span>
                    <span className="font-bold text-blue-700">{Math.round((resultado.template_ideal.performance_targets?.cache_ttl_segundos || 31536000) / 86400)}d</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">DOM:</span>
                    <span className="font-bold text-blue-700">&lt; {resultado.template_ideal.performance_targets?.dom_max_nodes || 1500}</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Long Tasks:</span>
                    <span className="font-bold text-blue-700">{resultado.template_ideal.performance_targets?.long_tasks_max || 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-gray-500 mt-2 italic">📱 Baseado em: PageSpeed Mobile 59/100, Desktop 89/100 → Meta 100/100</p>
            </div>

            {/* Recursos Base44 + PageSpeed 100/100 (45+ critérios) */}
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-xs font-bold text-gray-700 mb-2">🎨 Checklist PageSpeed 100/100 (45 critérios técnicos)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                {Object.entries(resultado.template_ideal.recursos_base44 || {}).map(([key, value]) => (
                  <div 
                    key={key} 
                    className={`px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                      value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {value ? '✅' : '❌'}
                    <span className="truncate">{key.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-blue-50 rounded text-[9px] text-blue-700">
                <strong>Contrato Mínimo:</strong> Cache 1 ano, Preconnect origens, CSS crítico inline, Code splitting, Lazy load, 
                Zero unused code, Touch ≥44px, Contraste 4.5:1, ARIA completo, CSP+HSTS+COOP, Sourcemaps
              </div>
              <p className="text-[9px] text-gray-500 mt-1 italic">
                📚 Base44 Docs + PageSpeed Insights (Mobile 59→100, Desktop 89→100)
              </p>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="flex gap-3">
            {resultado.recomendacao.startsWith('REFATORAR') && (
              <Button 
                onClick={aplicarRefatoramento}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Aplicar Template Ideal
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(resultado.template_ideal, null, 2));
                toast.success('Template copiado para clipboard');
              }}
              className="flex-1"
            >
              <Code className="w-4 h-4 mr-2" />
              Copiar Template JSON
            </Button>
          </div>
        </div>
      )}

      {!resultado && (
        <div className="pc-card p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">Clique em "Analisar Refatoramento" para decisão estratégica</p>
          <p className="text-xs text-gray-500">Compara estado atual vs ideal com ROI calculado</p>
        </div>
      )}
    </div>
  );
}