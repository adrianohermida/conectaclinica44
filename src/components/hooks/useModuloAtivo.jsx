import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar se módulo está ativo no plano da clínica
 * @param {string} moduloNome - Nome do módulo (ex: 'prontuarios', 'planos_tratamento')
 * @returns {{ ativo: boolean, isLoading: boolean, planoAtual: object }}
 */
export function useModuloAtivo(moduloNome) {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: assinatura, isLoading } = useQuery({
    queryKey: ["assinatura-modulos", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return null;
      const assinaturas = await base44.entities.AssinaturaClinica.filter({ 
        clinica_id: user.clinica_id 
      });
      return assinaturas[0] || null;
    },
    enabled: !!user?.clinica_id,
    staleTime: 5 * 60 * 1000, // Cache 5min
    gcTime: 10 * 60 * 1000
  });

  // Admin/SuperAdmin = acesso total
  const isAdminTotal = user?.role === 'admin' || user?.perfil === 'admin_clinica';

  // Verificar se módulo está incluído
  const modulosInclusos = assinatura?.modulos_inclusos || [];
  const ativo = isAdminTotal || 
    modulosInclusos.includes('*') || 
    modulosInclusos.includes(moduloNome);

  return {
    ativo,
    isLoading,
    planoAtual: assinatura?.plano_slug || 'trial',
    modulosInclusos
  };
}