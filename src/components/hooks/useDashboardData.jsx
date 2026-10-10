import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";

/**
 * useDashboardData - Batch parallel queries para Dashboard
 * DIA 1-2: Defer 80% queries (só críticas no mount)
 * 
 * @param deferNonCritical - Se true, carrega apenas queries críticas para FCP
 */
export function useDashboardData(clinicaId, enabled = true, deferNonCritical = false) {
  return useQuery({
    queryKey: ["dashboard-batch", clinicaId],
    queryFn: async () => {
      if (!clinicaId) {
        return {
          pacientes: [],
          agendamentos: [],
          prontuarios: [],
          vendas: [],
          medicamentos: [],
          certidoes: [],
          contasReceber: []
        };
      }

      // DIA 1-2: Defer não-críticas - load apenas o essencial para FCP
      if (deferNonCritical) {
        // CRÍTICAS SECURE (FCP): Apenas pacientes + agendamentos hoje
        const hoje = new Date().toISOString().split('T')[0];
        const [pacientes, agendamentosHoje] = await Promise.all([
          secureEntities.Contato.filter({ tipo_contato: "paciente" }).catch(() => []),
          secureEntities.Agendamento.filter({ data: hoje }, "-horario", 10).catch(() => [])
        ]);

        return {
          pacientes: Array.isArray(pacientes) ? pacientes : [],
          agendamentos: Array.isArray(agendamentosHoje) ? agendamentosHoje : [],
          prontuarios: [],
          vendas: [],
          medicamentos: [],
          certidoes: [],
          contasReceber: []
        };
      }

      // FULL LOAD SECURE: Todas as queries em paralelo + OTIMIZADO
      const [
        pacientes,
        agendamentos,
        prontuarios,
        vendas,
        medicamentos,
        certidoes,
        contasReceber
      ] = await Promise.all([
        secureEntities.Contato.filter({ clinica_id: clinicaId, tipo_contato: "paciente" }, "-updated_date", 50).catch(() => []),
        secureEntities.Agendamento.filter({ clinica_id: clinicaId }, "-data", 50).catch(() => []),
        secureEntities.Prontuario.filter({ clinica_id: clinicaId }, "-data_atendimento", 50).catch(() => []),
        secureEntities.Venda.filter({ clinica_id: clinicaId }, "-data_venda", 50).catch(() => []),
        base44.entities.Medicamento.filter({ clinica_id: clinicaId, ativo: true }, "-updated_date", 30).catch(() => []),
        base44.entities.CertidaoRegularidade.filter({ clinica_id: clinicaId, ativo: true }, "-data_validade", 20).catch(() => []),
        base44.entities.ContaReceber.filter({ clinica_id: clinicaId, status: "pendente" }, "-data_vencimento", 30).catch(() => [])
      ]);

      return {
        pacientes: Array.isArray(pacientes) ? pacientes : [],
        agendamentos: Array.isArray(agendamentos) ? agendamentos : [],
        prontuarios: Array.isArray(prontuarios) ? prontuarios : [],
        vendas: Array.isArray(vendas) ? vendas : [],
        medicamentos: Array.isArray(medicamentos) ? medicamentos : [],
        certidoes: Array.isArray(certidoes) ? certidoes : [],
        contasReceber: Array.isArray(contasReceber) ? contasReceber : []
      };
    },
    enabled: !!clinicaId && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}