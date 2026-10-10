import React, { lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { Brain, Activity, DollarSign, Zap, GitBranch, Loader2 } from "lucide-react";

const DashboardPerformance = lazy(() => import("@/pages/DashboardPerformance"));
const MapaRotas = lazy(() => import("@/pages/MapaRotas"));
const MetricasAssinaturas = lazy(() => import("@/pages/MetricasAssinaturas"));

/**
 * HUB MONITORAMENTO - Consolidação de 4 páginas de monitoramento
 * MonitoramentoIA, MonitoramentoWidget, MonitoramentoCustos, MonitoramentoConsumo → 1 hub
 */
export default function HubMonitoramento() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const tabs = [
    {
      id: 'performance',
      label: 'Performance',
      icon: Zap,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <DashboardPerformance />
      </Suspense>
    },
    {
      id: 'rotas',
      label: 'Rotas',
      icon: GitBranch,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <MapaRotas />
      </Suspense>
    },
    {
      id: 'metricas',
      label: 'Métricas',
      icon: Activity,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <MetricasAssinaturas />
      </Suspense>
    }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Hub de Monitoramento"
          description="Performance, rotas e métricas consolidadas"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Monitoramento" }]}
        />

        <HubTabs tabs={tabs} defaultTab="performance" />
      </div>
    </RouteGuard>
  );
}