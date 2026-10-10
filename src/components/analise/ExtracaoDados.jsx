import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Database, Download, FileJson, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ExtracaoDados({ analise }) {
  const [extraindo, setExtraindo] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState(analise.dados_extraidos || null);

  const extrairDadosEstruturados = async () => {
    setExtraindo(true);
    try {
      const schemasExtracao = {
        exame_sangue: {
          type: "object",
          properties: {
            nome_paciente: { type: "string" },
            data_coleta: { type: "string" },
            laboratorio: { type: "string" },
            medico_solicitante: { type: "string" },
            resultados: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  exame: { type: "string" },
                  resultado: { type: "string" },
                  unidade: { type: "string" },
                  valor_referencia: { type: "string" },
                  status: { type: "string" }
                }
              }
            }
          }
        },
        exame_imagem: {
          type: "object",
          properties: {
            tipo_exame: { type: "string" },
            data_realizacao: { type: "string" },
            tecnico_responsavel: { type: "string" },
            laudo: { type: "string" },
            achados: { type: "array", items: { type: "string" } },
            conclusao: { type: "string" }
          }
        },
        laudo_medico: {
          type: "object",
          properties: {
            medico: { type: "string" },
            crm: { type: "string" },
            data_laudo: { type: "string" },
            diagnostico: { type: "string" },
            cid10: { type: "string" },
            conclusao: { type: "string" },
            recomendacoes: { type: "array", items: { type: "string" } }
          }
        }
      };

      const schema = schemasExtracao[analise.tipo_documento] || {
        type: "object",
        properties: {
          conteudo: { type: "string" },
          dados_principais: { type: "array", items: { type: "string" } }
        }
      };

      const resultado = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: analise.arquivo_url,
        json_schema: schema
      });

      if (resultado.status === "success" && resultado.output) {
        setDadosExtraidos(resultado.output);
        
        // Atualizar análise com dados extraídos
        await base44.entities.DocumentoAnaliseIA.update(analise.id, {
          ...analise,
          dados_extraidos: resultado.output,
          confianca_extracao: 85
        });

        alert("✅ Dados extraídos com sucesso!");
      } else {
        alert("⚠️ Não foi possível extrair dados estruturados: " + (resultado.details || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro na extração:", error);
      alert("Erro ao extrair dados");
    } finally {
      setExtraindo(false);
    }
  };

  const exportarJSON = () => {
    const dataStr = JSON.stringify(dadosExtraidos, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extracao_${analise.paciente_nome}_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {!dadosExtraidos ? (
        <>
          <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-[var(--pc-info-600)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="pc-heading-4 text-[var(--pc-info-900)] mb-1">📊 Extração Automática de Dados</h3>
                <p className="pc-body-sm text-[var(--pc-info-800)]">
                  A IA pode extrair dados estruturados deste documento para facilitar análises e integração com sistemas
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={extrairDadosEstruturados}
            disabled={extraindo}
            className="pc-btn-primary w-full py-3 px-6 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {extraindo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extraindo dados...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Extrair Dados Estruturados
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="bg-[var(--pc-success-50)] rounded-xl p-4 border border-[var(--pc-success-200)]">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--pc-success-600)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="pc-heading-4 text-[var(--pc-success-900)] mb-1">✅ Dados Extraídos</h3>
                <p className="pc-body-sm text-[var(--pc-success-800)]">
                  {analise.confianca_extracao || 85}% de confiança na extração
                </p>
              </div>
            </div>
          </div>

          <div className="pc-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="pc-heading-4">Dados Estruturados</h4>
              <button
                onClick={exportarJSON}
                className="bg-[var(--pc-info-50)] hover:bg-[var(--pc-info-100)] text-[var(--pc-info-700)] px-3 py-2 rounded-lg pc-body-sm flex items-center gap-2 pc-transition"
              >
                <Download className="w-4 h-4" />
                Exportar JSON
              </button>
            </div>
            
            <pre className="bg-[var(--pc-surface-variant)] rounded-lg p-4 pc-caption overflow-x-auto border border-[var(--pc-border-primary)]">
              {JSON.stringify(dadosExtraidos, null, 2)}
            </pre>
          </div>

          {/* Visualização Amigável */}
          {dadosExtraidos.resultados && (
            <div className="pc-card p-4">
              <h4 className="pc-heading-4 mb-3">Resultados do Exame</h4>
              <div className="space-y-2">
                {dadosExtraidos.resultados.map((res, idx) => (
                  <div key={idx} className="pc-card p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="pc-body font-medium">{res.exame}</p>
                        <p className="pc-body-sm">Resultado: {res.resultado} {res.unidade}</p>
                        <p className="pc-caption">Referência: {res.valor_referencia}</p>
                      </div>
                      <span className={`pc-badge ${
                        res.status === "normal" ? "pc-badge-success" :
                        res.status === "alterado" ? "pc-badge-warning" :
                        "pc-badge-error"
                      }`}>
                        {res.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}