import React from "react";
import { usePermissions } from "@/components/hooks/usePermissions";
import { AlertCircle } from "lucide-react";

/**
 * Guard de permissões para componentes
 * USO: <PermissionGuard modulo="pacientes" acao="criar">...</PermissionGuard>
 */
export default function PermissionGuard({ children, modulo, acao, fallback = null }) {
  const { podeAcessar, podeExecutar } = usePermissions();

  // Se só verificar módulo
  if (modulo && !acao) {
    if (!podeAcessar(modulo)) {
      return fallback || (
        <div className="pc-card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="font-bold text-gray-800">Acesso Negado</p>
          <p className="text-sm text-gray-600">Você não tem permissão para acessar este módulo</p>
        </div>
      );
    }
  }

  // Se verificar módulo + ação
  if (modulo && acao) {
    if (!podeExecutar(modulo, acao)) {
      return fallback || null;
    }
  }

  return <>{children}</>;
}