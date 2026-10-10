import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Code, Database, FileCode, Zap, Brain } from "lucide-react";
import { toast } from "sonner";

/**
 * CHECKLIST TÉCNICO REAL - VALIDAÇÃO DE CODEBASE
 * 
 * Mostra O QUE EXISTE vs O QUE FALTA no código real
 */
export default function ChecklistTecnico({ item }) {
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState(item?.ultimo_scan_codebase || null);

  React.useEffect(() => {
    if (item?.ultimo_scan_codebase && JSON.stringify(item.ultimo_scan_codebase) !== JSON.stringify(resultado)) {
      setResultado(item.ultimo_scan_codebase);
    }
  }, [item?.ultimo_scan_codebase]);

  const escanearCodigo = async () => {
    setValidando(true);
    try {
      toast.loading('Validando evidências...', { id: 'scan' });
      const response = await base44.functions.invoke('escanearCodebase', {
        item_id: item.id
      });
      
      if (!response.data) {
        throw new Error('Resposta vazia do servidor');
      }
      
      setResultado(response.data);
      
      // SALVAR NO ITEM (memória)
      const historicoAnalises = item.historico_analises || [];
      historicoAnalises.push({
        timestamp: new Date().toISOString(),
        tipo: 'scan_codebase',
        resultado: {
          score_real: response.data.score_real,
          evidencias_validadas: response.data.evidencias_validadas,
          total_evidencias: response.data.total_evidencias,
          gap_score: response.data.gap_score
        }
      });
      
      await base44.entities.ChecklistProjeto.update(item.id, {
        historico_analises: historicoAnalises,
        ultimo_scan_codebase: response.data,
        score_checklist: response.data.score_real
      });
      
      toast.success(`Validado: ${response.data.evidencias_validadas}/${response.data.total_evidencias} evidências`, { id: 'scan' });
    } catch (error) {
      console.error('[ChecklistTecnico] Erro completo:', error);
      toast.error('Erro: ' + (error.response?.data?.error || error.message), { id: 'scan' });
    } finally {
      setValidando(false);
    }
  };

  const getIconPorTipo = (tipo) => {
    switch (tipo) {
      case 'entity': return <Database className="w-4 h-4" />;
      case 'function': return <Zap className="w-4 h-4" />;
      case 'page': return <FileCode className="w-4 h-4" />;
      case 'component': return <Code className="w-4 h-4" />;
      case 'agent': return <Brain className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg mb-1">🔍 Checklist Técnico Real</h3>
          <p className="text-sm text-gray-600">Validação automática contra codebase</p>
        </div>
        <Button onClick={escanearCodigo} disabled={validando} className="bg-blue-600">
          {validando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Code className="w-4 h-4 mr-2" />}
          {validando ? 'Escaneando...' : 'Escanear Código'}
        </Button>
      </div>

      {resultado && (
        <div className="space-y-4">
          {/* SCORE REAL */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: resultado.score_real >= 80 ? '#dcfce7' : resultado.score_real >= 50 ? '#fef3c7' : '#fee2e2',
              borderColor: resultado.score_real >= 80 ? '#34a853' : resultado.score_real >= 50 ? '#f9ab00' : '#ea4335'
            }}>
              <p className="text-3xl font-bold mb-1" style={{
                color: resultado.score_real >= 80 ? '#16a34a' : resultado.score_real >= 50 ? '#92400e' : '#991b1b'
              }}>
                {resultado.score_real}%
              </p>
              <p className="text-xs font-bold">Score Real (Código)</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-300">
              <p className="text-3xl font-bold text-gray-900 mb-1">{resultado.evidencias_validadas}/{resultado.total_evidencias}</p>
              <p className="text-xs text-gray-600">Evidências Validadas</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-3xl font-bold text-orange-700 mb-1">{resultado.estimativa_total_horas}h</p>
              <p className="text-xs text-orange-600">Estimativa Restante</p>
            </div>
          </div>

          {/* RECOMENDAÇÃO */}
          <div className={`p-4 rounded-lg border-2 ${
            resultado.score_real >= 80 ? 'bg-green-50 border-green-300' : 
            resultado.score_real >= 50 ? 'bg-yellow-50 border-yellow-300' : 
            'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {resultado.score_real >= 80 ? <CheckCircle2 className="w-5 h-5 text-green-700" /> : 
               resultado.score_real >= 50 ? <AlertTriangle className="w-5 h-5 text-yellow-700" /> :
               <XCircle className="w-5 h-5 text-red-700" />}
              <p className="font-bold text-sm">{resultado.recomendacao}</p>
            </div>
            {resultado.gap_score !== 0 && (
              <p className="text-xs text-gray-700">
                Gap: Score declarado ({resultado.score_declarado}%) vs Real ({resultado.score_real}%) = {Math.abs(resultado.gap_score)}% de diferença
              </p>
            )}
          </div>

          {/* VALIDAÇÃO DETALHADA */}
          <div>
            <h4 className="font-bold text-sm mb-3">📋 Validação Detalhada</h4>
            <div className="space-y-2">
              {Object.entries(resultado.validacao_detalhada).map(([tipo, items]) => 
                items.length > 0 && (
                  <div key={tipo}>
                    <p className="text-xs font-bold text-gray-700 mb-2 uppercase">{tipo}</p>
                    <div className="space-y-1">
                      {items.map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-2 rounded text-xs font-mono ${
                          item.existe ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {item.existe ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {getIconPorTipo(item.tipo)}
                          <span className="flex-1">{item.path}</span>
                          <span className="font-bold">{item.existe ? 'OK' : 'FALTANDO'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* PRÓXIMOS PASSOS */}
          {resultado.proximos_passos.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-3">⚡ Próximos Passos (Prioritizados)</h4>
              <div className="space-y-2">
                {resultado.proximos_passos.map((passo, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    passo.prioridade === 'critica' ? 'bg-red-50 border-red-300' :
                    passo.prioridade === 'alta' ? 'bg-orange-50 border-orange-300' :
                    'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm">{passo.acao}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        passo.prioridade === 'critica' ? 'bg-red-100 text-red-700' :
                        passo.prioridade === 'alta' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {passo.prioridade.toUpperCase()} • {passo.estimativa_horas}h
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {passo.detalhes.slice(0, 5).map((detalhe, i) => (
                        <li key={i} className="text-xs font-mono text-gray-700 flex items-start gap-1">
                          <span className="text-gray-500">→</span>
                          <span>{detalhe}</span>
                        </li>
                      ))}
                      {passo.detalhes.length > 5 && (
                        <li className="text-xs text-gray-500 italic">+ {passo.detalhes.length - 5} itens...</li>
                      )}
                    </ul>
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
          <p className="text-sm text-gray-600">Clique em "Escanear Código" para validar evidências reais</p>
        </div>
      )}
    </div>
  );
}