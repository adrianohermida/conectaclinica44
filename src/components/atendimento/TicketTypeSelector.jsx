import React from "react";
import { Inbox, AtSign } from "lucide-react";

export default function TicketTypeSelector({ tipo, onTipoChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-3" style={{ color: '#202124' }}>Tipo de Atendimento</label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onTipoChange('ticket')}
          className={`p-4 rounded-xl border-2 transition-all text-left`}
          style={{
            borderColor: tipo === 'ticket' ? '#7E57FF' : '#e8eaed',
            backgroundColor: tipo === 'ticket' ? '#f5f3ff' : 'white'
          }}
        >
          <Inbox className="w-6 h-6 mb-2" style={{ color: tipo === 'ticket' ? '#7E57FF' : '#9aa0a6' }} />
          <p className="font-semibold text-sm" style={{ color: tipo === 'ticket' ? '#4c1d95' : '#202124' }}>Ticket</p>
          <p className="text-xs" style={{ color: '#5f6368' }}>Contato existente</p>
        </button>
        <button
          type="button"
          onClick={() => onTipoChange('email')}
          className={`p-4 rounded-xl border-2 transition-all text-left`}
          style={{
            borderColor: tipo === 'email' ? '#7E57FF' : '#e8eaed',
            backgroundColor: tipo === 'email' ? '#f5f3ff' : 'white'
          }}
        >
          <AtSign className="w-6 h-6 mb-2" style={{ color: tipo === 'email' ? '#7E57FF' : '#9aa0a6' }} />
          <p className="font-semibold text-sm" style={{ color: tipo === 'email' ? '#4c1d95' : '#202124' }}>Email</p>
          <p className="text-xs" style={{ color: '#5f6368' }}>Lead ou novo contato</p>
        </button>
      </div>
    </div>
  );
}