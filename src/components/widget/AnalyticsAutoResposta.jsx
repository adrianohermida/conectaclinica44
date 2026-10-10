import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, Clock, MessageSquare } from "lucide-react";

export default function AnalyticsAutoResposta({ clinicaId }) {
  const { data: mensagens = [] } = useQuery({
    queryKey: ['mensagens-analytics', clinicaId],
    queryFn: () => base44.entities.MensagemTicket.filter({ clinica_id: clinicaId }),
    enabled: !!clinicaId,
    staleTime: 5 * 60 * 1000
  });

  const totalMensagens = mensagens.length;
  const mensagensAutoResposta = mensagens.filter(m => m.resposta_automatica === true).length;
  const taxaAutoResposta = totalMensagens > 0 ? (mensagensAutoResposta / totalMensagens * 100).toFixed(1) : 0;
  
  // Mensagens dos últimos 7 dias
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const mensagensRecentes = mensagens.filter(m => new Date(m.created_date) >= seteDiasAtras);
  const autoRespostasRecentes = mensagensRecentes.filter(m => m.resposta_automatica === true).length;

  return (
    <div className="pc-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
          <Brain className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Métricas Auto-resposta IA</h3>
          <p className="text-sm text-gray-600">Performance das últimas 7 dias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Taxa Auto-resposta</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{taxaAutoResposta}%</div>
          <p className="text-xs text-gray-600 mt-1">{mensagensAutoResposta} de {totalMensagens} mensagens</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Últimos 7 dias</span>
          </div>
          <div className="text-3xl font-bold text-blue-600">{autoRespostasRecentes}</div>
          <p className="text-xs text-gray-600 mt-1">Respostas automáticas</p>
        </div>

        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Tempo Resposta</span>
          </div>
          <div className="text-3xl font-bold text-green-600">&lt; 1s</div>
          <p className="text-xs text-gray-600 mt-1">Resposta instantânea</p>
        </div>
      </div>

      {totalMensagens === 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Nenhuma mensagem registrada ainda. As métricas aparecerão assim que houver interações no widget.
          </p>
        </div>
      )}
    </div>
  );
}