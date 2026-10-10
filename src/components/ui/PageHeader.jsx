import React from "react";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Breadcrumb from "./Breadcrumb";
import { useBreadcrumbs } from "@/components/hooks/useBreadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PageHeader({ 
  title, 
  description, 
  breadcrumbs = null, 
  action,
  showBack = false,
  showLGPDShield = false
}) {
  const navigate = useNavigate();

  // Buscar user para breadcrumbs dinâmicos
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  // Hook sempre chamado na mesma ordem (regras de hooks)
  const autoBreadcrumbs = useBreadcrumbs(user, breadcrumbs);
  const dynamicBreadcrumbs = breadcrumbs && breadcrumbs.length > 0 
    ? breadcrumbs 
    : autoBreadcrumbs;

  return (
    <div className="pc-card p-6 mb-6">
      {dynamicBreadcrumbs && dynamicBreadcrumbs.length > 0 && <Breadcrumb items={dynamicBreadcrumbs} />}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="mt-1 p-2 hover:bg-gray-100 rounded-full transition-all"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-label="Voltar para página anterior"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold mb-1" style={{ color: 'var(--pc-text-primary)' }}>
                  {title}
                </h1>
                {showLGPDShield && (
                  <Link
                    to={createPageUrl("AuditoriaAceitesTermos")}
                    className="flex items-center justify-center rounded-xl transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--pc-primary-50)', border: '2px solid var(--pc-primary-100)', minWidth: '44px', minHeight: '44px' }}
                    title="Meus Aceites LGPD - Portal do Titular"
                    aria-label="Acessar portal LGPD com meus aceites de termos"
                  >
                    <Shield className="w-5 h-5" style={{ color: 'var(--pc-primary)' }} />
                  </Link>
                )}
              </div>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
          </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}