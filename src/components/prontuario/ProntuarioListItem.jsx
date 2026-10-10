import React from "react";
import { FileText, Calendar, Stethoscope, Paperclip, Shield, Clock, CheckCircle, Eye, Brain, Share2, History, FileSignature, Sparkles, Pill, FileStack, FileImage, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProntuarioListItem({ 
  prontuario, 
  documentosCount = 0,
  onEdit,
  onIADiagnostico,
  onAssinar,
  onHistorico,
  onPrescricao,
  onPrescricaoIA,
  onInteracoes,
  onResumo,
  onRelatorios,
  onExames,
  onEvolucao,
  onCompartilhar
}) {
  return (
    <div className="oneui-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 float-icon">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-800 truncate">
                {prontuario.paciente_nome}
              </h3>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(prontuario.data_atendimento), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-4 h-4" />
                  Dr(a). {prontuario.medico_nome}
                </span>
                {prontuario.medico_crm && (
                  <span className="flex items-center gap-1">
                    CRM: {prontuario.medico_crm}
                  </span>
                )}
                {documentosCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Paperclip className="w-4 h-4" />
                    {documentosCount} anexo(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            prontuario.status_prontuario === "assinado" ? "bg-green-100 text-green-700" :
            prontuario.status_prontuario === "finalizado" ? "bg-blue-100 text-blue-700" :
            "bg-yellow-100 text-yellow-700"
          }`}>
            {prontuario.status_prontuario}
          </span>
        </div>

        {prontuario.hipotese_diagnostica && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Diagnóstico:</p>
            <p className="text-sm text-gray-800">{prontuario.hipotese_diagnostica}</p>
          </div>
        )}

        {/* Indicadores de Conformidade */}
        <div className="flex flex-wrap gap-2">
          {prontuario.assinatura_digital && (
            <span className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Assinado Digitalmente
            </span>
          )}
          {prontuario.versao > 1 && (
            <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Versão {prontuario.versao}
            </span>
          )}
          <span className="bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Conforme CFM
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={() => onEdit(prontuario)} className="bg-[#f5f5f5] hover:bg-[#e0e0e0] text-[#202124] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" /> Ver
          </button>
          <button onClick={() => onIADiagnostico(prontuario)} className="bg-[rgba(11,122,158,0.08)] hover:bg-[rgba(11,122,158,0.15)] text-[#0B7A9E] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" /> IA Diagnóstico
          </button>
          {prontuario.status_prontuario !== "assinado" && (
            <button onClick={() => onAssinar(prontuario)} className="bg-green-50 hover:bg-green-100 text-green-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" /> Assinar
            </button>
          )}
          <button onClick={() => onHistorico(prontuario)} className="bg-[rgba(11,122,158,0.08)] hover:bg-[rgba(11,122,158,0.15)] text-[#0B7A9E] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico
          </button>
          <button onClick={() => onPrescricao(prontuario)} className="bg-[rgba(11,122,158,0.08)] hover:bg-[rgba(11,122,158,0.15)] text-[#0B7A9E] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Prescrever
          </button>
          <button onClick={() => onPrescricaoIA(prontuario)} className="bg-pink-50 hover:bg-pink-100 text-pink-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Prescrição IA
          </button>
          <button onClick={() => onInteracoes(prontuario)} className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Pill className="w-4 h-4" /> Interações
          </button>
          <button onClick={() => onResumo(prontuario)} className="bg-[rgba(11,122,158,0.08)] hover:bg-[rgba(11,122,158,0.15)] text-[#0B7A9E] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Resumo IA
          </button>
          <button onClick={() => onRelatorios(prontuario)} className="bg-[rgba(11,122,158,0.08)] hover:bg-[rgba(11,122,158,0.15)] text-[#0B7A9E] font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <FileStack className="w-4 h-4" /> Relatórios
          </button>
          <button onClick={() => onExames(prontuario)} className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <FileImage className="w-4 h-4" /> Exames
          </button>
          <button onClick={() => onEvolucao(prontuario)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" /> Evolução
          </button>
          <button onClick={() => onCompartilhar(prontuario)} className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}