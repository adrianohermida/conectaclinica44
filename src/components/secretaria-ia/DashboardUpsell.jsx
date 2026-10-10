import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, DollarSign, Zap } from "lucide-react";

/**
 * FASE 5: DASHBOARD UPSELL RATE
 * Métrica: Upsell >15% (Starter → Premium)
 */
export default function DashboardUpsell() {
  const { data: assinaturas = [], isLoading } = useQuery({
    queryKey: ["assinaturas-upsell"],
    queryFn: () => base44.asServiceRole.entities.AssinaturaClinica.list('-created_date', 200),
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalStarter = assinaturas.filter(a => 
    a.plano_slug === 'starter' && a.status === 'ativa'
  ).length;

  const totalComIA = assinaturas.filter(a => 
    a.status === 'ativa' && (a.modulos_adicionais || []).includes('secretaria_ia')
  ).length;

  const taxaUpsell = totalStarter > 0 
    ? (totalComIA / totalStarter * 100).toFixed(1)
    : 0;

  const atingiuMeta = parseFloat(taxaUpsell) >= 15;

  // MRR IA Premium
  const mrrIA = totalComIA * 2999;

  const cards = [
    {
      label: 'Taxa Upsell',
      value: `${taxaUpsell}%`,
      meta: '>15% meta',
      atingiu: atingiuMeta,
      icon: TrendingUp,
      color: atingiuMeta ? '#34a853' : '#ea4335',
      bg: atingiuMeta ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'Clínicas com IA Premium',
      value: totalComIA,
      meta: `${totalStarter} Starter total`,
      icon: Users,
      color: '#7E57FF',
      bg: '#f5f3ff'
    },
    {
      label: 'MRR Módulo IA',
      value: `R$ ${(mrrIA / 1000).toFixed(1)}k`,
      meta: `R$ ${mrrIA.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: '#34a853',
      bg: '#e6f7ed'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Monetização IA Premium (FASE 5)
        </h3>
        {atingiuMeta && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            ✅ UPSELL {'>'}15%
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="pc-card p-4" style={{ backgroundColor: card.bg, border: `1px solid ${card.color}40` }}>
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'white' }}>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">{card.label}</p>
            <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-gray-500">{card.meta}</p>
          </div>
        ))}
      </div>

      {!atingiuMeta && totalStarter > 0 && (
        <div className="pc-card p-4 bg-orange-50 border-2 border-orange-200">
          <p className="text-sm text-orange-900">
            <strong>⚠️ Ação necessária:</strong> Taxa de upsell abaixo de 15%. 
            Ative alertas de créditos baixos e CTAs no dashboard.
          </p>
        </div>
      )}

      {totalComIA === 0 && (
        <div className="pc-card p-4 bg-blue-50 border-2 border-blue-200">
          <p className="text-sm text-blue-900">
            💡 <strong>Zero conversões:</strong> Módulo IA Premium ainda não foi vendido. 
            Configure paywall e alerts de limite.
          </p>
        </div>
      )}
    </div>
  );
}