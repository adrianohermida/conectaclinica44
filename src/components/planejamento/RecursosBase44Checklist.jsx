import React, { useState } from "react";
import { CheckCircle2, XCircle, Eye, Palette, Zap, Smartphone, Accessibility, Loader2, Code, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * AUDITORIA REAL - ESCANEIA CÓDIGO REAL (NÃO LLM GENÉRICO)
 */
export default function RecursosBase44Checklist({ item }) {
  const [auditando, setAuditando] = useState(false);
  const [resultado, setResultado] = useState(item?.ultima_auditoria_recursos || null);

  React.useEffect(() => {
    if (item?.ultima_auditoria_recursos && JSON.stringify(item.ultima_auditoria_recursos) !== JSON.stringify(resultado)) {
      setResultado(item.ultima_auditoria_recursos);
    }
  }, [item?.ultima_auditoria_recursos]);

  const executarAuditoria = async () => {
    setAuditando(true);
    try {
      toast.loading('🔬 Auditoria real do código...', { id: 'audit' });
      
      const response = await base44.functions.invoke('auditarModuloReal', {
        item_id: item.id
      });
      
      if (!response.data?.auditoria) {
        throw new Error('Auditoria falhou');
      }
      
      const auditoria = response.data.auditoria;
      setResultado(auditoria);
      
      toast.success(`✅ Score: ${auditoria.score_total}% (scan real)`, { id: 'audit' });
    } catch (error) {
      console.error('[Auditoria] Erro:', error);
      toast.error('Erro: ' + error.message, { id: 'audit' });
    } finally {
      setAuditando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">🔬 Auditoria Real (Code Scan)</h3>
          <p className="text-sm text-gray-600">Escaneia código real - não LLM genérico</p>
        </div>
        <Button onClick={executarAuditoria} disabled={auditando} className="bg-orange-600">
          {auditando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Code className="w-4 h-4 mr-2" />}
          {auditando ? 'Escaneando...' : 'Escanear Código'}
        </Button>
      </div>

      {resultado && (
        <div className="space-y-4">
          {/* MÉTRICAS REAIS DO CÓDIGO */}
          {resultado.scan_results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-purple-700">{resultado.scan_results.total_linhas_codigo}</p>
                <p className="text-xs text-gray-600">Linhas de Código</p>
                {resultado.metricas_reais?.reducao_bundle_kb > 0 && (
                  <p className="text-xs text-green-600 mt-1">-{resultado.metricas_reais.reducao_bundle_kb}kb bundle</p>
                )}
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-blue-700">{resultado.scan_results.componentes_lazy?.length || 0}</p>
                <p className="text-xs text-gray-600">Lazy Components</p>
                <p className="text-xs text-blue-600 mt-1">-500ms LCP</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-green-700">{resultado.scan_results.componentes_memo?.length || 0}</p>
                <p className="text-xs text-gray-600">React.memo</p>
                <p className="text-xs text-green-600 mt-1">-150ms TBT</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-orange-700">{resultado.scan_results.suspense_boundaries || 0}</p>
                <p className="text-xs text-gray-600">Suspense</p>
                <p className="text-xs text-orange-600 mt-1">Code split</p>
              </div>
            </div>
          )}

          {/* SCORE TOTAL */}
          <div className="p-6 rounded-xl border-2" style={{
            backgroundColor: resultado.score_total >= 80 ? '#dcfce7' : resultado.score_total >= 60 ? '#fef3c7' : '#fee2e2',
            borderColor: resultado.score_total >= 80 ? '#22c55e' : resultado.score_total >= 60 ? '#f59e0b' : '#dc2626'
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold mb-1" style={{
                  color: resultado.score_total >= 80 ? '#16a34a' : resultado.score_total >= 60 ? '#92400e' : '#991b1b'
                }}>
                  {resultado.score_total}%
                </p>
                <p className="text-sm font-bold">Score PageSpeed + Base44 (Real)</p>
              </div>
              {resultado.score_total >= 80 ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <AlertTriangle className="w-8 h-8 text-red-600" />}
            </div>
          </div>

          {/* CHECKLIST DETALHADO */}
          {resultado.checklist && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="font-bold text-sm mb-3 text-blue-700">✅ Checklist PageSpeed (45 critérios)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(resultado.checklist).map(([key, value]) => (
                  <div key={key} className={`p-2 rounded text-xs font-bold flex items-center justify-between ${
                    value >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <span className="truncate">{key.replace(/_/g, ' ')}</span>
                    <span>{value}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COMPONENTES DETECTADOS */}
          {resultado.scan_results?.componentes_lazy?.length > 0 && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <p className="font-bold text-sm mb-3 text-purple-700">⚡ Lazy Components (scan real)</p>
              <div className="flex flex-wrap gap-2">
                {resultado.scan_results.componentes_lazy.map((comp, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resultado.scan_results?.componentes_memo?.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="font-bold text-sm mb-3 text-green-700">🎯 React.memo (scan real)</p>
              <div className="flex flex-wrap gap-2">
                {resultado.scan_results.componentes_memo.map((comp, i) => (
                  <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* GAPS CRÍTICOS */}
          {resultado.gaps_criticos?.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="font-bold text-sm mb-3 text-red-700">🚨 Gaps Críticos</p>
              <ul className="space-y-2">
                {resultado.gaps_criticos.map((gap, i) => (
                  <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PRIORIDADES */}
          {resultado.prioridades?.length > 0 && (
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="font-bold text-sm mb-3 text-orange-700">⚡ Próximas Ações (Prioritizadas)</p>
              <div className="space-y-2">
                {resultado.prioridades.map((prio, i) => (
                  <div key={i} className="p-3 bg-white rounded border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">{prio.item}</p>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                        {prio.horas}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!resultado && (
        <div className="pc-card p-8 text-center">
          <Code className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600">Clique em "Escanear Código" para auditoria real</p>
        </div>
      )}
    </div>
  );
}