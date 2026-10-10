import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, TrendingUp, Mail, MessageSquare, Zap, BarChart3, Download } from "lucide-react";
import { format, differenceInMinutes, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * Dashboard consolidado de métricas de atendimento
 * SLA, tempo resolução, volume, sentimento
 */
export default function DashboardMetricas({ clinicaId }) {
  const [exportando, setExportando] = useState(false);

  const exportarRelatorio = async (periodo = 30) => {
    setExportando(true);
    try {
      const response = await base44.functions.invoke('exportarRelatorioAtendimento', { 
        periodo_dias: periodo,
        formato: 'csv'
      });
      
      // Browser download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-atendimento-${periodo}d.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    } finally {
      setExportando(false);
    }
  };

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-analytics", clinicaId],
    queryFn: async () => {
      return await base44.entities.Ticket.filter(
        { clinica_id: clinicaId },
        '-created_date',
        1000
      );
    },
    enabled: !!clinicaId
  });

  const { data: mensagens = [] } = useQuery({
    queryKey: ["mensagens-analytics", clinicaId],
    queryFn: async () => {
      return await base44.entities.MensagemTicket.filter(
        { clinica_id: clinicaId },
        '-created_date',
        500
      );
    },
    enabled: !!clinicaId
  });

  const { data: metricsIA = [] } = useQuery({
    queryKey: ["metrics-ia", clinicaId],
    queryFn: async () => {
      return await base44.entities.MetricasIA.filter(
        { clinica_id: clinicaId, tipo_operacao: 'analise_sentimento' },
        '-created_date',
        100
      );
    },
    enabled: !!clinicaId
  });

  // CÁLCULOS
  const ticketsResolvidos = tickets.filter(t => t.status === 'resolvido' || t.status === 'fechado');
  const ticketsComPrimeiraResposta = tickets.filter(t => t.tempo_primeira_resposta);
  const ticketsComResolucao = tickets.filter(t => t.tempo_resolucao);

  const tempoMedioPrimeiraResposta = ticketsComPrimeiraResposta.length > 0
    ? Math.round(ticketsComPrimeiraResposta.reduce((acc, t) => acc + t.tempo_primeira_resposta, 0) / ticketsComPrimeiraResposta.length)
    : 0;

  const tempoMedioResolucao = ticketsComResolucao.length > 0
    ? Math.round(ticketsComResolucao.reduce((acc, t) => acc + t.tempo_resolucao, 0) / ticketsComResolucao.length)
    : 0;

  const taxaResolucao = tickets.length > 0
    ? Math.round((ticketsResolvidos.length / tickets.length) * 100)
    : 0;

  // Volume por canal
  const volumeCanal = {
    email: tickets.filter(t => t.canal === 'email').length,
    whatsapp: tickets.filter(t => t.canal === 'whatsapp').length,
    widget: tickets.filter(t => t.canal === 'widget').length,
    interno: tickets.filter(t => t.canal === 'interno').length
  };

  // Sentimento agregado
  const sentimentoDistribuicao = metricsIA.reduce((acc, m) => {
    const sent = m.resultado || 'neutro';
    acc[sent] = (acc[sent] || 0) + 1;
    return acc;
  }, {});

  const urgenciaMedia = metricsIA.length > 0
    ? Math.round(metricsIA.reduce((acc, m) => acc + (m.metadata?.urgencia_score || 50), 0) / metricsIA.length)
    : 50;

  const stats = [
    { 
      label: 'Tempo Primeira Resposta', 
      value: tempoMedioPrimeiraResposta > 0 ? `${tempoMedioPrimeiraResposta}min` : 'N/A',
      icon: Clock,
      color: '#1a73e8',
      bg: '#e8f0fe',
      meta: '< 30min (meta)'
    },
    { 
      label: 'Tempo Resolução Médio', 
      value: tempoMedioResolucao > 0 ? `${Math.round(tempoMedioResolucao / 60)}h` : 'N/A',
      icon: CheckCircle,
      color: '#34a853',
      bg: '#e6f7ed',
      meta: '< 24h (meta)'
    },
    { 
      label: 'Taxa de Resolução', 
      value: `${taxaResolucao}%`,
      icon: TrendingUp,
      color: '#fbbc04',
      bg: '#fef9e5',
      meta: '> 85% (meta)'
    },
    { 
      label: 'Urgência Média (IA)', 
      value: `${urgenciaMedia}/100`,
      icon: Zap,
      color: urgenciaMedia >= 70 ? '#ea4335' : '#7E57FF',
      bg: urgenciaMedia >= 70 ? '#fde7e7' : '#f5f3ff',
      meta: '< 60 (ideal)'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Botão Exportar */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportarRelatorio(7)}
          disabled={exportando}
          icon={<Download className="w-4 h-4" />}
        >
          7 dias (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportarRelatorio(30)}
          disabled={exportando}
          icon={<Download className="w-4 h-4" />}
        >
          30 dias (CSV)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportarRelatorio(90)}
          disabled={exportando}
          icon={<Download className="w-4 h-4" />}
        >
          90 dias (CSV)
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-4 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#202124' }}>{stat.value}</p>
              <p className="text-xs font-medium mb-1" style={{ color: '#5f6368' }}>{stat.label}</p>
              <p className="text-[10px]" style={{ color: '#9aa0a6' }}>{stat.meta}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Volume por Canal */}
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#202124' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#7E57FF' }} />
            Volume por Canal
          </h3>
          <div className="space-y-3">
            {Object.entries(volumeCanal).map(([canal, count]) => {
              const total = tickets.length || 1;
              const percent = Math.round((count / total) * 100);
              const icons = {
                email: { icon: Mail, color: '#1a73e8' },
                whatsapp: { icon: MessageSquare, color: '#25D366' },
                widget: { icon: Zap, color: '#7E57FF' },
                interno: { icon: CheckCircle, color: '#5f6368' }
              };
              const Icon = icons[canal]?.icon || Mail;
              const color = icons[canal]?.color || '#5f6368';

              return (
                <div key={canal}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-sm font-medium capitalize" style={{ color: '#202124' }}>
                        {canal}
                      </span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#5f6368' }}>
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#f1f3f4' }}>
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ width: `${percent}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição de Sentimento */}
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#202124' }}>
            <Zap className="w-5 h-5" style={{ color: '#9334e9' }} />
            Sentimento dos Clientes
          </h3>
          
          {metricsIA.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: '#9aa0a6' }}>Analise tickets para ver sentimento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(sentimentoDistribuicao).map(([sentimento, count]) => {
                const total = metricsIA.length;
                const percent = Math.round((count / total) * 100);
                const colors = {
                  positivo: '#34a853',
                  neutro: '#9aa0a6',
                  negativo: '#fbbc04',
                  frustrado: '#ea4335',
                  urgente: '#c5221f'
                };
                const color = colors[sentimento] || '#9aa0a6';

                return (
                  <div key={sentimento}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium capitalize" style={{ color: '#202124' }}>
                        {sentimento}
                      </span>
                      <span className="text-xs font-bold" style={{ color: '#5f6368' }}>
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#f1f3f4' }}>
                      <div 
                        className="h-full rounded-full transition-all" 
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legenda e Insights */}
      <div className="p-4 rounded-xl border" style={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }}>
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#7E57FF' }} />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1" style={{ color: '#4c1d95' }}>
              Insights Automáticos
            </p>
            <ul className="text-xs space-y-1" style={{ color: '#6d28d9' }}>
              <li>• Tickets com urgência ≥80 são escalados automaticamente para URGENTE</li>
              <li>• Sentimento detecta: raiva, desespero, ameaça de cancelamento</li>
              <li>• Meta SLA: primeira resposta &lt;30min, resolução &lt;24h</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}