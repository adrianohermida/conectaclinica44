import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * PERMISSIONS GUARD HOOK
 * Valida se usuário tem permissão para acessar recurso
 */
export function usePermissionsGuard(itemId, itemType = 'documento') {
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000
  });

  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['permissoes-guard', itemId],
    queryFn: async () => {
      if (!itemId || !user) return [];
      
      const query = itemType === 'pasta' 
        ? { pasta_id: itemId }
        : { documento_id: itemId };
      
      return await base44.entities.PermissaoCompliance.filter(query);
    },
    enabled: !!itemId && !!user,
    staleTime: 5 * 60 * 1000
  });

  // Admin tem acesso total
  const isAdmin = user?.role === 'admin';

  // Proprietário tem acesso total
  const isOwner = user && permissoes.some(p => p.created_by === user.email);

  // Verificar permissões específicas
  const minhaPermissao = permissoes.find(p => p.usuario_email === user?.email);

  return {
    isLoading,
    canView: isAdmin || isOwner || minhaPermissao?.visualizar || false,
    canEdit: isAdmin || isOwner || minhaPermissao?.editar || false,
    canDelete: isAdmin || isOwner || minhaPermissao?.excluir || false,
    hasPermission: isAdmin || isOwner || !!minhaPermissao,
    permissao: minhaPermissao
  };
}