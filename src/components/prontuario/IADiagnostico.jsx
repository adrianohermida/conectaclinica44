import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeIAComCache } from "../services/iaCache";
import { Brain, Lightbulb, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function IADiagnostico({ sintomas, historicoPaciente, onSugestao, pacienteId }) {
  const [gerando, setGerando] = useState(false);
  const [sugestoes, setSugestoes] = useState(null);

  const gerarDiagnosticoDiferencial = async () => {
    setGerando(true);
    try {
      // CRITICAL: Buscar prontuários anteriores do paciente via backend (RBAC safe)
      let prontuariosAnteriores = "";
      if (pacienteId) {
        try {
          const response = await base44.functions.invoke('buscarProntuariosSemanticoIA', {
            paciente_id: pacienteId,
            limit: 5
          });
          
          if (response.data?.prontuarios && response.data.prontuarios.length > 0) {
            prontuariosAnteriores = response.data.prontuarios
              .map(p => `[${p.data_atendimento}] Diagnóstico: ${p.hipotese_diagnostica} | Conduta: ${p.conduta}`)
              .join('\n');
          }
        } catch (e) {
          console.warn('⚠️ Erro buscar prontuários anteriores:', e.message);
        }
      }

      const prompt = `Como médico especialista, analise os seguintes dados e forneça diagnósticos diferenciais:

SINTOMAS ATUAIS:
${sintomas}

HISTÓRICO DO PACIENTE:
${historicoPaciente}

PRONTUÁRIOS ANTERIORES:
${prontuariosAnteriores || 'Nenhum prontuário anterior disponível'}

Forneça:
1. Lista de 3-5 diagnósticos diferenciais mais prováveis (do mais ao menos provável)
2. Para cada diagnóstico: justificativa baseada nos sintomas E histórico clínico
3. Exames complementares recomendados para confirmação
4. Sinais de alerta (red flags)
5. Nível de urgência (baixo/médio/alto)`;

      const resultado = await invokeIAComCache(
        "diagnostico",
        prompt,
        {
          type: "object",
          properties: {
            diagnosticos_diferenciais: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  diagnostico: { type: "string" },
                  cid10: { type: "string" },
                  probabilidade: { type: "string" },
                  justificativa: { type: "string" }
                }
              }
            },
            exames_recomendados: { type: "array", items: { type: "string" } },
            sinais_alerta: { type: "array", items: { type: "string" } },
            nivel_urgencia: { type: "string" }
          }
        },
        { validadeDias: 30 }
      );

      setSugestoes(resultado);
      if (onSugestao) onSugestao(resultado);
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Erro ao gerar sugestões");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--pc-primary-50)] rounded-xl p-4 border border-[var(--pc-primary-200)]">
        <div className="flex items-start gap-3">
          <Brain className="w-6 h-6 text-[var(--pc-primary-600)] flex-shrink-0" />
          <div>
            <h3 className="pc-heading-4 text-[var(--pc-primary-900)] mb-1">Assistente Diagnóstico IA</h3>
            <p className="pc-body-sm text-[var(--pc-primary-800)]">
              A IA analisa sintomas e histórico para sugerir diagnósticos diferenciais e orientar investigação.
            </p>
          </div>
        </div>
      </div>

      {!sugestoes ? (
        <button
          onClick={gerarDiagnosticoDiferencial}
          disabled={gerando || !sintomas}
          className="pc-btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {gerando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Gerar Diagnósticos Diferenciais
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Diagnósticos Diferenciais */}
          <div className="pc-card p-4">
            <h4 className="pc-heading-4 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[var(--pc-warning-500)]" />
              Diagnósticos Diferenciais
            </h4>
            <div className="space-y-3">
              {sugestoes.diagnosticos_diferenciais?.map((diag, idx) => (
                <div key={idx} className="pc-card p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="pc-body font-bold">{diag.diagnostico}</p>
                      {diag.cid10 && (
                        <p className="pc-caption">CID-10: {diag.cid10}</p>
                      )}
                    </div>
                    <span className={`pc-badge ${
                      diag.probabilidade === "alta" ? "pc-badge-error" :
                      diag.probabilidade === "média" ? "pc-badge-warning" :
                      "pc-badge-success"
                    }`}>
                      {diag.probabilidade} probabilidade
                    </span>
                  </div>
                  <p className="pc-body-sm">{diag.justificativa}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exames Recomendados */}
          {sugestoes.exames_recomendados?.length > 0 && (
            <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-info-900)] mb-2">Exames Recomendados</h4>
              <ul className="space-y-1">
                {sugestoes.exames_recomendados.map((exame, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-info-800)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--pc-info-600)] rounded-full"></span>
                    {exame}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sinais de Alerta */}
          {sugestoes.sinais_alerta?.length > 0 && (
            <div className="bg-[var(--pc-error-50)] rounded-xl p-4 border border-[var(--pc-error-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-error-900)] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Sinais de Alerta
              </h4>
              <ul className="space-y-1">
                {sugestoes.sinais_alerta.map((sinal, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-error-800)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[var(--pc-error-600)] rounded-full"></span>
                    {sinal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nível de Urgência */}
          <div className={`rounded-xl p-4 border ${
            sugestoes.nivel_urgencia === "alto" ? "bg-[var(--pc-error-50)] border-[var(--pc-error-200)]" :
            sugestoes.nivel_urgencia === "médio" ? "bg-[var(--pc-warning-50)] border-[var(--pc-warning-200)]" :
            "bg-[var(--pc-success-50)] border-[var(--pc-success-200)]"
          }`}>
            <p className="pc-body font-bold">
              Urgência: <span className="capitalize">{sugestoes.nivel_urgencia}</span>
            </p>
          </div>

          <button
            onClick={() => setSugestoes(null)}
            className="pc-btn-secondary w-full py-2"
          >
            Gerar Nova Análise
          </button>
        </div>
      )}

      <div className="bg-[var(--pc-warning-50)] rounded-xl p-3 border border-[var(--pc-warning-200)]">
        <p className="pc-caption text-[var(--pc-warning-800)]">
          ⚠️ <strong>Importante:</strong> As sugestões da IA são apenas orientativas e não substituem o julgamento clínico do médico.
          Sempre confirme com exames e avaliação clínica completa.
        </p>
      </div>
    </div>
  );
}