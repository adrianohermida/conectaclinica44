import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Package, AlertTriangle, Calendar, Sparkles } from "lucide-react";
import { format, addDays } from "date-fns";

export default function PrevisaoDemandaIA({ medicamentos, movimentacoes, onPrevisaoGerada }) {
  const [gerando, setGerando] = useState(false);
  const [previsao, setPrevisao] = useState(null);

  const gerarPrevisao = async () => {
    setGerando(true);
    try {
      const dadosHistoricos = medicamentos.map(med => {
        const movs = movimentacoes?.filter(m => m.medicamento === med.nome) || [];
        const vendasUltimos30Dias = movs
          .filter(m => m.tipo === "saida" && 
            new Date(m.data_movimentacao) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((acc, m) => acc + m.quantidade, 0);

        return {
          nome: med.nome,
          estoque_atual: med.quantidade_estoque,
          estoque_minimo: med.estoque_minimo,
          vendas_mes: vendasUltimos30Dias,
          categoria: med.categoria
        };
      });

      const prompt = `Como especialista em gestão de estoque farmacêutico, analise os seguintes dados e gere uma previsão de demanda:

Dados do estoque:
${JSON.stringify(dadosHistoricos, null, 2)}

Para cada medicamento, forneça:
1. Previsão de consumo para os próximos 30 dias
2. Data estimada de ruptura de estoque
3. Quantidade sugerida para compra
4. Nível de urgência (baixo/médio/alto/crítico)
5. Recomendações específicas

Considere:
- Sazonalidade
- Tendências de consumo
- Estoque de segurança
- Prazo de entrega de fornecedores (7-15 dias)`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            previsoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medicamento: { type: "string" },
                  consumo_previsto_30d: { type: "number" },
                  data_ruptura_estimada: { type: "string" },
                  quantidade_comprar: { type: "number" },
                  urgencia: { type: "string" },
                  recomendacao: { type: "string" }
                }
              }
            },
            alertas_criticos: {
              type: "array",
              items: { type: "string" }
            },
            sugestoes_gerais: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setPrevisao(resultado);
      if (onPrevisaoGerada) onPrevisaoGerada(resultado);
    } catch (error) {
      console.error("Erro ao gerar previsão:", error);
      alert("Erro ao gerar previsão de demanda");
    } finally {
      setGerando(false);
    }
  };

  const getCorUrgencia = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
      case "crítico":
      case "critico":
        return "bg-red-100 text-red-800 border-red-300";
      case "alto":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "médio":
      case "medio":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-purple-900 mb-1">🤖 Previsão de Demanda com IA</h3>
            <p className="text-sm text-purple-800">
              Análise preditiva baseada em histórico de consumo, sazonalidade e tendências
            </p>
          </div>
        </div>
      </div>

      {!previsao ? (
        <button
          onClick={gerarPrevisao}
          disabled={gerando}
          className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {gerando ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analisando dados...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Gerar Previsão de Demanda
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Alertas Críticos */}
          {previsao.alertas_criticos?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas Críticos
              </h4>
              <ul className="space-y-1">
                {previsao.alertas_criticos.map((alerta, idx) => (
                  <li key={idx} className="text-sm text-red-800">• {alerta}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Previsões por Medicamento */}
          <div className="space-y-3">
            <h4 className="font-bold text-gray-800">Previsões Individuais</h4>
            {previsao.previsoes?.map((prev, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-800">{prev.medicamento}</h5>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Consumo previsto:</span>
                        <p className="font-medium text-gray-800">{prev.consumo_previsto_30d} unidades/mês</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Ruptura estimada:</span>
                        <p className="font-medium text-gray-800">
                          {prev.data_ruptura_estimada ? format(new Date(prev.data_ruptura_estimada), "dd/MM/yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCorUrgencia(prev.urgencia)}`}>
                    {prev.urgencia}
                  </span>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Recomendação de Compra</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{prev.quantidade_comprar} unidades</p>
                  <p className="text-xs text-blue-700 mt-1">{prev.recomendacao}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sugestões Gerais */}
          {previsao.sugestoes_gerais?.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Sugestões de Otimização
              </h4>
              <ul className="space-y-1">
                {previsao.sugestoes_gerais.map((sug, idx) => (
                  <li key={idx} className="text-sm text-green-800">• {sug}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={gerarPrevisao}
            disabled={gerando}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg"
          >
            Atualizar Previsão
          </button>
        </div>
      )}
    </div>
  );
}