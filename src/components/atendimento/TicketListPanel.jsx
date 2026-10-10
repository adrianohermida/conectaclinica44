import React from "react";
import TicketCard from "./TicketCard";

export default function TicketListPanel({ 
  tickets = [],
  ticketSelecionado,
  selecionados = [],
  contatos = [],
  onSelectTicket,
  onCheckTicket,
  isSuperAdmin = false,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div className="lg:col-span-4">
      <div className="rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="p-4 border-b" style={{ borderColor: '#e8eaed' }}>
          <h3 className="font-bold" style={{ color: '#202124' }}>
            {isSuperAdmin ? '🌐 Todos Tickets' : 'Tickets'}
          </h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto divide-y" style={{ borderColor: '#f1f3f4' }}>
          {tickets.map(ticket => {
            const contato = contatos.find(c => 
              c.emails?.some(e => e.email === ticket.solicitante_email) ||
              c.email === ticket.solicitante_email
            );
            const isSelected = ticketSelecionado?.id === ticket.id;
            const isChecked = selecionados.includes(ticket.id);

            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isSelected={isSelected}
                isChecked={isChecked}
                contato={contato}
                onSelect={() => onSelectTicket(ticket)}
                onCheckChange={(checked) => onCheckTicket(ticket.id, checked)}
                isSuperAdmin={isSuperAdmin}
                timezone={timezone}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}