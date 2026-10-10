import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Badge de sentimento do ticket com análise IA
 * Minimalista, acionável, com auto-escalação
 */
export default function SentimentoBadge({ ticket, onUpdate }) {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);

  const analisar = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analisarSentimentoTicket', { 
        ticket_id: ticket.id 
      });
      
      if (response.data.success) {
        setAnalise(response.data);
        if (response.data.auto_escalado) {
          toast.warning('⚠️ Ticket escalado automaticamente para URGENTE');
          onUpdate?.();
        }
      }
    } catch (error) {
      toast.error('Erro ao analisar sentimento');
    } finally {
      setLoading(false);
    }
  };

  const config = {
    positivo: { icon: TrendingUp, bg: '#e6f7ed', color: '#137333', label: 'Positivo' },
    neutro: { icon: Minus, bg: '#f8f9fa', color: '#5f6368', label: 'Neutro' },
    negativo: { icon: TrendingDown, bg: '#fef9e5', color: '#854d0e', label: 'Negativo' },
    frustrado: { icon: AlertTriangle, bg: '#fef2f2', color: '#991b1b', label: 'Frustrado' },
    urgente: { icon: Zap, bg: '#fef2f2', color: '#ea4335', label: 'URGENTE' }
  };

  const sentimentoAtual = analise?.sentimento || 'neutro';
  const style = config[sentimentoAtual] || config.neutro;
  const Icon = style.icon;

  return (
    <div className="flex items-center gap-2">
      {analise ? (
        <div className="relative group">
          <button
            onClick={analisar}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            <Icon className="w-3.5 h-3.5" />
            {style.label}
            {analise.urgencia_score >= 80 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {analise.urgencia_score}
              </span>
            )}
          </button>

          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-64 p-3 rounded-lg shadow-xl border animate-fadeIn"
            style={{ backgroundColor: 'white', borderColor: '#e8eaed' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: '#202124' }}>Análise IA</p>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <span style={{ color: '#5f6368' }}>Confiança:</span>
                <span style={{ color: '#202124' }} className="font-semibold">
                  {Math.round(analise.confianca * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#5f6368' }}>Urgência:</span>
                <span style={{ color: '#202124' }} className="font-semibold">
                  {analise.urgencia_score}/100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: '#5f6368' }}>Risco Churn:</span>
                <span className={`font-semibold px-2 py-0.5 rounded-full`} style={{
                  backgroundColor: analise.risco_churn === 'critico' ? '#fef2f2' : 
                                   analise.risco_churn === 'alto' ? '#fef9e5' : '#f8f9fa',
                  color: analise.risco_churn === 'critico' ? '#991b1b' : 
                         analise.risco_churn === 'alto' ? '#854d0e' : '#5f6368'
                }}>
                  {analise.risco_churn}
                </span>
              </div>
              {analise.motivo && (
                <p className="mt-2 p-2 rounded" style={{ backgroundColor: '#f8f9fa', color: '#5f6368' }}>
                  {analise.motivo}
                </p>
              )}
            </div>
            <p className="text-[9px] mt-2 text-center" style={{ color: '#9aa0a6' }}>
              Clique para reanalisar
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={analisar}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:bg-purple-50"
          style={{ borderColor: '#ddd6fe', color: '#6d28d9' }}
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {loading ? 'Analisando...' : 'Analisar'}
        </button>
      )}
    </div>
  );
}