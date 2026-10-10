import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield, Pill, Loader2 } from "lucide-react";

export default function AnaliseInteracoes({ medicamentos, historicoPaciente, onAlerta }) {
  const [analisando, setAnalisando] = useState(false);
  const [analise, setAnalise] = useState(null);

  const analisarInteracoes = async () => {
    if (!medicamentos || medicamentos.length === 0) {
      alert("Adicione medicamentos para análise");
      return;
    }

    setAnalisando(true);
    try {
      const prompt = `Você é um farmacêutico clínico especializado. Analise as seguintes informações:

MEDICAMENTOS PRESCRITOS:
${medicamentos.map(m => `- ${m.medicamento} (${m.dosagem}) - ${m.via_administracao || "via oral"}`).join("\n")}

HISTÓRICO DO PACIENTE:
${historicoPaciente || "Não informado"}

Forneça análise detalhada sobre:
1. Interações medicamentosas (descreva cada interação identificada, gravidade e mecanismo)
2. Contraindicações absolutas ou relativas
3. Ajustes de dose necessários
4. Alertas sobre uso concomitante
5. Recomendações de monitoramento
6. Nível de risco geral (baixo/moderado/alto/crítico)`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            interacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medicamentos_envolvidos: { type: "array", items: { type: "string" } },
                  tipo_interacao: { type: "string" },
                  gravidade: { type: "string" },
                  mecanismo: { type: "string" },
                  efeitos_possiveis: { type: "string" },
                  recomendacao: { type: "string" }
                }
              }
            },
            contraindicacoes: { type: "array", items: { type: "string" } },
            ajustes_dose: { type: "array", items: { type: "string" } },
            monitoramento: { type: "array", items: { type: "string" } },
            nivel_risco: { type: "string" }
          }
        }
      });

      setAnalise(resultado);
      if (onAlerta && resultado.nivel_risco === "alto") {
        onAlerta(resultado);
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      alert("Erro ao analisar interações");
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-orange-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-orange-900 mb-1">Análise de Segurança Medicamentosa</h3>
            <p className="text-sm text-orange-800">
              IA verifica interações medicamentosas, contraindicações e riscos potenciais
            </p>
          </div>
        </div>
      </div>

      {!analise ? (
        <button
          onClick={analisarInteracoes}
          disabled={analisando}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {analisando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Pill className="w-5 h-5" />
              Analisar Interações e Riscos
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Nível de Risco Geral */}
          <div className={`rounded-lg p-4 border-2 ${
            analise.nivel_risco === "crítico" || analise.nivel_risco === "alto" ? "bg-red-50 border-red-500" :
            analise.nivel_risco === "moderado" ? "bg-yellow-50 border-yellow-500" :
            "bg-green-50 border-green-500"
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-6 h-6 ${
                analise.nivel_risco === "crítico" || analise.nivel_risco === "alto" ? "text-red-600" :
                analise.nivel_risco === "moderado" ? "text-yellow-600" :
                "text-green-600"
              }`} />
              <div>
                <p className="font-bold text-lg">Nível de Risco: <span className="capitalize">{analise.nivel_risco}</span></p>
              </div>
            </div>
          </div>

          {/* Interações */}
          {analise.interacoes?.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-bold text-gray-800 mb-3">Interações Medicamentosas Identificadas</h4>
              <div className="space-y-3">
                {analise.interacoes.map((interacao, idx) => (
                  <div key={idx} className={`rounded-lg p-3 border ${
                    interacao.gravidade === "grave" || interacao.gravidade === "severa" ? "bg-red-50 border-red-200" :
                    interacao.gravidade === "moderada" ? "bg-yellow-50 border-yellow-200" :
                    "bg-blue-50 border-blue-200"
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm">
                          {interacao.medicamentos_envolvidos?.join(" + ")}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{interacao.tipo_interacao}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        interacao.gravidade === "grave" || interacao.gravidade === "severa" ? "bg-red-600 text-white" :
                        interacao.gravidade === "moderada" ? "bg-yellow-600 text-white" :
                        "bg-blue-600 text-white"
                      }`}>
                        {interacao.gravidade}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Mecanismo:</strong> {interacao.mecanismo}
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Efeitos Possíveis:</strong> {interacao.efeitos_possiveis}
                    </p>
                    <div className="bg-white rounded p-2 mt-2">
                      <p className="text-sm">
                        <strong>✓ Recomendação:</strong> {interacao.recomendacao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contraindicações */}
          {analise.contraindicacoes?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h4 className="font-bold text-red-900 mb-2">⚠️ Contraindicações</h4>
              <ul className="space-y-1">
                {analise.contraindicacoes.map((contra, idx) => (
                  <li key={idx} className="text-sm text-red-800">{contra}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ajustes de Dose */}
          {analise.ajustes_dose?.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">Ajustes de Dose Recomendados</h4>
              <ul className="space-y-1">
                {analise.ajustes_dose.map((ajuste, idx) => (
                  <li key={idx} className="text-sm text-blue-800">{ajuste}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Monitoramento */}
          {analise.monitoramento?.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-bold text-purple-900 mb-2">Monitoramento Necessário</h4>
              <ul className="space-y-1">
                {analise.monitoramento.map((monitor, idx) => (
                  <li key={idx} className="text-sm text-purple-800">{monitor}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setAnalise(null)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg"
          >
            Nova Análise
          </button>
        </div>
      )}
    </div>
  );
}