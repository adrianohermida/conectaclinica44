import React from "react";
import { Clock, User, FileEdit, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoEdicoes({ prontuario }) {
  const historico = prontuario.historico_alteracoes || [];

  if (historico.length === 0) {
    return (
      <div className="bg-[var(--pc-surface-variant)] rounded-xl p-8 text-center border border-[var(--pc-border-primary)]">
        <Clock className="w-12 h-12 text-[var(--pc-text-disabled)] mx-auto mb-3" />
        <p className="pc-body-sm">Nenhuma alteração registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informativo */}
      <div className="bg-[var(--pc-info-50)] rounded-xl p-4 border border-[var(--pc-info-200)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--pc-info-600)] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="pc-heading-4 text-[var(--pc-info-900)] mb-1">🔐 Auditoria CFM</h3>
            <p className="pc-body-sm text-[var(--pc-info-800)]">
              Todas as alterações no prontuário são registradas conforme Resolução CFM 1.821/07.
              O histórico é imutável e protegido por assinatura digital.
            </p>
          </div>
        </div>
      </div>

      {/* Informações da Versão Atual */}
      <div className="pc-card p-4 border-2 border-[var(--pc-primary)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pc-heading-4 text-[var(--pc-primary)]">Versão Atual: {prontuario.versao || 1}</h3>
          <span className={`pc-badge ${
            prontuario.status_prontuario === "assinado" ? "bg-[var(--pc-success-100)] text-[var(--pc-success-700)]" :
            prontuario.status_prontuario === "finalizado" ? "bg-[var(--pc-info-100)] text-[var(--pc-info-700)]" :
            "bg-[var(--pc-warning-100)] text-[var(--pc-warning-700)]"
          }`}>
            {prontuario.status_prontuario}
          </span>
        </div>
        
        {prontuario.assinatura_digital && (
          <div className="bg-[var(--pc-success-50)] rounded-lg p-3 border border-[var(--pc-success-200)] pc-caption">
            <p className="text-[var(--pc-success-800)] mb-1">
              <strong>Hash de Assinatura:</strong> {prontuario.assinatura_digital.hash}
            </p>
            <p className="text-[var(--pc-success-700)]">
              <strong>Assinado em:</strong>{" "}
              {format(new Date(prontuario.assinatura_digital.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-[var(--pc-success-700)]">
              <strong>Certificado:</strong> {prontuario.assinatura_digital.certificado_digital}
            </p>
          </div>
        )}
      </div>

      {/* Timeline de Alterações */}
      <div className="space-y-3">
        <h3 className="pc-heading-4">Timeline de Alterações</h3>
        
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--pc-border-secondary)]" />
          
          <div className="space-y-4">
            {historico.map((item, index) => (
              <div key={index} className="relative pl-12">
                {/* Ponto na timeline */}
                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[var(--pc-primary)] flex items-center justify-center">
                  <FileEdit className="w-4 h-4 text-white" />
                </div>

                {/* Conteúdo */}
                <div className="pc-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="pc-body font-medium">{item.alteracao}</p>
                    <span className="pc-badge bg-[var(--pc-gray-100)] text-[var(--pc-text-secondary)]">
                      v{historico.length - index}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 pc-caption">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.usuario}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {item.campos_alterados && item.campos_alterados.length > 0 && (
                    <div className="mt-3 bg-[var(--pc-surface-variant)] rounded p-2 border border-[var(--pc-border-primary)]">
                      <p className="pc-caption mb-1">Campos modificados:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.campos_alterados.map((campo, idx) => (
                          <span key={idx} className="pc-badge pc-badge-info">
                            {campo}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Informações de Conformidade */}
      <div className="bg-[var(--pc-success-50)] rounded-xl p-4 border border-[var(--pc-success-200)]">
        <h4 className="pc-heading-4 text-[var(--pc-success-900)] mb-2">✅ Conformidade CFM</h4>
        <ul className="pc-body-sm text-[var(--pc-success-800)] space-y-1">
          <li>• Total de {historico.length} registro(s) de auditoria</li>
          <li>• Versionamento automático ativado</li>
          <li>• Histórico imutável e protegido</li>
          <li>• Rastreabilidade completa de alterações</li>
        </ul>
      </div>
    </div>
  );
}