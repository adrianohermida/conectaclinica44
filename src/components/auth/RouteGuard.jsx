import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

/**
 * RouteGuard - Proteção obrigatória para páginas autenticadas
 * CRÍTICO: Previne acesso não autorizado e vazamento de dados LGPD
 */
export default function RouteGuard({ children, requireAuth = true, requireClinica = false }) {
  const [loading, setLoading] = useState(requireAuth); // Não mostrar loading se não requer auth
  const [authenticated, setAuthenticated] = useState(false);
  const [hasClinica, setHasClinica] = useState(false);

  useEffect(() => {
    // Páginas públicas: sem loading
    if (!requireAuth) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        setAuthenticated(!!user);
        setHasClinica(!!user?.clinica_id);

        if (requireAuth && !user) {
          window.location.href = createPageUrl("Home");
          return;
        }

        if (requireClinica && !user?.clinica_id && user?.role !== 'admin') {
          window.location.href = createPageUrl("OnboardingClinica");
          return;
        }

        setLoading(false);
      } catch (error) {
        if (requireAuth) {
          window.location.href = createPageUrl("Home");
        } else {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, [requireAuth, requireClinica]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--pc-bg-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ 
            width: '48px', 
            height: '48px', 
            color: 'var(--pc-primary)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: 'var(--pc-text-secondary)', fontSize: 'var(--pc-text-sm)' }}>
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}