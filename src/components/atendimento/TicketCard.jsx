import React from "react";
import { Mail, Phone, User, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatarDataLocal } from "@/components/hooks/useUserTimezone";

export default function TicketCard({ 
  ticket, 
  isSelected, 
  isChecked, 
  contato,
  onSelect, 
  onCheckChange,
  isSuperAdmin = false,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-all cursor-pointer ${
        isSelected ? 'border-l-4' : ''
      }`}
      style={isSelected ? { backgroundColor: '#f5f3ff', borderLeftColor: '#7E57FF' } : {}}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onCheckChange(e.target.checked);
          }}
          className="mt-1 w-5 h-5 rounded"
          style={{ accentColor: '#7E57FF' }}
        />
        <div className="flex-1 min-w-0" onClick={onSelect}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold" style={{ color: '#6d28d9' }}>
              {ticket.numero_ticket}
            </span>
            {ticket.canal === 'email' && <Mail className="w-3 h-3" style={{ color: '#1a73e8' }} />}
            {isSuperAdmin && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e8f1fb', color: '#0B7A9E' }}>
                {ticket.clinica_nome || 'Clínica'}
              </span>
            )}
            {contato && (
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
                {contato.tipo_contato}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-sm mb-1 truncate" style={{ color: '#202124' }}>
            {ticket.assunto}
          </h4>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs mb-2 cursor-help" style={{ color: '#5f6368' }}>
                  {ticket.solicitante_nome}
                </p>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    <span>{ticket.solicitante_email}</span>
                  </div>
                  {ticket.solicitante_telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>{ticket.solicitante_telefone}</span>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-[10px] font-medium`} style={{
              backgroundColor: ticket.status === 'aberto' ? '#fde7e7' : 
                              ticket.status === 'em_andamento' ? '#fef9e5' : '#e6f7ed',
              color: ticket.status === 'aberto' ? '#842820' : 
                     ticket.status === 'em_andamento' ? '#956802' : '#1f6332'
            }}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[10px] mt-2" style={{ color: '#9aa0a6' }} title={formatarDataLocal(ticket.created_date, timezone, 'completo')}>
            {formatDistanceToNow(new Date(ticket.created_date), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
      </div>
    </div>
  );
}