import React, { lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { Shield, TestTube, FileText, Zap, Loader2 } from "lucide-react";

const TestesE2E = lazy(() => import("@/pages/TestesE2E"));
const TestesCompliance = lazy(() => import("@/pages/TestesCompliance"));

/**
 * HUB TESTES - Consolidação REAL
 * TestesE2E + TestesCompliance + TestesAutomatizados → 1 hub
 */
export default function HubTestes() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const tabs = [
    {
      id: 'e2e',
      label: 'E2E Isolamento',
      icon: Shield,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <TestesE2E />
      </Suspense>
    },
    {
      id: 'compliance',
      label: 'Compliance LGPD',
      icon: FileText,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <TestesCompliance />
      </Suspense>
    }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Hub de Testes"
          description="Validação de isolamento multi-tenant e compliance LGPD"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Testes" }]}
        />

        <HubTabs tabs={tabs} defaultTab="e2e" />
      </div>
    </RouteGuard>
  );
}