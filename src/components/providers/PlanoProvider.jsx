import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const PlanoContext = createContext(null);

export function PlanoProvider({ children, user }) {
  const queryClient = useQueryClient();
  const [planoAtivo, setPlanoAtivo] = useState(null);

  const { data: planoData, isLoading, error } = useQuery({
    queryKey: ["plano-ativo", user?.clinica_id],
    queryFn: async () => {
      console.log('[PlanoProvider] 🔍 Iniciando query - user:', user?.email, 'role:', user?.role, 'clinica_id:', user?.clinica_id);
      
      // 1. CRÍTICO: SuperAdmin = WILDCARD SEMPRE
      if (user?.role === 'admin') {
        console.log('[PlanoProvider] ✅ Admin detectado - retornando wildcard');
        return { 
          modulos_inclusos: ['*'], 
          plano_slug: 'admin', 
          status: 'ativa',
          _source: 'admin_wildcard'
        };
      }
      
      // 2. Sem clinica_id = trial básico
      if (!user?.clinica_id) {
        console.log('[PlanoProvider] ⚠️ Sem clinica_id - trial');
        return { 
          modulos_inclusos: ['dashboard', 'agenda', 'pacientes', 'prontuarios'], 
          plano_slug: 'trial',
          _source: 'no_clinica_trial'
        };
      }
      
      console.log('[PlanoProvider] 🔎 Buscando assinatura para clinica_id:', user.clinica_id);
      
      // 3. BUSCAR ASSINATURA - SEM service role (causa erro)
      let assinaturas = [];
      try {
        assinaturas = await base44.entities.AssinaturaClinica.filter({
          clinica_id: user.clinica_id
        });
        console.log('[PlanoProvider] 📊 Assinaturas encontradas:', assinaturas.length);
      } catch (error) {
        console.error('[PlanoProvider] ❌ Erro ao buscar assinatura:', error.message);
        // FALLBACK: Enterprise direto
        return {
          modulos_inclusos: ['*'],
          plano_slug: 'enterprise',
          status: 'ativa',
          _source: 'error_fallback'
        };
      }

      // 4. SEM ASSINATURA = FALLBACK ENTERPRISE (não criar - causa loop)
      if (assinaturas.length === 0) {
        console.warn('[PlanoProvider] ⚠️ Sem assinatura - usando Enterprise fallback');
        return {
          modulos_inclusos: ['*'],
          plano_slug: 'enterprise',
          status: 'ativa',
          _source: 'no_subscription_fallback'
        };
      }

      // 5. ASSINATURA ENCONTRADA
      const assinatura = assinaturas[0];
      console.log('[PlanoProvider] ✅ Assinatura carregada:', assinatura.plano_slug, 'módulos:', assinatura.modulos_inclusos?.length);
      
      return {
        modulos_inclusos: assinatura.modulos_inclusos || ['*'],
        plano_slug: assinatura.plano_slug,
        status: assinatura.status,
        clinica_id: user.clinica_id,
        _source: 'database'
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0 // Sem retry - fallback já resolve
  });

  useEffect(() => {
    if (planoData) {
      console.log('[PlanoProvider] 📦 Plano ativo atualizado:', planoData);
      setPlanoAtivo(planoData);
    }
    if (error) {
      console.error('[PlanoProvider] ❌ Erro na query:', error);
    }
  }, [planoData, error]);

  const temAcessoModulo = (moduloNome) => {
    // 1. CRÍTICO: Admin = ACESSO TOTAL (antes de qualquer verificação)
    if (user?.role === 'admin') {
      return true;
    }
    
    // 2. Sem plano carregado = liberar temporariamente (evita bloqueio total)
    if (!planoAtivo || isLoading) {
      return true; // Loading state - não bloquear
    }
    
    // 3. WILDCARD = ACESSO TOTAL
    if (planoAtivo.modulos_inclusos?.includes('*')) {
      return true;
    }
    
    // 4. Lista específica
    return planoAtivo.modulos_inclusos?.includes(moduloNome) || false;
  };

  const recarregarPlano = () => {
    queryClient.invalidateQueries(["plano-ativo"]);
  };

  return (
    <PlanoContext.Provider value={{ planoAtivo, isLoading, temAcessoModulo, recarregarPlano, user }}>
      {children}
    </PlanoContext.Provider>
  );
}

export function usePlano() {
  const context = useContext(PlanoContext);
  if (!context) {
    throw new Error('usePlano must be used within PlanoProvider');
  }
  return context;
}