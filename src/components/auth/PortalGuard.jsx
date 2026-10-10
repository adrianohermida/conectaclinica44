import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * PortalGuard - Proteção específica para Portal do Paciente
 * CRÍTICO: Valida paciente_id + clinica_id antes de renderizar
 */
export default function PortalGuard({ children, skipAuth = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validatePortalAccess = async () => {
      try {
        // SKIP AUTH se magic link já validado
        if (skipAuth) {
          setLoading(false);
          return;
        }

        const user = await base44.auth.me();

        // Não autenticado → Login
        if (!user) {
          window.location.href = createPageUrl("Home");
          return;
        }

        console.log('🔐 [PORTAL GUARD] Validando:', { 
          email: user.email, 
          clinica_id: user.clinica_id, 
          paciente_id: user.paciente_id,
          contato_id: user.contato_id
        });

        // Sem clínica → Onboarding
        if (!user.clinica_id) {
          console.warn('⚠️ [PORTAL GUARD] User sem clinica_id');
          window.location.href = createPageUrl("OnboardingClinica");
          return;
        }

        // ARQUITETURA V2: Sem contato_id → não é paciente
        if (!user.contato_id && !user.paciente_id) {
          console.warn('⚠️ [PORTAL GUARD] User sem contato_id - não é paciente');
          setError({
            title: 'Acesso Restrito',
            message: 'Este portal é exclusivo para pacientes. Você será redirecionado para o dashboard principal.',
            redirect: 'Dashboard'
          });
          setTimeout(() => {
            window.location.href = createPageUrl("Dashboard");
          }, 3000);
          return;
        }

        // Tudo OK
        console.log('✅ [PORTAL GUARD] Acesso permitido');
        setLoading(false);

      } catch (err) {
        console.error('❌ [PORTAL GUARD] Erro na validação:', err);
        setError({
          title: 'Erro de Autenticação',
          message: 'Não foi possível validar seu acesso. Tente novamente.',
          redirect: 'Home'
        });
        setTimeout(() => {
          window.location.href = createPageUrl("Home");
        }, 3000);
      }
    };

    validatePortalAccess();
  }, [skipAuth]);

  if (loading && !error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4F7FA'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 style={{ 
            width: '48px', 
            height: '48px', 
            color: '#7E57FF',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#5f6368', fontSize: '14px' }}>
            Validando acesso ao portal...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4F7FA',
        padding: '20px'
      }}>
        <div style={{ 
          maxWidth: '500px', 
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid #e8eaed'
        }}>
          <AlertCircle style={{ 
            width: '64px', 
            height: '64px', 
            color: '#fbbc04',
            margin: '0 auto 24px'
          }} />
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#202124',
            marginBottom: '12px'
          }}>
            {error.title}
          </h2>
          <p style={{ 
            fontSize: '16px', 
            color: '#5f6368',
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            {error.message}
          </p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f5f3ff',
            borderTop: '4px solid #7E57FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ 
            fontSize: '12px', 
            color: '#9aa0a6',
            marginTop: '16px'
          }}>
            Redirecionando...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}