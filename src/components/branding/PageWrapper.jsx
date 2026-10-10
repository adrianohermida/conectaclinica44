import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ModuleTour from "@/components/onboarding/ModuleTour";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

/**
 * PageWrapper - Wrapper padrão para todas páginas ConectaClínica
 * 
 * CONSOLIDAÇÃO: Padronizar estrutura de 68 páginas
 * FEATURES: Auth + Permissions + Tour + Performance tracking automático
 * 
 * Props:
 * - title: string
 * - description: string
 * - breadcrumbs: array
 * - action: ReactNode
 * - showLGPDShield: boolean
 * - requireAuth: boolean
 * - requireClinica: boolean
 * - modulo: string (para PermissionGuard)
 * - tourSteps: array
 * - children: ReactNode
 */
export default function PageWrapper({
  title,
  description,
  breadcrumbs,
  action,
  showLGPDShield = false,
  requireAuth = true,
  requireClinica = true,
  modulo = null,
  tourSteps = null,
  pageName,
  children
}) {
  // CRITICAL: Performance tracking automático
  usePerformanceTracker(pageName ? `/${pageName}` : undefined);

  const content = (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden min-w-0">
      {tourSteps && <ModuleTour moduleName={modulo || pageName} steps={tourSteps} />}
      
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        action={action}
        showLGPDShield={showLGPDShield}
      />
      
      {children}
    </div>
  );

  // GUARDS: Auth → Permissions
  if (modulo) {
    return (
      <RouteGuard requireAuth={requireAuth} requireClinica={requireClinica}>
        <PermissionGuard modulo={modulo}>
          {content}
        </PermissionGuard>
      </RouteGuard>
    );
  }

  if (requireAuth) {
    return (
      <RouteGuard requireAuth={requireAuth} requireClinica={requireClinica}>
        {content}
      </RouteGuard>
    );
  }

  return content;
}