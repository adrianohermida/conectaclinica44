import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
    retry: false
  });

  const isAdmin = user?.role === "admin";
  const isMedico = user?.perfil === "medico";
  const isRecepcionista = user?.perfil === "recepcionista";
  const isFinanceiro = user?.perfil === "financeiro";

  const hasPermission = (modulo) => {
    if (isAdmin) return true;
    if (!user?.permissoes) return true;
    return user.permissoes.modulos?.includes(modulo);
  };

  const canEdit = (recurso) => {
    if (isAdmin) return true;
    if (!user?.permissoes) return true;
    return user.permissoes.acoes?.includes(`${recurso}:edit`);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    isMedico,
    isRecepcionista,
    isFinanceiro,
    hasPermission,
    canEdit,
    logout: () => base44.auth.logout()
  };
}