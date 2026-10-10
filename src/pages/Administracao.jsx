import React, { useState } from "react";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import CardLink from "@/components/ui/CardLink";
import { 
  Building2, 
  Users, 
  DollarSign, 
  Package, 
  BarChart3,
  MessageSquare,
  Mail,
  Settings as SettingsIcon,
  Bell,
  HardDrive,
  Calendar,
  Shield,
  Zap,
  Folder
} from "lucide-react";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function Administracao() {
  return (
    <RouteGuard requireAuth requireClinica>
      <AdministracaoContent />
    </RouteGuard>
  );
}

function AdministracaoContent() {
  usePerformanceTracker('/Administracao');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const modulosAdministrativos = [
    {
      titulo: "Dados da Clínica",
      descricao: "Informações institucionais, CNPJ e contato",
      icon: Building2,
      link: createPageUrl("ConfiguracaoClinica")
    },
    {
      titulo: "Gestão de Equipe",
      descricao: "Usuários, permissões e controle de acesso",
      icon: Users,
      link: createPageUrl("GestaoEquipe")
    },
    {
      titulo: "Configurações",
      descricao: "Agenda, email, WhatsApp e integrações",
      icon: SettingsIcon,
      link: createPageUrl("HubConfiguracao")
    },
    {
      titulo: "Financeiro",
      descricao: "Contas a pagar, receber e relatórios",
      icon: DollarSign,
      link: createPageUrl("Financeiro")
    },
    {
      titulo: "Estoque",
      descricao: "Produtos, medicamentos e movimentações",
      icon: Package,
      link: createPageUrl("Estoque")
    },
    {
      titulo: "Relatórios",
      descricao: "Analytics e dashboards de performance",
      icon: BarChart3,
      link: createPageUrl("Relatorios")
    },
    {
      titulo: "Repositório",
      descricao: "Gestão de documentos e compliance",
      icon: Folder,
      link: createPageUrl("Repositorio")
    },
    {
      titulo: "Compliance",
      descricao: "LGPD, certidões e auditoria",
      icon: Shield,
      link: createPageUrl("HubCompliance")
    }
  ];

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <PermissionGuard modulo="administracao">
        <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">
          {isLoading ? (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
                <div className="h-8 bg-gray-200 rounded w-56 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-full max-w-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
                    <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4" />
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <PageHeader
                title="Administração"
                description="Gerencie as configurações e módulos administrativos da sua clínica"
                breadcrumbs={[{ label: "Administração" }]}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {modulosAdministrativos.map((modulo, idx) => (
                  <CardLink
                    key={idx}
                    title={modulo.titulo}
                    description={modulo.descricao}
                    icon={modulo.icon}
                    to={modulo.link}
                    badge={modulo.badge}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}