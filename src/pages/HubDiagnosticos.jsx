import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { AlertCircle, Database, Mail, Shield, Zap, FileText } from "lucide-react";

/**
 * HUB DIAGNÓSTICOS - Consolidação de 6+ páginas diagnóstico
 * Reduz dispersão, centraliza auditorias críticas
 */
export default function HubDiagnosticos() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <div className="pc-card p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-bold">Acesso exclusivo SuperAdmin</p>
        </div>
      </RouteGuard>
    );
  }

  const tabs = [
    {
      id: 'producao',
      label: 'Produção',
      icon: Zap,
      content: <DiagnosticoFrame 
        title="Diagnóstico de Produção"
        description="Erros críticos, incidentes e rollbacks em ambiente de produção"
        url={`${window.location.origin}/DiagnosticoProducao`}
      />
    },
    {
      id: 'planos',
      label: 'Planos',
      icon: Shield,
      content: <DiagnosticoFrame 
        title="Diagnóstico de Planos"
        description="Isolamento multi-tenant e validação de módulos por plano"
        url={`${window.location.origin}/DiagnosticoPlanos`}
      />
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      content: <DiagnosticoFrame 
        title="Diagnóstico de Email"
        description="Validação de domínios, webhooks e isolamento SendGrid"
        url={`${window.location.origin}/DiagnosticoEmailConvites`}
      />
    },
    {
      id: 'medico_id',
      label: 'Migração',
      icon: Database,
      content: <DiagnosticoFrame 
        title="Diagnóstico Migração Medico_ID"
        description="Status da migração CRM → usuario_id em prontuários"
        url={`${window.location.origin}/DiagnosticoMigracaoMedicoId`}
      />
    }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Diagnósticos Técnicos"
          description="Auditorias consolidadas de sistemas críticos"
          breadcrumbs={[{ label: "Diagnósticos" }]}
        />

        <HubTabs tabs={tabs} defaultTab="producao" />
      </div>
    </RouteGuard>
  );
}

function DiagnosticoFrame({ title, description, url }) {
  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: '#e8eaed', height: '800px' }}>
      <iframe 
        src={url}
        className="w-full h-full rounded-xl"
        title={title}
      />
    </div>
  );
}