import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para contadores real-time de status do agente
 * Retorna badges numéricos para menu vertical
 * 
 * @param {string} clinicaId - ID da clínica (null = SuperAdmin global)
 * @returns {Object} { ticketsAbertos, consultasHoje, faturasPendentes, leadsPendentes, isLoading }
 */
export function useAgenteStatus(clinicaId = null) {
  const { data, isLoading } = useQuery({
    queryKey: ['agente-status', clinicaId],
    queryFn: async () => {
      // Query paralela de contadores
      const [tickets, consultas, faturas, leads] = await Promise.all([
        // Tickets abertos
        base44.entities.Ticket.filter({
          clinica_id: clinicaId,
          status: 'aberto'
        }).catch(() => []),
        
        // Consultas hoje
        base44.entities.Agendamento.filter({
          clinica_id: clinicaId,
          data_agendamento: new Date().toISOString().split('T')[0],
          status: 'confirmado'
        }).catch(() => []),
        
        // Faturas pendentes
        base44.entities.Fatura.filter({
          clinica_id: clinicaId,
          status: 'pendente'
        }).catch(() => []),
        
        // Leads pendentes follow-up (se SuperAdmin)
        clinicaId === null ? base44.entities.LeadSite.filter({
          status: { $in: ['novo', 'agendamento_confirmado'] }
        }).catch(() => []) : Promise.resolve([])
      ]);

      return {
        ticketsAbertos: tickets.length,
        consultasHoje: consultas.length,
        faturasPendentes: faturas.length,
        leadsPendentes: leads.length
      };
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Atualiza a cada 1 minuto
    enabled: true
  });

  return {
    ticketsAbertos: data?.ticketsAbertos || 0,
    consultasHoje: data?.consultasHoje || 0,
    faturasPendentes: data?.faturasPendentes || 0,
    leadsPendentes: data?.leadsPendentes || 0,
    isLoading
  };
}