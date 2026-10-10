import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, Heart, MessageSquare, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * FASE 7: ANALYTICS & OTIMIZAÇÃO
 * Dashboard consolidado: conversões, CSAT, tempo resposta, ROI
 */
export default function DashboardAnalyticsFase7({ clinicaId }) {
  const mesAtual = new Date().toISOString().slice(0, 7);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics-fase7", clinicaId, mesAtual],
    queryFn: async () => {
      const [
        conversoes,
        logsIA,
        precisao,
        consumo
      ] = await Promise.all([
        base44.entities.ConversaoAgendamentoIA.filter({ clinica_id: clinicaId }),
        base44.entities.LogUsageIA.filter({ clinica_id: clinicaId }),
        base44.entities.PrecisaoRespostaIA.filter({ clinica_id: clinicaId }),
        base44.entities.ConsumoOpenAI.filter({ clinica_id: clinicaId, mes_referencia: mesAtual })
      ]);

      // MÉTRICAS CONSOLIDADAS
      const totalConversoes = conversoes.filter(c => c.converteu).length;
      const totalAtendimentos = logsIA.length;
      const taxaConversao = totalAtendimentos > 0 ? (totalConversoes / totalAtendimentos * 100) : 0;

      const csatScores = logsIA.filter(l => l.csat_score).map(l => l.csat_score);
      const csatMedio = csatScores.length > 0 ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length : 0;

      const temposResposta = logsIA.filter(l => l.tempo_resposta_ms).map(l => l.tempo_resposta_ms);
      const tempoMedio = temposResposta.length > 0 ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length : 0;

      const validadas = precisao.filter(p => p.avaliacao !== 'nao_validada');
      const corretas = validadas.filter(p => p.avaliacao === 'correta').length;
      const precisaoIA = validadas.length > 0 ? (corretas / validadas.length * 100) : 0;

      const custoOpenAI = consumo[0]?.custo_total_brl || 0;
      const receitaIA = 2999; // Preço IA Premium
      const margem = receitaIA > 0 ? ((receitaIA - custoOpenAI) / receitaIA * 100) : 0;

      // NPS (mock baseado em CSAT)
      const nps = csatMedio >= 4.5 ? 85 : csatMedio >= 3.5 ? 60 : 30;

      return {
        totalConversoes,
        taxaConversao,
        csatMedio,
        tempoMedio,
        precisaoIA,
        custoOpenAI,
        margem,
        nps,
        totalAtendimentos,
        validadas: validadas.length
      };
    },
    enabled: !!clinicaId,
    refetchInterval: 60000
  });

  const exportarRelatorio = async () => {
    try {
      // CSV simples
      const csv = `Métrica,Valor
Conversões,${analytics.totalConversoes}
Taxa Conversão,${analytics.taxaConversao.toFixed(1)}%
CSAT Médio,${analytics.csatMedio.toFixed(1)}
Tempo Resposta,${(analytics.tempoMedio / 1000).toFixed(2)}s
Precisão IA,${analytics.precisaoIA.toFixed(1)}%
Custo OpenAI,R$ ${analytics.custoOpenAI.toFixed(2)}
Margem,${analytics.margem.toFixed(1)}%
NPS,${analytics.nps}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-ia-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Relatório exportado');
    } catch (error) {
      toast.error('Erro ao exportar');
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    {
      label: 'Conversões',
      value: analytics.totalConversoes,
      meta: `${analytics.taxaConversao.toFixed(1)}% taxa`,
      icon: Target,
      color: analytics.taxaConversao >= 15 ? '#34a853' : '#ea4335',
      bg: analytics.taxaConversao >= 15 ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'CSAT Médio',
      value: analytics.csatMedio.toFixed(1),
      meta: `${analytics.totalAtendimentos} respostas`,
      icon: Heart,
      color: analytics.csatMedio >= 4.0 ? '#34a853' : '#fbbc04',
      bg: analytics.csatMedio >= 4.0 ? '#e6f7ed' : '#fef9e5'
    },
    {
      label: 'Tempo Resposta',
      value: `${(analytics.tempoMedio / 1000).toFixed(1)}s`,
      meta: 'Latência média',
      icon: Clock,
      color: analytics.tempoMedio < 3000 ? '#34a853' : '#fbbc04',
      bg: analytics.tempoMedio < 3000 ? '#e6f7ed' : '#fef9e5'
    },
    {
      label: 'Precisão IA',
      value: `${analytics.precisaoIA.toFixed(0)}%`,
      meta: `${analytics.validadas} validações`,
      icon: MessageSquare,
      color: analytics.precisaoIA >= 85 ? '#34a853' : '#ea4335',
      bg: analytics.precisaoIA >= 85 ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'Custo OpenAI',
      value: `R$ ${analytics.custoOpenAI.toFixed(0)}`,
      meta: `Margem ${analytics.margem.toFixed(0)}%`,
      icon: TrendingUp,
      color: analytics.margem >= 75 ? '#34a853' : '#ea4335',
      bg: analytics.margem >= 75 ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'NPS',
      value: analytics.nps,
      meta: 'Net Promoter Score',
      icon: Heart,
      color: analytics.nps >= 50 ? '#34a853' : '#fbbc04',
      bg: analytics.nps >= 50 ? '#e6f7ed' : '#fef9e5'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Analytics & ROI (FASE 7)
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={exportarRelatorio}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Metas FASE 7 */}
      <div className="pc-card p-4 bg-white">
        <p className="text-sm font-bold text-gray-900 mb-2">Metas FASE 7:</p>
        <div className="space-y-1 text-xs">
          <p className={analytics.nps >= 50 ? 'text-green-700' : 'text-red-700'}>
            {analytics.nps >= 50 ? '✅' : '❌'} NPS {'>'}50 ({analytics.nps})
          </p>
          <p className={analytics.taxaConversao >= 15 ? 'text-green-700' : 'text-red-700'}>
            {analytics.taxaConversao >= 15 ? '✅' : '❌'} Conversão {'>'}15% ({analytics.taxaConversao.toFixed(1)}%)
          </p>
          <p className={analytics.margem >= 75 ? 'text-green-700' : 'text-red-700'}>
            {analytics.margem >= 75 ? '✅' : '❌'} Margem {'>'}75% ({analytics.margem.toFixed(1)}%)
          </p>
        </div>
      </div>
    </div>
  );
}