import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";

/**
 * useProntuariosData - Batch parallel queries para Prontuários
 * CRÍTICO: Reduz queries sequenciais para 1 Promise.all
 */
export function useProntuariosData(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["prontuarios-batch", clinicaId],
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    queryFn: async () => {
      if (!clinicaId) {
        return {
          prontuarios: [],
          pacientes: [],
          medicos: [],
          documentos: []
        };
      }

      // PERFORMANCE UPGRADE: Backend function agregada (4 queries → 1 call)
      try {
        const response = await base44.functions.invoke('getProntuariosCompleto', {});
        
        if (response.data?.success && response.data?.data) {
          return response.data.data;
        }
        
        // Se resposta inválida, usar fallback
        throw new Error('Resposta inválida do backend');
      } catch (error) {
        // FALLBACK SECURE: Promise.all (caso backend falhe)
        const [prontuarios, pacientes, medicos, documentos] = await Promise.all([
          secureEntities.Prontuario.filter({ clinica_id: clinicaId }, "-data_atendimento", 100).catch(() => []),
          secureEntities.Contato.filter({ clinica_id: clinicaId, tipo_contato: "paciente" }, "-updated_date", 50).catch(() => []),
          secureEntities.Medico.filter({ clinica_id: clinicaId }, "-updated_date", 20).catch(() => []),
          secureEntities.DocumentoPaciente.filter({ clinica_id: clinicaId }, "-data_upload", 100).catch(() => [])
        ]);

        return {
          prontuarios: Array.isArray(prontuarios) ? prontuarios : [],
          pacientes: Array.isArray(pacientes) ? pacientes : [],
          medicos: Array.isArray(medicos) ? medicos : [],
          documentos: Array.isArray(documentos) ? documentos : []
        };
      }
    },
    enabled: !!clinicaId && enabled,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}