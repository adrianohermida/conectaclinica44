import React from "react";
import { format } from "date-fns";
import { Calendar, Clock, User, Stethoscope, MapPin, Phone, Mail, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Modal de Detalhes do Agendamento
 * Exibe informações completas e permite ações rápidas
 */
export default function AgendamentoDetalhes({ agendamento, onClose, onEditar, onCancelar }) {
  if (!agendamento) return null;

  const statusColors = {
    agendado: { bg: '#e0f2fe', text: '#0369a1', label: 'Agendado' },
    confirmado: { bg: '#dcfce7', text: '#15803d', label: 'Confirmado' },
    em_atendimento: { bg: '#fef3c7', text: '#a16207', label: 'Em Atendimento' },
    concluido: { bg: '#f3e8ff', text: '#7c3aed', label: 'Concluído' },
    cancelado: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado' }
  };

  const status = statusColors[agendamento.status] || statusColors.agendado;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="px-6 py-5 border-b flex items-center justify-between sticky top-0 bg-white z-10"
          style={{ borderColor: '#e8eaed' }}
        >
          <h2 className="text-xl font-bold" style={{ color: '#202124' }}>
            Detalhes do Agendamento
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#5f6368' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span 
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: status.bg, color: status.text }}
            >
              {status.label}
            </span>
            {agendamento.tipo_consulta && (
              <span 
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#f8f9fa', color: '#5f6368' }}
              >
                {agendamento.tipo_consulta === 'presencial' ? '🏥 Presencial' : '💻 Telemedicina'}
              </span>
            )}
          </div>

          {/* Paciente */}
          <div className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#e0f2fe' }}
            >
              <User className="w-6 h-6" style={{ color: '#0369a1' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>PACIENTE</p>
              <p className="text-lg font-bold" style={{ color: '#202124' }}>{agendamento.paciente_nome}</p>
              {agendamento.paciente_telefone && (
                <p className="text-sm mt-1 flex items-center gap-2" style={{ color: '#5f6368' }}>
                  <Phone className="w-4 h-4" />
                  {agendamento.paciente_telefone}
                </p>
              )}
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
              <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>DATA</p>
                <p className="text-base font-bold" style={{ color: '#202124' }}>
                  {agendamento.data ? format(new Date(agendamento.data), "dd/MM/yyyy") : 'Não definida'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
              <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>HORÁRIO</p>
                <p className="text-base font-bold" style={{ color: '#202124' }}>{agendamento.horario}</p>
              </div>
            </div>
          </div>

          {/* Médico */}
          {agendamento.medico && (
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
              <Stethoscope className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>MÉDICO</p>
                <p className="text-base font-bold" style={{ color: '#202124' }}>Dr(a). {agendamento.medico}</p>
                {agendamento.medico_crm && (
                  <p className="text-sm mt-1" style={{ color: '#5f6368' }}>CRM {agendamento.medico_crm}</p>
                )}
                {agendamento.especialidade && (
                  <p className="text-sm" style={{ color: '#5f6368' }}>{agendamento.especialidade}</p>
                )}
              </div>
            </div>
          )}

          {/* Tratamento */}
          {agendamento.tratamento && (
            <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
              <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>TRATAMENTO/PROCEDIMENTO</p>
                <p className="text-base" style={{ color: '#202124' }}>{agendamento.tratamento}</p>
              </div>
            </div>
          )}

          {/* Observações */}
          {agendamento.observacoes && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#fef3c7' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#a16207' }}>OBSERVAÇÕES</p>
              <p className="text-sm" style={{ color: '#78350f' }}>{agendamento.observacoes}</p>
            </div>
          )}

          {/* Valor */}
          {agendamento.valor && (
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#dcfce7' }}>
              <span className="text-sm font-medium" style={{ color: '#15803d' }}>VALOR DA CONSULTA</span>
              <span className="text-2xl font-bold" style={{ color: '#15803d' }}>
                R$ {agendamento.valor.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {agendamento.status !== 'cancelado' && (
          <div 
            className="px-6 py-4 border-t flex gap-3 sticky bottom-0 bg-white"
            style={{ borderColor: '#e8eaed' }}
          >
            <Button
              variant="secondary"
              onClick={onEditar}
              className="flex-1"
            >
              Editar Agendamento
            </Button>
            <Button
              variant="danger"
              onClick={onCancelar}
              className="flex-1"
            >
              Cancelar Consulta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}