import React from "react";
import { Mail, Star, Archive, Trash2, Clock, Paperclip, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarDataLocal } from "@/components/hooks/useUserTimezone";

export default function TicketListInbox({ tickets, ticketSelecionado, setTicketSelecionado, selecionados, setSelecionados, user, timezone = 'America/Sao_Paulo' }) {
  return (
    <div className="bg-white rounded-lg" style={{ border: '1px solid #e8eaed' }}>
      {/* Table Header */}
      <div className="flex items-center px-4 py-3 border-b text-xs font-semibold" style={{ borderColor: '#e8eaed', color: '#5f6368' }}>
        <div className="w-10 flex-shrink-0">
          <input
            type="checkbox"
            checked={selecionados.length === tickets.length && tickets.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelecionados(tickets.map(t => t.id));
              } else {
                setSelecionados([]);
              }
            }}
            className="w-4 h-4"
            style={{ accentColor: '#7E57FF' }}
          />
        </div>
        <div className="w-8 flex-shrink-0"></div>
        <div className="flex-1">Remetente / Assunto</div>
        <div className="w-24 flex-shrink-0 text-right">Horário</div>
      </div>

      {/* Table Body */}
      <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
        {tickets.map(ticket => {
          const isSelected = ticketSelecionado?.id === ticket.id;
          const isChecked = selecionados.includes(ticket.id);
          const isUnread = ticket.status === 'aberto' || ticket.status === 'aguardando';

          return (
            <div
              key={ticket.id}
              className={`flex items-center px-4 py-3 hover:shadow-md transition-all cursor-pointer ${isSelected ? 'bg-purple-50' : ''} ${isUnread ? 'font-semibold' : ''}`}
              onClick={() => setTicketSelecionado(ticket)}
              style={isSelected ? { backgroundColor: '#f5f3ff' } : {}}
            >
              {/* Checkbox */}
              <div className="w-10 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelecionados(e.target.checked 
                      ? [...selecionados, ticket.id]
                      : selecionados.filter(id => id !== ticket.id)
                    );
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: '#7E57FF' }}
                />
              </div>

              {/* Star (favorito) */}
              <div className="w-8 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: implement favorito
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-all"
                >
                  <Star className="w-4 h-4" style={{ color: '#9aa0a6' }} />
                </button>
              </div>

              {/* Sender + Subject */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 w-full">
                  {/* Status indicator */}
                  {isUnread && (
                    <Circle className="w-2 h-2 fill-current flex-shrink-0" style={{ color: '#1a73e8' }} />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`truncate ${isUnread ? 'font-bold' : ''}`} style={{ color: '#202124' }}>
                        {ticket.solicitante_nome}
                      </span>
                      {user?.role === 'admin' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#e8f1fb', color: '#0B7A9E' }}>
                          {ticket.clinica_nome || 'Clínica'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs" style={{ color: '#6d28d9' }}>{ticket.numero_ticket}</span>
                      <span className="text-sm truncate" style={{ color: isUnread ? '#202124' : '#5f6368' }}>
                        {ticket.assunto}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ticket.canal === 'email' && <Mail className="w-3.5 h-3.5" style={{ color: '#1a73e8' }} />}
                    {ticket.prioridade === 'urgente' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#fde7e7', color: '#c5221f' }}>
                        Urgente
                      </span>
                    )}
                    {/* TODO: Paperclip se tiver anexos */}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="w-24 text-right text-xs flex-shrink-0" style={{ color: '#5f6368' }} title={formatarDataLocal(ticket.created_date, timezone, 'completo')}>
                {format(new Date(ticket.created_date), "dd MMM", { locale: ptBR })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}