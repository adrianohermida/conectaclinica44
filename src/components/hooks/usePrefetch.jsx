import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * usePrefetch - Prefetch crítico de dados para rotas comuns
 * Executa após 2s do mount para não bloquear carregamento inicial
 */
export function usePrefetch(clinicaId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clinicaId) return;

    // Defer: Prefetch após 2s (não bloquear mount)
    const timer = setTimeout(() => {
      // Prefetch das entidades mais acessadas
      queryClient.prefetchQuery({
        queryKey: ["pacientes", clinicaId],
        queryFn: () => base44.entities.Paciente.filter({ clinica_id: clinicaId }),
        staleTime: 5 * 60 * 1000, // Cache 5min
      });

      queryClient.prefetchQuery({
        queryKey: ["agendamentos", clinicaId],
        queryFn: () => base44.entities.Agendamento.filter({ clinica_id: clinicaId }),
        staleTime: 2 * 60 * 1000, // Cache 2min (mais volátil)
      });

      queryClient.prefetchQuery({
        queryKey: ["prontuarios", clinicaId],
        queryFn: () => base44.entities.Prontuario.filter({ clinica_id: clinicaId }),
        staleTime: 5 * 60 * 1000,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [clinicaId, queryClient]);
}

export default usePrefetch;