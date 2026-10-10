import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pill, Sparkles, Loader2, Eye, AlertTriangle } from "lucide-react";

export default function PrescricaoIA({ diagnostico, sintomas, historico, onPrescricaoGerada }) {
  const [gerando, setGerando] = useState(false);
  const [prescricao, setPrescricao] = useState(null);

  const gerarPrescricao = async () => {
    if (!diagnostico) {
      alert("Informe o diagnóstico primeiro");
      return;
    }

    setGerando(true);
    try {
      const prompt = `Você é um médico experiente. Com base nas informações abaixo, sugira uma prescrição inicial para revisão:

DIAGNÓSTICO: ${diagnostico}
SINTOMAS: ${sintomas || "Não informado"}
HISTÓRICO: ${historico || "Não informado"}

Forneça uma prescrição CONSERVADORA e SEGURA com:
1. Medicamentos (nome genérico, dose, via, frequência, duração)
2. Justificativa para cada medicamento
3. Orientações ao paciente
4. Sinais de alerta para retorno imediato
5. Duração estimada do tratamento

IMPORTANTE: Prescrição conservadora, preferir medicamentos de primeira linha e doses iniciais seguras.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            medicamentos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medicamento: { type: "string" },
                  dosagem: { type: "string" },
                  via_administracao: { type: "string" },
                  frequencia: { type: "string" },
                  duracao: { type: "string" },
                  justificativa: { type: "string" }
                }
              }
            },
            orientacoes: { type: "array", items: { type: "string" } },
            sinais_alerta: { type: "array", items: { type: "string" } },
            duracao_tratamento: { type: "string" },
            observacoes: { type: "string" }
          }
        }
      });

      setPrescricao(resultado);
      if (onPrescricaoGerada) onPrescricaoGerada(resultado);
    } catch (error) {
      console.error("Erro ao gerar prescrição:", error);
      alert("Erro ao gerar prescrição");
    } finally {
      setGerando(false);
    }
  };

  const aplicarPrescricao = () => {
    if (onPrescricaoGerada) {
      onPrescricaoGerada(prescricao);
    }
    alert("✅ Prescrição aplicada! Revise e ajuste conforme necessário.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--pc-secondary-50)] rounded-xl p-4 border border-[var(--pc-secondary-200)]">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-[var(--pc-secondary-600)] flex-shrink-0" />
          <div>
            <h3 className="pc-heading-4 text-[var(--pc-secondary-900)] mb-1">Prescrição Assistida por IA</h3>
            <p className="pc-body-sm text-[var(--pc-secondary-800)]">
              A IA sugere uma prescrição inicial conservadora para condições comuns, sempre requer revisão médica
            </p>
          </div>
        </div>
      </div>

      {!prescricao ? (
        <button
          onClick={gerarPrescricao}
          disabled={gerando || !diagnostico}
          className="pc-btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {gerando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando prescrição...
            </>
          ) : (
            <>
              <Pill className="w-5 h-5" />
              Gerar Prescrição Inicial
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--pc-warning-50)] rounded-xl p-3 border border-[var(--pc-warning-200)]">
            <p className="pc-caption text-[var(--pc-warning-900)]">
              ⚠️ <strong>ATENÇÃO:</strong> Esta é uma sugestão da IA. SEMPRE revise, ajuste doses e confirme adequação ao paciente.
            </p>
          </div>

          {/* Medicamentos */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-bold text-gray-800 mb-3">💊 Medicamentos Sugeridos</h4>
            <div className="space-y-3">
              {prescricao.medicamentos?.map((med, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="font-bold text-gray-800">{med.medicamento}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <p className="text-gray-700"><strong>Dose:</strong> {med.dosagem}</p>
                    <p className="text-gray-700"><strong>Via:</strong> {med.via_administracao}</p>
                    <p className="text-gray-700"><strong>Frequência:</strong> {med.frequencia}</p>
                    <p className="text-gray-700"><strong>Duração:</strong> {med.duracao}</p>
                  </div>
                  <div className="mt-2 bg-blue-50 rounded p-2">
                    <p className="text-xs text-blue-800">
                      <strong>Justificativa:</strong> {med.justificativa}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orientações */}
          {prescricao.orientacoes?.length > 0 && (
            <div className="bg-[var(--pc-success-50)] rounded-xl p-4 border border-[var(--pc-success-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-success-900)] mb-2">📝 Orientações ao Paciente</h4>
              <ul className="space-y-1">
                {prescricao.orientacoes.map((orient, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-success-800)]">• {orient}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sinais de Alerta */}
          {prescricao.sinais_alerta?.length > 0 && (
            <div className="bg-[var(--pc-error-50)] rounded-xl p-4 border border-[var(--pc-error-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-error-900)] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Sinais de Alerta - Retornar Imediatamente
              </h4>
              <ul className="space-y-1">
                {prescricao.sinais_alerta.map((sinal, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-error-800)]">• {sinal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Duração do Tratamento */}
          <div className="pc-card p-3">
            <p className="pc-body-sm">
              <strong>⏱️ Duração Estimada:</strong> {prescricao.duracao_tratamento}
            </p>
            {prescricao.observacoes && (
              <p className="pc-body-sm mt-2 text-[var(--pc-text-secondary)]">{prescricao.observacoes}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={aplicarPrescricao}
              className="flex-1 bg-[var(--pc-success)] hover:bg-[var(--pc-success-600)] text-white font-medium py-3 rounded-xl pc-transition"
            >
              Aplicar e Revisar
            </button>
            <button
              onClick={() => setPrescricao(null)}
              className="pc-btn-secondary flex-1 py-2"
            >
              Gerar Novamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}