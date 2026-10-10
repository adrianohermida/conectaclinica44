import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, AlertTriangle, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

export default function NotificacaoInteligente({ certidao }) {
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [tipoAnalise, setTipoAnalise] = useState(null);

  const gerarAnalise = async (tipo) => {
    setAnalisando(true);
    setTipoAnalise(tipo);
    try {
      const response = await base44.functions.invoke('gerarNotificacaoInteligente', {
        certidao_id: certidao.id,
        tipo_analise: tipo
      });

      if (response.data.success) {
        setAnalise(response.data.analise);
      } else {
        alert('Erro ao gerar análise: ' + response.data.error);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setAnalisando(false);
    }
  };

  const diasRestantes = differenceInDays(new Date(certidao.data_validade), new Date());

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start gap-3 mb-3">
          <Brain className="w-6 h-6 text-purple-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-purple-900">Análise Inteligente com IA</h3>
            <p className="text-sm text-purple-700">
              Use IA para obter insights e recomendações personalizadas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => gerarAnalise('prever_vencimento')}
            disabled={analisando}
            variant="outline"
            size="sm"
            className="border-purple-300"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Prever Renovação
          </Button>
          <Button
            onClick={() => gerarAnalise('analise_risco')}
            disabled={analisando}
            variant="outline"
            size="sm"
            className="border-purple-300"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Análise de Risco
          </Button>
          {certidao.observacoes && (
            <Button
              onClick={() => gerarAnalise('resumir_observacoes')}
              disabled={analisando}
              variant="outline"
              size="sm"
              className="border-purple-300"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Resumir Observações
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {analisando && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          <p className="text-gray-600">Analisando com IA...</p>
        </div>
      )}

      {/* Resultado da Análise */}
      {!analisando && analise && (
        <div className="bg-white rounded-lg border border-purple-200 p-6 space-y-4">
          {tipoAnalise === 'prever_vencimento' && (
            <>
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Previsão de Renovação</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <strong>Iniciar processo em:</strong> {analise.dias_recomendados_antecedencia} dias antes do vencimento
                    </p>
                    <p className="text-gray-700">
                      <strong>Complexidade:</strong>{' '}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        analise.nivel_complexidade === 'baixa' ? 'bg-green-100 text-green-700' :
                        analise.nivel_complexidade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {analise.nivel_complexidade?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-900 font-medium mb-2">💡 Recomendação:</p>
                <p className="text-sm text-purple-800">{analise.recomendacao}</p>
              </div>

              {analise.acoes_sugeridas && analise.acoes_sugeridas.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Ações Sugeridas:</p>
                  <ul className="space-y-1">
                    {analise.acoes_sugeridas.map((acao, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {acao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tipoAnalise === 'analise_risco' && (
            <>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${
                  analise.nivel_risco === 'critico' ? 'text-red-600' :
                  analise.nivel_risco === 'alto' ? 'text-orange-600' :
                  analise.nivel_risco === 'medio' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Análise de Risco</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <strong>Nível de Risco:</strong>{' '}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        analise.nivel_risco === 'critico' ? 'bg-red-100 text-red-700' :
                        analise.nivel_risco === 'alto' ? 'bg-orange-100 text-orange-700' :
                        analise.nivel_risco === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {analise.nivel_risco?.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-gray-700"><strong>Impacto:</strong> {analise.impacto}</p>
                    <p className="text-gray-700"><strong>Urgência:</strong> {analise.urgencia}</p>
                    {analise.prazo_acao && (
                      <p className="text-gray-700"><strong>Prazo para ação:</strong> {analise.prazo_acao} dias</p>
                    )}
                  </div>
                </div>
              </div>

              {analise.recomendacoes && analise.recomendacoes.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-900 mb-2">⚠️ Recomendações:</p>
                  <ul className="space-y-1">
                    {analise.recomendacoes.map((rec, idx) => (
                      <li key={idx} className="text-sm text-orange-800">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tipoAnalise === 'resumir_observacoes' && (
            <>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Resumo Inteligente</h4>
                  <p className="text-sm text-gray-700">{analise.resumo}</p>
                </div>
              </div>

              {analise.pontos_criticos && analise.pontos_criticos.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900 mb-2">🔴 Pontos Críticos:</p>
                  <ul className="space-y-1">
                    {analise.pontos_criticos.map((ponto, idx) => (
                      <li key={idx} className="text-sm text-red-800">• {ponto}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analise.alertas && analise.alertas.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2">⚠️ Alertas:</p>
                  <ul className="space-y-1">
                    {analise.alertas.map((alerta, idx) => (
                      <li key={idx} className="text-sm text-yellow-800">• {alerta}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analise.proximos_passos && analise.proximos_passos.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">📋 Próximos Passos:</p>
                  <ul className="space-y-1">
                    {analise.proximos_passos.map((passo, idx) => (
                      <li key={idx} className="text-sm text-blue-800">• {passo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}