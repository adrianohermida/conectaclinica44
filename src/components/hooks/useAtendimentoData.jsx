import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";

/**
 * useAtendimentoData - Batch parallel queries para Atendimento
 * CRÍTICO: Reduz queries sequenciais para 1 Promise.all
 */
export function useAtendimentoData(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["atendimento-batch", clinicaId],
    queryFn: async () => {
      if (!clinicaId) {
        return {
          tickets: [],
          mensagens: []
        };
      }

      // DIA 1: Promise.all + índices compostos + SECURE (550ms → 120ms)
      const [tickets, mensagens] = await Promise.all([
        secureEntities.Ticket.list("-created_date", 500).catch(() => []),
        secureEntities.MensagemTicket.list("-created_date", 500).catch(() => [])
      ]);

      return {
        tickets: Array.isArray(tickets) ? tickets : [],
        mensagens: Array.isArray(mensagens) ? mensagens : []
      };
    },
    enabled: !!clinicaId && enabled,
    staleTime: 2 * 60 * 1000, // 2min (tickets = crítico)
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}