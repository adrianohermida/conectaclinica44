import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Zap, AlertTriangle, PauseCircle } from "lucide-react";

/**
 * FASE 6: DASHBOARD CONSUMO OPENAI
 * Métrica: Margem >75%
 */
export default function DashboardConsumoOpenAI({ clinicaId }) {
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data: consumo, isLoading } = useQuery({
    queryKey: ["consumo-openai", clinicaId, mesAtual],
    queryFn: async () => {
      const consumos = await base44.entities.ConsumoOpenAI.filter({ 
        clinica_id: clinicaId,
        mes_referencia: mesAtual
      });
      return consumos[0] || { 
        custo_total_brl: 0, 
        limite_mensal_brl: 1000,
        total_tokens: 0,
        total_requisicoes: 0
      };
    },
    enabled: !!clinicaId,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  const percentualUso = (consumo.custo_total_brl / consumo.limite_mensal_brl) * 100;
  const receita = 2999; // Se cliente tem IA Premium
  const margem = receita > 0 ? ((receita - consumo.custo_total_brl) / receita * 100) : 0;
  const atingiuMetaMargem = margem >= 75;

  const cards = [
    {
      label: 'Consumo OpenAI',
      value: `R$ ${consumo.custo_total_brl.toFixed(2)}`,
      meta: `${percentualUso.toFixed(0)}% do limite`,
      atingiu: percentualUso < 100,
      icon: DollarSign,
      color: percentualUso >= 100 ? '#ea4335' : percentualUso >= 80 ? '#fbbc04' : '#34a853',
      bg: percentualUso >= 100 ? '#fde7e7' : percentualUso >= 80 ? '#fef9e5' : '#e6f7ed'
    },
    {
      label: 'Margem Bruta',
      value: `${margem.toFixed(1)}%`,
      meta: '>75% meta',
      atingiu: atingiuMetaMargem,
      icon: TrendingUp,
      color: atingiuMetaMargem ? '#34a853' : '#ea4335',
      bg: atingiuMetaMargem ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'Requisições',
      value: consumo.total_requisicoes || 0,
      meta: `${((consumo.total_tokens || 0) / 1000).toFixed(1)}k tokens`,
      icon: Zap,
      color: '#7E57FF',
      bg: '#f5f3ff'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Gestão Créditos OpenAI (FASE 6)
        </h3>
        {consumo.pausado_automaticamente && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
            <PauseCircle className="w-4 h-4" />
            IA PAUSADA
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

      {/* Barra progresso */}
      <div className="pc-card p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Limite Mensal</span>
          <span className="text-sm font-bold" style={{ color: percentualUso >= 100 ? '#ea4335' : '#7E57FF' }}>
            R$ {consumo.custo_total_brl.toFixed(2)} / R$ {consumo.limite_mensal_brl}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full transition-all"
            style={{ 
              width: `${Math.min(percentualUso, 100)}%`,
              backgroundColor: percentualUso >= 100 ? '#ea4335' : percentualUso >= 80 ? '#fbbc04' : '#34a853'
            }}
          />
        </div>
      </div>

      {consumo.pausado_automaticamente && (
        <div className="pc-card p-4 bg-red-50 border-2 border-red-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-red-900 mb-1">🚨 IA Pausada por Limite de Custo</p>
              <p className="text-sm text-red-800">
                Consumo atingiu R$ {consumo.limite_mensal_brl}. Upgrade para IA Premium (ilimitado) ou aguarde próximo mês.
              </p>
            </div>
          </div>
        </div>
      )}

      {percentualUso >= 80 && !consumo.pausado_automaticamente && (
        <div className="pc-card p-4 bg-orange-50 border-2 border-orange-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-orange-900 mb-1">⚠️ Alerta: {percentualUso.toFixed(0)}% do Limite Atingido</p>
              <p className="text-sm text-orange-800">
                Próximo da pausa automática. Considere upgrade para IA Premium (mensagens ilimitadas).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}