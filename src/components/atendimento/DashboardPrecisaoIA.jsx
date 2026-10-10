import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Brain, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

/**
 * FASE 4: DASHBOARD PRECISÃO IA (Prontuários)
 * Métrica: Precisão >85%
 */
export default function DashboardPrecisaoIA({ clinicaId }) {
  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["precisao-ia", clinicaId],
    queryFn: () => base44.entities.PrecisaoRespostaIA.filter({ clinica_id: clinicaId }, '-created_date', 100),
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

  const totalValidadas = avaliacoes.filter(a => a.avaliacao !== 'nao_validada').length;
  const corretas = avaliacoes.filter(a => a.avaliacao === 'correta').length;
  const parciais = avaliacoes.filter(a => a.avaliacao === 'parcialmente_correta').length;
  const incorretas = avaliacoes.filter(a => a.avaliacao === 'incorreta').length;

  const taxaPrecisao = totalValidadas > 0 
    ? ((corretas + parciais * 0.5) / totalValidadas * 100).toFixed(1)
    : 0;

  const atingiuMeta = parseFloat(taxaPrecisao) >= 85;

  // Tempo médio de resposta
  const respostasComTempo = avaliacoes.filter(a => a.tempo_resposta_ms);
  const tempoMedioMs = respostasComTempo.length > 0
    ? respostasComTempo.reduce((acc, a) => acc + a.tempo_resposta_ms, 0) / respostasComTempo.length
    : 0;

  const cards = [
    {
      label: 'Precisão Geral',
      value: `${taxaPrecisao}%`,
      meta: '>85%',
      atingiu: atingiuMeta,
      icon: TrendingUp,
      color: atingiuMeta ? '#34a853' : '#ea4335',
      bg: atingiuMeta ? '#e6f7ed' : '#fde7e7'
    },
    {
      label: 'Respostas Corretas',
      value: corretas,
      meta: `${parciais} parciais`,
      icon: CheckCircle2,
      color: '#34a853',
      bg: '#e6f7ed'
    },
    {
      label: 'Tempo Médio',
      value: `${(tempoMedioMs / 1000).toFixed(1)}s`,
      meta: '<3s ideal',
      atingiu: tempoMedioMs > 0 && tempoMedioMs < 3000,
      icon: Brain,
      color: '#7E57FF',
      bg: '#f5f3ff'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          IA Prontuários (FASE 4)
        </h3>
        {atingiuMeta && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            ✅ PRECISÃO {'>'}85%
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

      {/* Breakdown */}
      <div className="pc-card p-4 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Validadas</p>
            <p className="text-xl font-bold text-gray-900">{totalValidadas}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Corretas</p>
            <p className="text-xl font-bold text-green-700">{corretas}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Parciais</p>
            <p className="text-xl font-bold text-orange-700">{parciais}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Incorretas</p>
            <p className="text-xl font-bold text-red-700">{incorretas}</p>
          </div>
        </div>

        {totalValidadas === 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 Nenhuma validação ainda. Médicos podem validar respostas da IA no módulo Prontuários.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}