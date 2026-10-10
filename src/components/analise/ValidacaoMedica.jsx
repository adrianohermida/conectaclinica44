import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, AlertTriangle, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ValidacaoMedica({ analise, onValidado }) {
  const [validando, setValidando] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  const validarAnalise = async (statusValidacao, correcoes = "") => {
    setValidando(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.DocumentoAnaliseIA.update(analise.id, {
        ...analise,
        status_validacao: statusValidacao,
        validado_por: user.full_name || user.email,
        data_validacao: new Date().toISOString(),
        observacoes_validacao: observacoes,
        correcoes_medico: correcoes
      });

      const msg = statusValidacao === "aprovado" 
        ? "✅ Análise aprovada com sucesso!"
        : statusValidacao === "aprovado_com_ressalvas"
        ? "⚠️ Análise aprovada com ressalvas"
        : "❌ Análise rejeitada";

      alert(msg);
      if (onValidado) onValidado();
    } catch (error) {
      console.error("Erro ao validar:", error);
      alert("Erro ao validar análise");
    } finally {
      setValidando(false);
    }
  };

  if (analise.status_validacao !== "pendente") {
    return (
      <div className={`rounded-xl p-4 border-2 ${
        analise.status_validacao === "aprovado" ? "bg-[var(--pc-success-50)] border-[var(--pc-success-500)]" :
        analise.status_validacao === "aprovado_com_ressalvas" ? "bg-[var(--pc-warning-50)] border-[var(--pc-warning-500)]" :
        "bg-[var(--pc-error-50)] border-[var(--pc-error-500)]"
      }`}>
        <div className="flex items-start gap-3">
          {analise.status_validacao === "aprovado" && <CheckCircle className="w-6 h-6 text-[var(--pc-success-600)] flex-shrink-0" />}
          {analise.status_validacao === "aprovado_com_ressalvas" && <AlertTriangle className="w-6 h-6 text-[var(--pc-warning-600)] flex-shrink-0" />}
          {analise.status_validacao === "rejeitado" && <XCircle className="w-6 h-6 text-[var(--pc-error-600)] flex-shrink-0" />}
          
          <div className="flex-1">
            <h3 className={`pc-heading-4 mb-2 ${
              analise.status_validacao === "aprovado" ? "text-[var(--pc-success-900)]" :
              analise.status_validacao === "aprovado_com_ressalvas" ? "text-[var(--pc-warning-900)]" :
              "text-[var(--pc-error-900)]"
            }`}>
              {analise.status_validacao === "aprovado" ? "✅ Análise Aprovada" :
               analise.status_validacao === "aprovado_com_ressalvas" ? "⚠️ Aprovada com Ressalvas" :
               "❌ Análise Rejeitada"}
            </h3>
            
            <div className="space-y-2 pc-body-sm">
              {analise.validado_por && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Validado por:</span>
                  <span>{analise.validado_por}</span>
                </div>
              )}
              
              {analise.data_validacao && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Data:</span>
                  <span>{format(new Date(analise.data_validacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}

              {analise.observacoes_validacao && (
                <div className="mt-3 bg-white/50 rounded p-3 border border-[var(--pc-border-primary)]">
                  <p className="font-medium mb-1">Observações:</p>
                  <p>{analise.observacoes_validacao}</p>
                </div>
              )}

              {analise.correcoes_medico && (
                <div className="mt-3 bg-white/50 rounded p-3 border border-[var(--pc-border-primary)]">
                  <p className="font-medium mb-1">Correções:</p>
                  <p>{analise.correcoes_medico}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
        <h3 className="pc-heading-4 text-[var(--pc-info-900)] mb-1">👨‍⚕️ Validação Médica Necessária</h3>
        <p className="pc-body-sm text-[var(--pc-info-800)]">
          Revise a análise da IA e confirme ou corrija as informações extraídas
        </p>
      </div>

      {/* Resumo da Análise */}
      <div className="pc-card p-4">
        <h4 className="pc-heading-4 mb-3">Resumo da Análise IA</h4>
        <div className="space-y-2 pc-body-sm">
          <div className="flex justify-between">
            <span className="text-[var(--pc-text-secondary)]">Documento:</span>
            <span className="font-medium">{analise.nome_arquivo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--pc-text-secondary)]">Tipo:</span>
            <span className="font-medium capitalize">
              {analise.tipo_documento?.replace("_", " ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--pc-text-secondary)]">Confiança IA:</span>
            <span className={`font-medium ${
              (analise.confianca_extracao || 0) >= 80 ? "text-[var(--pc-success-600)]" :
              (analise.confianca_extracao || 0) >= 60 ? "text-[var(--pc-warning-600)]" :
              "text-[var(--pc-error-600)]"
            }`}>
              {analise.confianca_extracao || 0}%
            </span>
          </div>
        </div>

        {analise.dados_extraidos && (
          <div className="mt-4 bg-[var(--pc-surface-variant)] rounded p-3 border border-[var(--pc-border-primary)]">
            <p className="pc-caption mb-2">Dados Extraídos:</p>
            <pre className="pc-caption overflow-x-auto">
              {JSON.stringify(analise.dados_extraidos, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Observações do Médico */}
      <div>
        <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">
          Observações da Validação
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="pc-input w-full resize-none"
          rows="4"
          placeholder="Adicione observações, correções ou comentários sobre a análise..."
        />
      </div>

      {/* Botões de Validação */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => validarAnalise("aprovado")}
          disabled={validando}
          className="bg-[var(--pc-success)] hover:bg-[var(--pc-success-600)] text-white font-medium py-3 px-4 rounded-xl flex flex-col items-center gap-2 disabled:opacity-50 pc-transition"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="pc-body-sm">Aprovar</span>
        </button>
        
        <button
          onClick={() => validarAnalise("aprovado_com_ressalvas")}
          disabled={validando}
          className="bg-[var(--pc-warning)] hover:bg-[var(--pc-warning-600)] text-white font-medium py-3 px-4 rounded-xl flex flex-col items-center gap-2 disabled:opacity-50 pc-transition"
        >
          <AlertTriangle className="w-6 h-6" />
          <span className="pc-body-sm">Com Ressalvas</span>
        </button>
        
        <button
          onClick={() => validarAnalise("rejeitado", observacoes)}
          disabled={validando || !observacoes}
          className="bg-[var(--pc-error)] hover:bg-[var(--pc-error-600)] text-white font-medium py-3 px-4 rounded-xl flex flex-col items-center gap-2 disabled:opacity-50 pc-transition"
        >
          <XCircle className="w-6 h-6" />
          <span className="pc-body-sm">Rejeitar</span>
        </button>
      </div>

      <p className="pc-caption text-center">
        Ao validar, você está confirmando a precisão das informações extraídas pela IA
      </p>
    </div>
  );
}