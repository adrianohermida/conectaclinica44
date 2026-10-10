import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar permissões do usuário (RBAC)
 * OTIMIZADO: Cache compartilhado via React Query
 */
export function usePermissions() {
  const { data: user, isLoading: loading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000, // 10min cache agressivo
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // NUNCA refetch se tem cache
  });

  const isSuperAdmin = user?.role === 'admin';
  const isAdminClinica = user?.perfil === 'admin_clinica';
  const isAdmin = isSuperAdmin || isAdminClinica;
  
  /**
   * Verifica se usuário pode acessar um módulo
   * @param {string} modulo - Nome do módulo
   * @returns {boolean}
   */
  const podeAcessar = (modulo) => {
    if (isSuperAdmin) return true;
    if (isAdminClinica) return true;
    if (!user?.permissoes?.modulos) return false;
    return user.permissoes.modulos.includes(modulo) || user.permissoes.modulos.includes('*');
  };

  /**
   * Verifica se usuário pode executar ação em um módulo
   * @param {string} modulo - Nome do módulo
   * @param {string} acao - Ação (visualizar, criar, editar, excluir, etc)
   * @returns {boolean}
   */
  const podeExecutar = (modulo, acao) => {
    if (isSuperAdmin) return true;
    if (isAdminClinica) return true;
    if (!user?.permissoes?.acoes?.[modulo]) return false;
    return user.permissoes.acoes[modulo].includes(acao) || user.permissoes.acoes[modulo].includes('*');
  };

  /**
   * Verifica se usuário tem um perfil específico
   * @param {string} perfil - Nome do perfil
   * @returns {boolean}
   */
  const temPerfil = (perfil) => {
    return user?.perfil === perfil;
  };

  return {
    user,
    isAdmin,
    isSuperAdmin,
    isAdminClinica,
    podeAcessar,
    podeExecutar,
    temPerfil,
    perfil: user?.perfil,
    cargo: user?.cargo,
    role: user?.role,
    permissoes: user?.permissoes,
    loading
  };
}

export default usePermissions;