import React from "react";
import { useItemPermissions } from "@/components/hooks/useItemPermissions";
import { toast } from "sonner";
import { Shield } from "lucide-react";

/**
 * WRAPPER DE AÇÕES PROTEGIDAS - LGPD ENFORCEMENT
 * Valida permissões antes de executar ação
 */
export function ProtectedAction({ item, action, requiredPermission, children, onExecute }) {
  const { canView, canEdit, canDelete, isLoading } = useItemPermissions(item);

  const hasPermission = () => {
    if (requiredPermission === 'view') return canView;
    if (requiredPermission === 'edit') return canEdit;
    if (requiredPermission === 'delete') return canDelete;
    return false;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    
    if (isLoading) {
      toast.info("Validando permissões...");
      return;
    }

    if (!hasPermission()) {
      toast.error(`🔒 Sem permissão para ${action}`);
      return;
    }

    onExecute();
  };

  const allowed = hasPermission();

  return React.cloneElement(children, {
    onClick: handleClick,
    disabled: !allowed || isLoading,
    className: `${children.props.className || ''} ${!allowed ? 'opacity-50 cursor-not-allowed' : ''}`,
    title: !allowed ? `Sem permissão para ${action}` : children.props.title
  });
}