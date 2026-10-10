import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";

/**
 * useFinanceiroData - Batch parallel queries para Financeiro
 * CRÍTICO: 5 queries sequenciais → 1 Promise.all
 */
export function useFinanceiroData(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["financeiro-batch", clinicaId],
    queryFn: async () => {
      if (!clinicaId) {
        return {
          vendas: [],
          produtos: [],
          contasPagar: [],
          contasReceber: [],
          pacientes: []
        };
      }

      // CRÍTICO: Promise.all - 5 queries SECURE em paralelo
      const [vendas, produtos, contasPagar, contasReceber, pacientes] = await Promise.all([
        secureEntities.Venda.list("-data_venda", 100).catch(() => []),
        secureEntities.Produto.list("-created_date", 100).catch(() => []),
        secureEntities.ContaPagar.list("-data_vencimento", 100).catch(() => []),
        secureEntities.ContaReceber.list("-data_vencimento", 100).catch(() => []),
        secureEntities.Contato.filter({ tipo_contato: "paciente" }).catch(() => [])
      ]);

      return {
        vendas: Array.isArray(vendas) ? vendas : [],
        produtos: Array.isArray(produtos) ? produtos : [],
        contasPagar: Array.isArray(contasPagar) ? contasPagar : [],
        contasReceber: Array.isArray(contasReceber) ? contasReceber : [],
        pacientes: Array.isArray(pacientes) ? pacientes : []
      };
    },
    enabled: !!clinicaId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
}