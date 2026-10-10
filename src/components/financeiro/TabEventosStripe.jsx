import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function TabEventosStripe() {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [processandoRetry, setProcessandoRetry] = useState(false);

  const { data: eventos = [], isLoading, refetch } = useQuery({
    queryKey: ["stripe-event-logs", filtroStatus, filtroTipo],
    queryFn: async () => {
      let query = {};
      
      if (filtroStatus !== "todos") {
        query.status_processamento = filtroStatus;
      }
      
      if (filtroTipo !== "todos") {
        query.event_type = filtroTipo;
      }

      return base44.entities.StripeEventLog.filter(query, "-created_date", 100);
    },
    staleTime: 30 * 1000
  });

  // Métricas
  const metricas = React.useMemo(() => {
    const total = eventos.length;
    const processados = eventos.filter(e => e.status_processamento === 'processado').length;
    const falhados = eventos.filter(e => e.status_processamento === 'falhado').length;
    const taxaSucesso = total > 0 ? ((processados / total) * 100).toFixed(1) : 100;
    
    const impactoReceita = eventos.filter(e => e.impacto_receita);
    const receitaProcessada = impactoReceita
      .filter(e => e.status_processamento === 'processado' && e.event_type === 'invoice.paid')
      .reduce((acc, e) => acc + (e.valor_centavos || 0), 0) / 100;
    
    const receitaPerdida = impactoReceita
      .filter(e => e.status_processamento === 'falhado' && e.event_type === 'invoice.paid')
      .reduce((acc, e) => acc + (e.valor_centavos || 0), 0) / 100;

    const latenciaMedia = eventos.length > 0
      ? eventos.reduce((acc, e) => acc + (e.tempo_processamento_ms || 0), 0) / eventos.length
      : 0;

    return {
      total,
      processados,
      falhados,
      taxaSucesso,
      receitaProcessada,
      receitaPerdida,
      latenciaMedia: latenciaMedia.toFixed(0)
    };
  }, [eventos]);

  const handleRetryFalhados = async () => {
    setProcessandoRetry(true);
    try {
      const { data } = await base44.functions.invoke('stripe/retryWebhookFailures', {});
      
      toast.success(`✅ Retry concluído: ${data.resultados.sucesso} sucesso, ${data.resultados.falha} falhas`);
      refetch();
    } catch (error) {
      toast.error(`Erro ao processar retry: ${error.message}`);
    } finally {
      setProcessandoRetry(false);
    }
  };

  const statusConfig = {
    processado: { icon: CheckCircle2, color: '#34a853', bg: '#e6f7ed', label: 'Processado' },
    falhado: { icon: XCircle, color: '#ea4335', bg: '#fef2f2', label: 'Falhado' },
    retry_pendente: { icon: Clock, color: '#fbbc04', bg: '#fef9e5', label: 'Retry Pendente' },
    ignorado: { icon: AlertCircle, color: '#5f6368', bg: '#f8f9fa', label: 'Ignorado' }
  };

  const tiposEventos = [
    'todos',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
    'charge.succeeded',
    'charge.refunded'
  ];

  return (
    <div className="space-y-6">
      {/* Métricas Críticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e6f7ed' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#34a853' }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Taxa Sucesso</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.taxaSucesso}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">{metricas.processados}/{metricas.total} eventos</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
              <XCircle className="w-5 h-5" style={{ color: '#ea4335' }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Eventos Falhados</p>
              <p className="text-2xl font-bold text-red-600">{metricas.falhados}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">Requerem retry manual</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e6f7ed' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#34a853' }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Receita Processada</p>
              <p className="text-2xl font-bold text-green-600">R$ {metricas.receitaProcessada.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">Últimos 100 eventos</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#ea4335' }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Receita Perdida</p>
              <p className="text-2xl font-bold text-red-600">R$ {metricas.receitaPerdida.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">Eventos falhados</p>
        </div>
      </div>

      {/* Ações e Filtros */}
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border bg-white text-sm min-h-[44px]"
              style={{ borderColor: '#e8eaed' }}
            >
              <option value="todos">Todos Status</option>
              <option value="processado">✓ Processados</option>
              <option value="falhado">✗ Falhados</option>
              <option value="retry_pendente">⏳ Retry Pendente</option>
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 rounded-lg border bg-white text-sm min-h-[44px]"
              style={{ borderColor: '#e8eaed' }}
            >
              {tiposEventos.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo === 'todos' ? 'Todos Tipos' : tipo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            
            {metricas.falhados > 0 && (
              <Button
                onClick={handleRetryFalhados}
                disabled={processandoRetry}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {processandoRetry ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry {metricas.falhados} Falhados
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Métricas Performance */}
        <div className="mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-4" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Latência Média</p>
              <p className="text-lg font-bold text-gray-900">{metricas.latenciaMedia}ms</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Último Evento</p>
              <p className="text-sm font-medium text-gray-900">
                {eventos.length > 0 ? format(new Date(eventos[0].created_date), "dd/MM/yy HH:mm") : '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Eventos Hoje</p>
              <p className="text-lg font-bold text-gray-900">
                {eventos.filter(e => {
                  const hoje = format(new Date(), "yyyy-MM-dd");
                  return format(new Date(e.created_date), "yyyy-MM-dd") === hoje;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : eventos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#e8eaed' }}>
            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">Nenhum evento registrado</p>
          </div>
        ) : (
          eventos.map(evento => {
            const status = statusConfig[evento.status_processamento] || statusConfig.processado;
            const StatusIcon = status.icon;

            return (
              <div key={evento.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: status.bg }}>
                      <StatusIcon className="w-6 h-6" style={{ color: status.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{evento.event_type}</h4>
                        {evento.impacto_receita && (
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold">
                            💰 Receita
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span>ID: <code className="text-xs bg-gray-100 px-1 rounded">{evento.event_id}</code></span>
                        {evento.clinica_id && <span>Clínica: {evento.clinica_id.substring(0, 8)}...</span>}
                        {evento.valor_centavos > 0 && (
                          <span className="font-bold text-green-600">
                            R$ {(evento.valor_centavos / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 mt-2">
                        <span>⏱️ {evento.tempo_processamento_ms || 0}ms</span>
                        <span>🔄 {evento.tentativas_processamento} tentativas</span>
                        <span>📅 {format(new Date(evento.created_date), "dd/MM/yy HH:mm:ss")}</span>
                      </div>
                      {evento.erro_detalhes && (
                        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                          <p className="text-xs text-red-700">❌ {evento.erro_detalhes}</p>
                        </div>
                      )}
                      {evento.acao_tomada && evento.status_processamento === 'processado' && (
                        <div className="mt-2 p-2 rounded bg-green-50 border border-green-200">
                          <p className="text-xs text-green-700">✅ {evento.acao_tomada}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}