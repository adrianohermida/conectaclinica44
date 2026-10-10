import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, CheckCircle, TrendingUp, Zap, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Componente de Sugestões IA para respostas de tickets
 * Minimalista, não invasivo, contextual
 */
export default function SugestoesIA({ ticketId, onSelectSuggestion, className = "" }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const buscarSugestoes = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    try {
      const response = await base44.functions.invoke('gerarSugestoesResposta', { ticket_id: ticketId });
      
      if (response.data.success && response.data.sugestoes) {
        setSugestoes(response.data.sugestoes);
        setExpanded(true);
        toast.success(`✨ ${response.data.sugestoes.length} sugestões geradas`);
      } else {
        toast.error('Erro ao gerar sugestões');
        setSugestoes([]);
      }
    } catch (error) {
      console.error('Erro sugestões IA:', error);
      toast.error('Falha na IA: ' + error.message);
      setSugestoes([]);
    } finally {
      setLoading(false);
    }
  };

  const tipoConfig = {
    empatica: { icon: '💜', label: 'Empática', color: '#9334e9' },
    objetiva: { icon: '🎯', label: 'Objetiva', color: '#0B7A9E' },
    template: { icon: '⚡', label: 'Template', color: '#7E57FF' }
  };

  return (
    <div className={className}>
      {/* Trigger Button - Minimalista */}
      {!expanded && (
        <button
          onClick={buscarSugestoes}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all border hover:bg-purple-50"
          style={{ borderColor: '#ddd6fe' }}
          type="button"
        >
          <Sparkles className="w-4 h-4" style={{ color: '#7E57FF' }} />
          <span className="text-xs font-semibold" style={{ color: '#6d28d9' }}>
            {loading ? 'Gerando...' : 'Sugestões IA'}
          </span>
        </button>
      )}

      {/* Sugestões Expandidas */}
      {expanded && sugestoes.length > 0 && (
        <div className="space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: '#7E57FF' }} />
              <span className="text-xs font-bold" style={{ color: '#6d28d9' }}>
                Sugestões IA ({sugestoes.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={buscarSugestoes}
                disabled={loading}
                className="p-1.5 hover:bg-purple-50 rounded transition-all"
                type="button"
                title="Gerar novas sugestões"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: '#7E57FF' }} />
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            {sugestoes.map((sugestao, idx) => {
              const config = tipoConfig[sugestao.tipo] || tipoConfig.objetiva;
              const confianca = Math.round((sugestao.confianca || 0.8) * 100);
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectSuggestion(sugestao.texto);
                    setExpanded(false);
                    toast.success(`${config.icon} Sugestão aplicada`);
                  }}
                  className="group text-left p-3 rounded-xl border-2 transition-all hover:shadow-md"
                  style={{ 
                    borderColor: '#e8eaed',
                    backgroundColor: 'white'
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: config.color }}>
                        {config.icon} {config.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ 
                        backgroundColor: confianca >= 80 ? '#e6f7ed' : '#fef9e5',
                        color: confianca >= 80 ? '#137333' : '#854d0e'
                      }}>
                        {confianca}% confiança
                      </span>
                    </div>
                    <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9aa0a6' }} />
                  </div>
                  
                  <p className="text-sm leading-relaxed mb-2" style={{ color: '#202124' }}>
                    {sugestao.texto}
                  </p>

                  {sugestao.template_id && (
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: '#6d28d9' }}>
                      <Zap className="w-3 h-3" />
                      Baseado em template
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg">
            <p className="text-[10px] text-center" style={{ color: '#6d28d9' }}>
              💡 Clique em uma sugestão para usá-la • IA analisa histórico + templates
            </p>
          </div>
        </div>
      )}
    </div>
  );
}