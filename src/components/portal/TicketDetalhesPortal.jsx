import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Send, User, Headphones } from "lucide-react";
import toast from "react-hot-toast";

export default function TicketDetalhesPortal({ ticket, userData }) {
  const queryClient = useQueryClient();
  const [novaResposta, setNovaResposta] = useState('');

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['mensagens-ticket', ticket.id],
    queryFn: () => base44.entities.MensagemTicket.filter({ ticket_id: ticket.id }),
    refetchInterval: 5000 // Atualizar a cada 5s
  });

  const enviarRespostaMutation = useMutation({
    mutationFn: async (conteudo) => {
      return base44.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: ticket.clinica_id,
        remetente_tipo: 'cliente',
        remetente_nome: userData.full_name,
        remetente_email: userData.email,
        conteudo
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mensagens-ticket', ticket.id]);
      queryClient.invalidateQueries(['tickets-paciente']);
      setNovaResposta('');
      toast.success('Mensagem enviada');
    }
  });

  const statusColors = {
    aberto: { bg: '#e8f1fb', text: '#1a73e8', label: 'Aberto' },
    em_andamento: { bg: '#fef9e5', text: '#956802', label: 'Em andamento' },
    aguardando_cliente: { bg: '#fde7e7', text: '#842820', label: 'Aguardando você' },
    resolvido: { bg: '#e6f7ed', text: '#1f6332', label: 'Resolvido' },
    fechado: { bg: '#f1f3f4', text: '#5f6368', label: 'Fechado' }
  };
  const status = statusColors[ticket.status] || statusColors.aberto;

  const mensagensOrdenadas = [...mensagens].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h3 className="font-semibold text-lg text-[#202124] mb-2">{ticket.assunto}</h3>
        <div className="flex items-center gap-3 text-sm text-[#5f6368]">
          <span 
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: status.bg, color: status.text }}
          >
            {status.label}
          </span>
          <span>•</span>
          <span>{format(new Date(ticket.created_date), 'dd/MM/yyyy HH:mm')}</span>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {isLoading ? (
          <div className="text-center py-8 text-[#5f6368]">Carregando mensagens...</div>
        ) : mensagensOrdenadas.length === 0 ? (
          <div className="text-center py-8 text-[#5f6368]">Nenhuma mensagem ainda</div>
        ) : (
          mensagensOrdenadas.map(msg => {
            const isCliente = msg.remetente_tipo === 'cliente';
            return (
              <div key={msg.id} className={`flex gap-3 ${isCliente ? 'flex-row-reverse' : ''}`}>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isCliente ? '#e8f1fb' : '#f5f3ff' }}
                >
                  {isCliente ? (
                    <User className="w-4 h-4" style={{ color: '#1a73e8' }} />
                  ) : (
                    <Headphones className="w-4 h-4" style={{ color: '#7E57FF' }} />
                  )}
                </div>
                <div className={`flex-1 ${isCliente ? 'text-right' : ''}`}>
                  <div 
                    className={`inline-block p-3 rounded-lg max-w-[85%] ${
                      isCliente 
                        ? 'bg-[#7E57FF] text-white' 
                        : 'bg-[#f8f9fa] text-[#202124]'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                  </div>
                  <p className="text-xs text-[#80868b] mt-1">
                    {format(new Date(msg.created_date), 'dd/MM HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input de resposta */}
      {ticket.status !== 'fechado' && (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!novaResposta.trim()) return;
            enviarRespostaMutation.mutate(novaResposta);
          }}
          className="flex gap-2 pt-4 border-t border-gray-200"
        >
          <Input
            value={novaResposta}
            onChange={(e) => setNovaResposta(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={enviarRespostaMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!novaResposta.trim() || enviarRespostaMutation.isPending}
            className="pc-btn-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}