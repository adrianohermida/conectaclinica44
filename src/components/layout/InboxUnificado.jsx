import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Inbox } from "lucide-react";

/**
 * INBOX UNIFICADO - Tickets + Notificações em 1 ícone
 * SOLUÇÃO: ao invés de ter 2 ícones (Bell + Inbox), só 1 ícone mostra tudo
 */
export default function InboxUnificado({ user }) {
  // Tickets abertos
  const { data: ticketsAbertos = [] } = useQuery({
    queryKey: ['tickets-header-count', user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      try {
        return await base44.entities.Ticket.filter({ 
          clinica_id: user.clinica_id,
          status: 'aberto'
        });
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: !!user?.clinica_id,
    initialData: [],
    staleTime: 25000
  });

  // Notificações não lidas
  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes-count', user?.id, user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return [];
      try {
        return await base44.entities.MensagemInterna.filter(
          { 
            destinatario_id: user.id,
            clinica_id: user.clinica_id,
            lida: false
          },
          '-created_date',
          10
        );
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: !!user?.id && !!user?.clinica_id,
    initialData: []
  });

  const totalNaoLidos = ticketsAbertos.length + notificacoes.length;

  return (
    <div className="relative">
      <Link
        to={createPageUrl("Helpdesk")}
        className="flex rounded-full hover:opacity-80 items-center justify-center transition-all"
        style={{ backgroundColor: '#f5f3ff', minWidth: '44px', minHeight: '44px', width: '44px', height: '44px' }}
        title="Caixa de Entrada"
        aria-label="Caixa de Entrada"
      >
        <Inbox className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: '#7E57FF' }} aria-hidden="true" />
      </Link>
      {totalNaoLidos > 0 && (
        <span 
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold"
          style={{ backgroundColor: '#ea4335', color: 'white' }}
        >
          {totalNaoLidos > 99 ? "99+" : totalNaoLidos}
        </span>
      )}
    </div>
  );
}