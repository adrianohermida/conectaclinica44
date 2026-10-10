import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * useRelatoriosData - Batch parallel queries para Relatórios
 * CRÍTICO: 7 queries sequenciais → 1 Promise.all
 * Reduz latência de ~7x200ms = 1400ms → ~250ms
 */
export function useRelatoriosData(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["relatorios-batch", clinicaId],
    queryFn: async () => {
      if (!clinicaId) {
        return {
          agendamentos: [],
          pacientes: [],
          vendas: [],
          medicamentos: [],
          jornadas: [],
          prontuarios: [],
          planos: []
        };
      }

      // CRÍTICO: Promise.all - 7 queries em paralelo
      const [agendamentos, pacientes, vendas, medicamentos, jornadas, prontuarios, planos] = await Promise.all([
        base44.entities.Agendamento.filter({ clinica_id: clinicaId }, "-data", 500).catch(() => []),
        base44.entities.Contato.filter({ clinica_id: clinicaId, tipo_contato: "paciente" }).catch(() => []),
        base44.entities.Venda.filter({ clinica_id: clinicaId }, "-data_venda", 500).catch(() => []),
        base44.entities.Medicamento.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.JornadaPaciente.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.Prontuario.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.PlanoTratamento.filter({ clinica_id: clinicaId }).catch(() => [])
      ]);

      return {
        agendamentos: Array.isArray(agendamentos) ? agendamentos : [],
        pacientes: Array.isArray(pacientes) ? pacientes : [],
        vendas: Array.isArray(vendas) ? vendas : [],
        medicamentos: Array.isArray(medicamentos) ? medicamentos : [],
        jornadas: Array.isArray(jornadas) ? jornadas : [],
        prontuarios: Array.isArray(prontuarios) ? prontuarios : [],
        planos: Array.isArray(planos) ? planos : []
      };
    },
    enabled: !!clinicaId && enabled,
    staleTime: 15 * 60 * 1000, // 15min - relatórios mudam devagar
    gcTime: 20 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}