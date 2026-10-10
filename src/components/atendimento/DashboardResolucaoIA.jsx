import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/Card";
import { Brain, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function DashboardResolucaoIA({ clinicaId }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats-ia', clinicaId],
    queryFn: async () => {
      const logs = await base44.entities.LogUsageIA.filter({
        clinica_id: clinicaId
      }, '-created_date', 100);

      const total = logs.length;
      const aceitos = logs.filter(l => l.aceito === true).length;
      const rejeitados = logs.filter(l => l.aceito === false).length;
      const resolvidos = logs.filter(l => l.resolveu_ticket).length;
      const csatScores = logs.filter(l => l.csat_score).map(l => l.csat_score);
      const csatMedio = csatScores.length ? 
        (csatScores.reduce((a, b) => a + b, 0) / csatScores.length).toFixed(1) : 0;
      
      const taxaResolucao = total > 0 ? ((resolvidos / total) * 100).toFixed(1) : 0;
      const taxaAceite = total > 0 ? ((aceitos / total) * 100).toFixed(1) : 0;

      return {
        total,
        aceitos,
        rejeitados,
        resolvidos,
        taxaResolucao,
        taxaAceite,
        csatMedio
      };
    },
    refetchInterval: 60000 // Atualizar a cada 1min
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="pc-card p-4 animate-pulse">
            <div className="h-16 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Taxa Resolução Automática',
      value: `${stats?.taxaResolucao || 0}%`,
      icon: TrendingUp,
      color: stats?.taxaResolucao >= 40 ? '#34a853' : '#ea4335',
      meta: stats?.taxaResolucao >= 40 ? '✅ Meta atingida' : '⚠️ Abaixo da meta (40%)'
    },
    {
      title: 'Sugestões Aceitas',
      value: `${stats?.taxaAceite || 0}%`,
      icon: CheckCircle2,
      color: '#7E57FF',
      meta: `${stats?.aceitos || 0} de ${stats?.total || 0}`
    },
    {
      title: 'CSAT Médio',
      value: stats?.csatMedio || 'N/A',
      icon: Brain,
      color: stats?.csatMedio >= 4.2 ? '#34a853' : '#fbbc04',
      meta: stats?.csatMedio >= 4.2 ? '✅ Acima de 4.2' : '📊 Coletando feedback'
    },
    {
      title: 'Tickets Resolvidos',
      value: stats?.resolvidos || 0,
      icon: Clock,
      color: '#0B7A9E',
      meta: `${stats?.total || 0} total processados`
    }
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold text-gray-900">Performance IA</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </p>
              </div>
              <card.icon className="w-8 h-8 opacity-20" style={{ color: card.color }} />
            </div>
            <p className="text-xs text-gray-500">{card.meta}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}