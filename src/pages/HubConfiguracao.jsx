import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { Building2, Bell, Calendar, Mail, MessageSquare, Zap, Settings } from "lucide-react";

/**
 * HUB CONFIGURAÇÃO - Consolida 8+ páginas de config
 * Elimina: ConfiguracaoClinica, ConfiguracaoNotificacao, ConfiguracaoAgenda, etc.
 */
export default function HubConfiguracao() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const tabs = [
    {
      id: 'clinica',
      label: 'Clínica',
      icon: Building2,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoClinica`} />
    },
    {
      id: 'notificacoes',
      label: 'Notificações',
      icon: Bell,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoNotificacao`} />
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoAgenda`} />
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoEmailClinica`} />
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoWhatsApp`} />
    },
    {
      id: 'widget',
      label: 'Widget',
      icon: Zap,
      content: <ConfigFrame url={`${window.location.origin}/ConfiguracaoWidget`} />
    },
    {
      id: 'integracoes',
      label: 'Integrações',
      icon: Settings,
      content: <ConfigFrame url={`${window.location.origin}/IntegracaoGoogle`} />
    }
  ];

  return (
    <RouteGuard requireAuth requireClinica>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Centralize todas as configurações da clínica"
          breadcrumbs={[{ label: "Administração", href: "/Administracao" }, { label: "Configurações" }]}
        />

        <HubTabs tabs={tabs} defaultTab="clinica" />
      </div>
    </RouteGuard>
  );
}

function ConfigFrame({ url }) {
  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: '#e8eaed', height: '700px' }}>
      <iframe 
        src={url}
        className="w-full h-full rounded-xl"
        title="Configuração"
      />
    </div>
  );
}