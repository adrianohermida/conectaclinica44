import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * useAdministracaoData - Batch parallel queries para Administração
 * CRÍTICO: Reduz queries sequenciais para 1 Promise.all
 */
export function useAdministracaoData(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["administracao-batch", clinicaId],
    queryFn: async () => {
      if (!clinicaId) {
        return {
          medicos: [],
          medicamentos: [],
          produtos: [],
          certidoes: [],
          configuracao: null,
          assinatura: null,
          planos: []
        };
      }

      // CRÍTICO: Promise.all - todas queries em paralelo
      const [
        medicos,
        medicamentos,
        produtos,
        certidoes,
        configuracoes,
        assinaturas,
        planos
      ] = await Promise.all([
        base44.entities.Medico.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.Medicamento.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.Produto.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.CertidaoRegularidade.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.ConfiguracaoClinica.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.AssinaturaClinica.filter({ clinica_id: clinicaId }).catch(() => []),
        base44.entities.PlanoModulo.list().catch(() => [])
      ]);

      return {
        medicos: Array.isArray(medicos) ? medicos : [],
        medicamentos: Array.isArray(medicamentos) ? medicamentos : [],
        produtos: Array.isArray(produtos) ? produtos : [],
        certidoes: Array.isArray(certidoes) ? certidoes : [],
        configuracao: configuracoes?.[0] || null,
        assinatura: assinaturas?.[0] || null,
        planos: Array.isArray(planos) ? planos : []
      };
    },
    enabled: !!clinicaId && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}