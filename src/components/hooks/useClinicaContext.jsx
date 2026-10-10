import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook que retorna o contexto da clínica do usuário logado
 * Usado em TODOS os módulos para garantir multi-tenant
 */
export function useClinicaContext() {
  const { data: user, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Auth error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000
  });

  const { data: clinica, isLoading: loadingClinica } = useQuery({
    queryKey: ["clinica", user?.clinica_id],
    queryFn: async () => {
      try {
        const result = await base44.entities.Clinica.filter({ id: user.clinica_id });
        return result[0];
      } catch (error) {
        console.error('Clinica fetch error:', error);
        return null;
      }
    },
    enabled: !!user?.clinica_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  return {
    user,
    userData: user,
    clinica,
    clinicaId: user?.clinica_id || null,
    isLoading: loadingUser || loadingClinica,
    isClinicaAtiva: clinica?.ativa && clinica?.status_assinatura !== "cancelada",
    error: userError
  };
}