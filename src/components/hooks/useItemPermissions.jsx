import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

/**
 * HOOK DE PERMISSÕES POR ITEM - LGPD CRITICAL
 * Retorna permissões granulares (view/edit/delete) para documento ou pasta
 */
export function useItemPermissions(item) {
  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  const isPasta = item?.tipo === 'pasta' || !item?.arquivo_url;
  
  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['permissoes-item', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      
      const query = isPasta 
        ? { pasta_id: item.id }
        : { documento_id: item.id };
      
      return await base44.entities.PermissaoCompliance.filter(query);
    },
    enabled: !!item?.id && !!user,
    staleTime: 2 * 60 * 1000
  });

  // Buscar herança (documento → pasta pai)
  const { data: permissoesHerdadas = [] } = useQuery({
    queryKey: ['permissoes-herdadas', item?.pasta_id],
    queryFn: async () => {
      if (!item?.pasta_id || isPasta) return [];
      
      return await base44.entities.PermissaoCompliance.filter({
        pasta_id: item.pasta_id,
        herdar_subpastas: true
      });
    },
    enabled: !!item?.pasta_id && !isPasta && !!user,
    staleTime: 2 * 60 * 1000
  });

  const permissions = useMemo(() => {
    if (!user || !item) {
      return { canView: false, canEdit: false, canDelete: false, isOwner: false, isAdmin: false };
    }

    // Admin = acesso total
    const isAdmin = user.role === 'admin';
    
    // Proprietário = quem criou
    const isOwner = item.created_by === user.email;

    // Permissão direta
    const minhaPermissao = permissoes.find(p => p.usuario_email === user.email);
    
    // Permissão herdada
    const permissaoHerdada = permissoesHerdadas.find(p => p.usuario_email === user.email);
    
    // Combinar permissões (OR lógico)
    const perm = minhaPermissao || permissaoHerdada;

    return {
      canView: isAdmin || isOwner || perm?.visualizar || false,
      canEdit: isAdmin || isOwner || perm?.editar || false,
      canDelete: isAdmin || isOwner || perm?.excluir || false,
      isOwner,
      isAdmin,
      hasAnyPermission: isAdmin || isOwner || !!perm,
      permissao: perm
    };
  }, [user, item, permissoes, permissoesHerdadas]);

  return { ...permissions, isLoading };
}