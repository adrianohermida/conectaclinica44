import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Badge de status CI/CD - exibe resultado dos últimos testes E2E
 * Use no Dashboard ou header para monitoramento contínuo
 */
export default function CIStatusBadge({ compact = false }) {
  const { data: ultimoTeste, isLoading } = useQuery({
    queryKey: ['ci-status'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('testeE2EIsolamentoCompleto', {});
        return res.data;
      } catch (error) {
        return null;
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5min
    staleTime: 4 * 60 * 1000,
    retry: false
  });

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border`}
           style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7E57FF' }} />
        {!compact && <span className="text-xs font-medium" style={{ color: '#5f6368' }}>Verificando...</span>}
      </div>
    );
  }

  if (!ultimoTeste) {
    return null;
  }

  const isPassed = ultimoTeste.ci_cd_gate === true;
  const Icon = isPassed ? CheckCircle : AlertCircle;
  const bgColor = isPassed ? '#e6f7ed' : '#fef2f2';
  const borderColor = isPassed ? '#86efac' : '#fecaca';
  const textColor = isPassed ? '#16a34a' : '#dc2626';

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
           style={{ borderColor, backgroundColor: bgColor }}>
        <Icon className="w-4 h-4" style={{ color: textColor }} />
        <span className="text-xs font-bold" style={{ color: textColor }}>
          {ultimoTeste.score}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2"
         style={{ borderColor, backgroundColor: bgColor }}>
      <Icon className="w-5 h-5" style={{ color: textColor }} />
      <div>
        <p className="text-xs font-medium" style={{ color: textColor }}>
          {isPassed ? 'E2E Tests OK' : 'E2E Tests FAILED'}
        </p>
        <p className="text-[10px]" style={{ color: '#5f6368' }}>
          {ultimoTeste.passed}/{ultimoTeste.total} • {ultimoTeste.score}
        </p>
      </div>
    </div>
  );
}