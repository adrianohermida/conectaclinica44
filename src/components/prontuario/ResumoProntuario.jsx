import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Sparkles, Loader2, Download } from "lucide-react";

export default function ResumoProntuario({ prontuarios, pacienteNome }) {
  const [gerando, setGerando] = useState(false);
  const [resumo, setResumo] = useState(null);

  const gerarResumo = async () => {
    if (!prontuarios || prontuarios.length === 0) {
      alert("Nenhum prontuário disponível para resumir");
      return;
    }

    setGerando(true);
    try {
      const dadosProntuarios = prontuarios.map(p => ({
        data: p.data_atendimento,
        queixa: p.queixa_principal,
        diagnostico: p.hipotese_diagnostica,
        conduta: p.conduta,
        medicamentos: p.medicamentos_uso
      }));

      const prompt = `Você é um médico especialista. Analise o histórico completo do paciente "${pacienteNome}" e forneça um resumo clínico inteligente:

HISTÓRICO DE PRONTUÁRIOS (${prontuarios.length} consultas):
${JSON.stringify(dadosProntuarios, null, 2)}

Forneça:
1. Resumo executivo (2-3 parágrafos sobre a evolução clínica)
2. Condições médicas ativas
3. Medicamentos em uso contínuo
4. Alergias e contraindicações conhecidas
5. Principais eventos médicos (cirurgias, internações, etc)
6. Exames relevantes e seus resultados
7. Pontos de atenção para próxima consulta
8. Tendências observadas (melhora, piora, estável)`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            resumo_executivo: { type: "string" },
            condicoes_ativas: { type: "array", items: { type: "string" } },
            medicamentos_continuos: { type: "array", items: { type: "string" } },
            alergias: { type: "array", items: { type: "string" } },
            eventos_principais: { type: "array", items: { type: "string" } },
            exames_relevantes: { type: "array", items: { type: "object" } },
            pontos_atencao: { type: "array", items: { type: "string" } },
            tendencia_clinica: { type: "string" }
          }
        }
      });

      setResumo(resultado);
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
      alert("Erro ao gerar resumo");
    } finally {
      setGerando(false);
    }
  };

  const exportarResumo = () => {
    const texto = `RESUMO CLÍNICO - ${pacienteNome}
Data: ${new Date().toLocaleDateString("pt-BR")}

${resumo.resumo_executivo}

CONDIÇÕES ATIVAS:
${resumo.condicoes_ativas?.map(c => `• ${c}`).join("\n")}

MEDICAMENTOS EM USO:
${resumo.medicamentos_continuos?.map(m => `• ${m}`).join("\n")}

PONTOS DE ATENÇÃO:
${resumo.pontos_atencao?.map(p => `• ${p}`).join("\n")}

TENDÊNCIA CLÍNICA: ${resumo.tendencia_clinica}
`;

    const blob = new Blob([texto], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumo_${pacienteNome}_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-[var(--pc-info-600)] flex-shrink-0" />
          <div>
            <h3 className="pc-heading-4 text-[var(--pc-info-900)] mb-1">Resumo Inteligente</h3>
            <p className="pc-body-sm text-[var(--pc-info-800)]">
              A IA analisa todos os {prontuarios?.length || 0} prontuários e gera um resumo clínico completo
            </p>
          </div>
        </div>
      </div>

      {!resumo ? (
        <button
          onClick={gerarResumo}
          disabled={gerando || !prontuarios || prontuarios.length === 0}
          className="pc-btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {gerando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando resumo...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Gerar Resumo Clínico
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Resumo Executivo */}
          <div className="pc-card p-4">
            <h4 className="pc-heading-4 mb-3">📋 Resumo Executivo</h4>
            <p className="pc-body-sm leading-relaxed whitespace-pre-line">
              {resumo.resumo_executivo}
            </p>
          </div>

          {/* Condições Ativas */}
          {resumo.condicoes_ativas?.length > 0 && (
            <div className="bg-[var(--pc-error-50)] rounded-xl p-4 border border-[var(--pc-error-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-error-900)] mb-2">🔴 Condições Médicas Ativas</h4>
              <ul className="space-y-1">
                {resumo.condicoes_ativas.map((cond, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-error-800)]">• {cond}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Medicamentos */}
          {resumo.medicamentos_continuos?.length > 0 && (
            <div className="bg-[var(--pc-success-50)] rounded-xl p-4 border border-[var(--pc-success-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-success-900)] mb-2">💊 Medicamentos em Uso Contínuo</h4>
              <ul className="space-y-1">
                {resumo.medicamentos_continuos.map((med, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-success-800)]">• {med}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pontos de Atenção */}
          {resumo.pontos_atencao?.length > 0 && (
            <div className="bg-[var(--pc-warning-50)] rounded-xl p-4 border border-[var(--pc-warning-200)]">
              <h4 className="pc-heading-4 text-[var(--pc-warning-900)] mb-2">⚠️ Pontos de Atenção</h4>
              <ul className="space-y-1">
                {resumo.pontos_atencao.map((ponto, idx) => (
                  <li key={idx} className="pc-body-sm text-[var(--pc-warning-800)]">• {ponto}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tendência */}
          <div className="bg-[var(--pc-secondary-50)] rounded-xl p-4 border border-[var(--pc-secondary-200)]">
            <h4 className="pc-heading-4 text-[var(--pc-secondary-900)] mb-2">📊 Tendência Clínica</h4>
            <p className="pc-body-sm text-[var(--pc-secondary-800)]">{resumo.tendencia_clinica}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportarResumo}
              className="flex-1 bg-[var(--pc-info-50)] hover:bg-[var(--pc-info-100)] border border-[var(--pc-info-200)] text-[var(--pc-info-700)] font-medium py-2 rounded-xl flex items-center justify-center gap-2 pc-transition"
            >
              <Download className="w-4 h-4" />
              Exportar Resumo
            </button>
            <button
              onClick={() => setResumo(null)}
              className="pc-btn-secondary flex-1 py-2"
            >
              Nova Análise
            </button>
          </div>
        </div>
      )}
    </div>
  );
}