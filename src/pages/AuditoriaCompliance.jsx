import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Shield, AlertCircle, CheckCircle, TrendingUp, Zap, Eye, RefreshCw } from "lucide-react";

export default function AuditoriaCompliance() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: auditoria, isLoading, refetch } = useQuery({
    queryKey: ['auditoria-compliance'],
    queryFn: async () => {
      const response = await base44.functions.invoke('auditarPaginasCompliance', {
        tipo_auditoria: 'completa'
      });
      return response.data;
    },
    enabled: !!user && user.role === 'admin',
    staleTime: 5 * 60 * 1000
  });

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--brand-text-tertiary)' }} />
        <p style={{ color: 'var(--brand-text-secondary)' }}>Acesso restrito a administradores</p>
      </div>
    );
  }

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'CRÍTICA': return 'var(--brand-error)';
      case 'ALTA': return 'var(--brand-warning)';
      case 'MÉDIA': return 'var(--brand-info)';
      default: return 'var(--brand-success)';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Auditoria de Compliance"
        description="Performance, Segurança e Acessibilidade de todas as páginas"
        action={
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="font-medium px-6 py-2.5 rounded-full transition-all inline-flex items-center gap-2 min-h-[44px]"
            style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Auditando...' : 'Atualizar'}
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="pc-card p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Cards Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Total Páginas</p>
                <Eye className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                {auditoria?.total_paginas || 0}
              </p>
            </div>

            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Aprovadas</p>
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--brand-success)' }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-success)' }}>
                {auditoria?.aprovadas || 0}
              </p>
            </div>

            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Críticas</p>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--brand-error)' }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-error)' }}>
                {auditoria?.criticas || 0}
              </p>
            </div>

            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Score Médio</p>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-info)' }} />
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                {auditoria?.scores_medios?.performance || 0}
              </p>
            </div>
          </div>

          {/* Recomendações */}
          {auditoria?.recomendacoes && auditoria.recomendacoes.length > 0 && (
            <div className="pc-card p-6" style={{ borderLeft: '4px solid var(--brand-warning)' }}>
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--brand-text-primary)' }}>
                <AlertCircle className="w-5 h-5" style={{ color: 'var(--brand-warning)' }} />
                Ações Prioritárias
              </h3>
              <ul className="space-y-2">
                {auditoria.recomendacoes.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span style={{ color: 'var(--brand-warning)' }}>•</span>
                    <span className="text-sm" style={{ color: 'var(--brand-text-secondary)' }}>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabela de Resultados */}
          <div className="pc-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--brand-bg-tertiary)' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Página</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Prioridade</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Performance</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Accessibility</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Security</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold" style={{ color: 'var(--brand-text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--brand-border-primary)' }}>
                  {auditoria?.resultados?.map((resultado, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--brand-text-primary)' }}>{resultado.pagina}</p>
                          <p className="text-xs" style={{ color: 'var(--brand-text-tertiary)' }}>{resultado.path}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getPrioridadeColor(resultado.prioridade)}15`,
                            color: getPrioridadeColor(resultado.prioridade)
                          }}
                        >
                          {resultado.prioridade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${resultado.scores.performance >= 95 ? 'text-green-600' : resultado.scores.performance >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {resultado.scores.performance}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${resultado.scores.accessibility >= 95 ? 'text-green-600' : resultado.scores.accessibility >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {resultado.scores.accessibility}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${resultado.scores.security >= 95 ? 'text-green-600' : resultado.scores.security >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {resultado.scores.security}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {resultado.aprovado ? (
                          <CheckCircle className="w-5 h-5 mx-auto" style={{ color: 'var(--brand-success)' }} />
                        ) : (
                          <AlertCircle className="w-5 h-5 mx-auto" style={{ color: 'var(--brand-error)' }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scores Médios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Performance Média</p>
                <Zap className="w-5 h-5" style={{ color: 'var(--brand-warning)' }} />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                  {auditoria?.scores_medios?.performance || 0}
                </p>
                <p className="text-sm mb-1" style={{ color: 'var(--brand-text-tertiary)' }}>/100</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="h-2 rounded-full transition-all" 
                  style={{ 
                    width: `${auditoria?.scores_medios?.performance || 0}%`,
                    backgroundColor: 'var(--brand-warning)'
                  }} 
                />
              </div>
            </div>

            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Accessibility Média</p>
                <Eye className="w-5 h-5" style={{ color: 'var(--brand-info)' }} />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                  {auditoria?.scores_medios?.accessibility || 0}
                </p>
                <p className="text-sm mb-1" style={{ color: 'var(--brand-text-tertiary)' }}>/100</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="h-2 rounded-full transition-all" 
                  style={{ 
                    width: `${auditoria?.scores_medios?.accessibility || 0}%`,
                    backgroundColor: 'var(--brand-info)'
                  }} 
                />
              </div>
            </div>

            <div className="pc-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium" style={{ color: 'var(--brand-text-secondary)' }}>Security Média</p>
                <Shield className="w-5 h-5" style={{ color: 'var(--brand-success)' }} />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                  {auditoria?.scores_medios?.security || 0}
                </p>
                <p className="text-sm mb-1" style={{ color: 'var(--brand-text-tertiary)' }}>/100</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className="h-2 rounded-full transition-all" 
                  style={{ 
                    width: `${auditoria?.scores_medios?.security || 0}%`,
                    backgroundColor: 'var(--brand-success)'
                  }} 
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}