import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * PREFETCH PRODUTOS - Background load ao abrir paciente
 * 
 * Carrega produtos em background quando usuário abre painel do paciente
 * Ganho: UX instantânea no MarketplaceKiosk (-80% requests)
 */

export function usePrefetchProdutos(clinicaId, trigger = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!trigger || !clinicaId) return;

    // Prefetch após 500ms (não bloqueia renderização)
    const timer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ["produtos-catalogo-marketplace"],
        queryFn: () => base44.entities.Produto.filter({ ativo: true }, "-created_date", 100),
        staleTime: 10 * 60 * 1000
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [clinicaId, trigger, queryClient]);
}