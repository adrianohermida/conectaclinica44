import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

/**
 * Badge contador de tickets abertos no header
 * Atualiza a cada 30s automaticamente
 */
export default function TicketsCounter({ user, compact = false }) {
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
    staleTime: 25000 // Cache compartilhado (deduplicação)
  });

  const total = ticketsAbertos.length;

  return (
    <Link 
      to={createPageUrl("Atendimento")} 
      className="hidden md:flex w-10 md:w-11 h-10 md:h-11 rounded-full hover:opacity-80 items-center justify-center transition-all relative" 
      style={{ backgroundColor: '#f5f3ff' }} 
      title={`Caixa de Entrada${total > 0 ? ` (${total} tickets abertos)` : ''}`}
    >
      <MessageSquare className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: '#7E57FF' }} />
      {total > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}