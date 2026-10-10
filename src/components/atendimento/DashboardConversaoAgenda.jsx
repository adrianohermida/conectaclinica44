import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

/**
 * FASE 3: DASHBOARD CONVERSÃO CHAT → AGENDAMENTO
 * Métrica: >30% conversão
 */
export default function DashboardConversaoAgenda({ clinicaId }) {
  const { data: conversoes = [], isLoading } = useQuery({
    queryKey: ["conversoes-agenda-ia", clinicaId],
    queryFn: () => base44.entities.ConversaoAgendamentoIA.filter({ clinica_id: clinicaId }, '-created_date', 100),
    enabled: !!clinicaId,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalConversas = conversoes.length;
  const totalConvertidas = conversoes.filter(c => c.converteu).length;
  const taxaConversao = totalConversas > 0 ? (totalConvertidas / totalConversas * 100).toFixed(1) : 0;
  const novoAgendamento = conversoes.filter(c => c.tipo_agendamento === 'novo').length;
  const reagendamentos = conversoes.filter(c => c.tipo_agendamento === 'reagendamento').length;

  // Tempo médio até conversão
  const conversoesComTempo = conversoes.filter(c => c.converteu && c.tempo_conversao_segundos);
  const tempoMedioSeg = conversoesComTempo.length > 0
    ? conversoesComTempo.reduce((acc, c) => acc + c.tempo_conversao_segundos, 0) / conversoesComTempo.length
    : 0;
  const tempoMedioMin = Math.round(tempoMedioSeg / 60);

  const cards = [
    {
      label: 'Taxa de Conversão',
      value: `${taxaConversao}%`,
      meta: '>30%',
      atingiu: parseFloat(taxaConversao) >= 30,
      icon: TrendingUp,
      color: parseFloat(taxaConversao) >= 30 ? '#34a853' : '#ea4335',
      bg: parseFloat(taxaConversao) >= 30 ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'Agendamentos pela IA',
      value: totalConvertidas,
      meta: `${novoAgendamento} novos`,
      atingiu: totalConvertidas > 0,
      icon: Calendar,
      color: '#7E57FF',
      bg: '#f5f3ff'
    },
    {
      label: 'Tempo Médio Conversão',
      value: `${tempoMedioMin}min`,
      meta: '<3min ideal',
      atingiu: tempoMedioMin > 0 && tempoMedioMin <= 3,
      icon: MessageSquare,
      color: '#0B7A9E',
      bg: '#e0f2fe'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          IA Agendamento (FASE 3)
        </h3>
        {parseFloat(taxaConversao) >= 30 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            ✅ META ATINGIDA
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
              {card.atingiu !== undefined && (
                card.atingiu ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )
              )}
            </div>
            <p className="text-xs font-medium text-gray-600 mb-1">{card.label}</p>
            <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-gray-500">{card.meta}</p>
          </div>
        ))}
      </div>

      {/* Detalhes */}
      <div className="pc-card p-4 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Conversas</p>
            <p className="text-xl font-bold text-gray-900">{totalConversas}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Novos Agendamentos</p>
            <p className="text-xl font-bold text-purple-700">{novoAgendamento}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Reagendamentos</p>
            <p className="text-xl font-bold text-blue-700">{reagendamentos}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Não Convertidos</p>
            <p className="text-xl font-bold text-gray-500">{totalConversas - totalConvertidas}</p>
          </div>
        </div>
      </div>
    </div>
  );
}