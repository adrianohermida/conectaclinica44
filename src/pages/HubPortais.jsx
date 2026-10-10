import React, { lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { User, Stethoscope, Users, Loader2 } from "lucide-react";

const PortalPaciente = lazy(() => import("@/pages/PortalPaciente"));
const PortalMedico = lazy(() => import("@/pages/PortalMedico"));

/**
 * HUB PORTAIS - Consolidação de 3 portais
 * PortalPaciente, PortalMedico, PortalCliente → 1 hub
 */
export default function HubPortais() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const tabs = [
    {
      id: 'paciente',
      label: 'Portal Paciente',
      icon: User,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <PortalPaciente />
      </Suspense>
    },
    {
      id: 'medico',
      label: 'Portal Médico',
      icon: Stethoscope,
      content: <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />}>
        <PortalMedico />
      </Suspense>
    }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Portais de Acesso"
          description="Pacientes e médicos consolidados"
          breadcrumbs={[{ label: "Administração", href: "/Administracao" }, { label: "Portais" }]}
        />

        <HubTabs tabs={tabs} defaultTab="paciente" />
      </div>
    </RouteGuard>
  );
}