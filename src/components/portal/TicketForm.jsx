import React, { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function TicketForm({ onSuccess, onCancel }) {
  const [ticketForm, setTicketForm] = useState({ assunto: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    if (!ticketForm.assunto || !ticketForm.mensagem) {
      toast.error('Preencha assunto e mensagem');
      return;
    }

    setEnviando(true);
    try {
      const response = await base44.functions.invoke('criarTicketPortal', {
        assunto: ticketForm.assunto,
        mensagem: ticketForm.mensagem
      });

      if (response.data.success) {
        toast.success(`✅ Ticket ${response.data.numero_ticket} criado!`);
        setTicketForm({ assunto: '', mensagem: '' });
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Erro ao abrir atendimento');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <p className="text-sm" style={{ color: '#6d28d9' }}>
          💬 Abra um chamado e nossa equipe responderá em breve por email
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Assunto *</label>
        <input
          type="text"
          value={ticketForm.assunto}
          onChange={(e) => setTicketForm({ ...ticketForm, assunto: e.target.value })}
          placeholder="Ex: Dúvida sobre exame"
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[#7E57FF]"
          style={{ borderColor: '#e8eaed' }}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Mensagem *</label>
        <textarea
          value={ticketForm.mensagem}
          onChange={(e) => setTicketForm({ ...ticketForm, mensagem: e.target.value })}
          placeholder="Descreva sua dúvida ou solicitação..."
          rows={6}
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-[#7E57FF] resize-none"
          style={{ borderColor: '#e8eaed' }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 min-h-[48px] rounded-xl font-medium border"
          style={{ borderColor: '#e8eaed', color: '#5f6368' }}
          disabled={enviando}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={enviando}
          className="flex-1 min-h-[48px] rounded-xl font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: '#7E57FF' }}
        >
          <Plus className="w-4 h-4" />
          {enviando ? 'Enviando...' : 'Abrir Atendimento'}
        </button>
      </div>
    </div>
  );
}