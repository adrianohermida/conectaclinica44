import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Shield, FileText, Eye, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * HUB COMPLIANCE - Centro de Gestão de Compliance
 * LGPD, Certidões, Auditoria (acesso controlado)
 */
export default function HubCompliance() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === 'admin';

  const cards = [
    {
      titulo: "LGPD & Privacidade",
      descricao: "Termos legais, aceites e gestão de consentimento",
      icone: Shield,
      cor: "#7E57FF",
      rota: createPageUrl("GestaoTermosLegais"),
      acessivel: true
    },
    {
      titulo: "Certidões",
      descricao: "Gestão de certidões fiscais e regularidade",
      icone: FileText,
      cor: "#0B7A9E",
      rota: createPageUrl("ComplianceCertidoes"),
      acessivel: true
    },
    {
      titulo: "Auditoria",
      descricao: "Logs de acesso, métricas de segurança e compliance",
      icone: Eye,
      cor: "#ea4335",
      rota: createPageUrl("AuditoriaCompliance"),
      acessivel: isAdmin,
      badge: "Admin"
    }
  ];

  return (
    <RouteGuard requireAuth requireClinica>
      <div className="space-y-6">
        <PageHeader
          title="Hub de Compliance"
          description="Gestão unificada de LGPD, certidões e auditoria"
          breadcrumbs={[
            { label: "Administração", href: createPageUrl("Administracao") },
            { label: "Compliance" }
          ]}
        />

        {/* Cards de Navegação */}
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => {
            if (!card.acessivel) {
              return (
                <div
                  key={card.titulo}
                  className="pc-card p-6 opacity-50 cursor-not-allowed relative overflow-hidden"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${card.cor}15` }}
                    >
                      <card.icone className="w-6 h-6" style={{ color: card.cor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--pc-text-primary)' }}>
                        {card.titulo}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--pc-text-secondary)' }}>
                        {card.descricao}
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--pc-error-50)', color: 'var(--pc-error)' }}>
                      {card.badge}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={card.titulo}
                to={card.rota}
                className="pc-card p-6 hover:shadow-lg transition-all group relative overflow-hidden"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${card.cor}15` }}
                  >
                    <card.icone className="w-6 h-6" style={{ color: card.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold mb-1 group-hover:text-[var(--pc-primary)] transition-colors" style={{ color: 'var(--pc-text-primary)' }}>
                      {card.titulo}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--pc-text-secondary)' }}>
                      {card.descricao}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: card.cor }}>
                  <span>Acessar</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                {card.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--pc-warning-50)', color: 'var(--pc-warning)' }}>
                      {card.badge}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </RouteGuard>
  );
}