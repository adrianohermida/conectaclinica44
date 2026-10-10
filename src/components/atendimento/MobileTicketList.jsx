import React from "react";
import { Mail, ChevronRight } from "lucide-react";

export default function MobileTicketList({ tickets, selecionados, setSelecionados, onSelectTicket }) {
  return (
    <div className="rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
      <div className="p-4 border-b" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold" style={{ color: '#202124' }}>Tickets</h3>
      </div>
      <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
        {tickets.map(ticket => {
          const isChecked = selecionados.includes(ticket.id);
          return (
            <div
              key={ticket.id}
              className="p-4 active:bg-gray-50"
              onClick={() => onSelectTicket(ticket)}
            >
              <div className="flex items-start gap-3">
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
                  className="mt-1 w-5 h-5 rounded"
                  style={{ accentColor: '#7E57FF' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold" style={{ color: '#6d28d9' }}>{ticket.numero_ticket}</span>
                    {ticket.canal === 'email' && <Mail className="w-3 h-3" style={{ color: '#1a73e8' }} />}
                  </div>
                  <h4 className="font-semibold text-sm mb-1 truncate" style={{ color: 'var(--pc-text-primary)' }}>{ticket.assunto}</h4>
                  <p className="text-xs mb-2" style={{ color: '#5f6368' }}>{ticket.solicitante_nome}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium`} style={{
                      backgroundColor: ticket.status === 'aberto' ? '#fde7e7' : ticket.status === 'em_andamento' ? '#fef9e5' : '#e6f7ed',
                      color: ticket.status === 'aberto' ? '#842820' : ticket.status === 'em_andamento' ? '#956802' : '#1f6332'
                    }}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto" style={{ color: '#9aa0a6' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}