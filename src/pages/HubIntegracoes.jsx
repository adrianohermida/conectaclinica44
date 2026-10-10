import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import HubTabs from "@/components/ui/HubTabs";
import { 
  Zap, Activity, DollarSign, Shield, Database, 
  CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle,
  Loader2, CreditCard, Mail, Phone, FileSignature
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/**
 * HUB INTEGRAÇÕES - Comando e controle de TODAS as integrações externas
 * 
 * Consolidado:
 * - Stripe (billing)
 * - SendGrid (email)
 * - InfoSimples (certidões)
 * - Authentique (assinatura digital)
 * - Twilio (WhatsApp)
 */
export default function HubIntegracoes() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // HEALTH CHECKS em paralelo
  const { data: stripeHealth } = useQuery({
    queryKey: ["health-stripe"],
    queryFn: async () => {
      try {
        const eventos = await base44.entities.StripeEventLog.filter({}, "-created_date", 10);
        const ultimoEvento = eventos[0];
        const latenciaMedia = eventos.reduce((acc, e) => acc + (e.tempo_processamento_ms || 0), 0) / eventos.length;
        
        return {
          status: eventos.length > 0 ? 'online' : 'idle',
          last_event: ultimoEvento?.created_date,
          latencia_media_ms: latenciaMedia.toFixed(0),
          eventos_24h: eventos.length
        };
      } catch {
        return { status: 'error' };
      }
    },
    staleTime: 60 * 1000
  });

  const { data: sendGridHealth } = useQuery({
    queryKey: ["health-sendgrid"],
    queryFn: async () => {
      try {
        const emails = await base44.entities.SendGridAuditoria.filter({}, "-created_date", 100);
        const ultimas24h = emails.filter(e => {
          const diff = Date.now() - new Date(e.created_date).getTime();
          return diff < 24 * 60 * 60 * 1000;
        });
        
        const taxaEntrega = ultimas24h.length > 0 
          ? (ultimas24h.filter(e => e.status === 'delivered').length / ultimas24h.length * 100).toFixed(1)
          : 0;
        
        return {
          status: ultimas24h.length > 0 ? 'online' : 'idle',
          last_email: emails[0]?.created_date,
          taxa_entrega: taxaEntrega,
          emails_24h: ultimas24h.length
        };
      } catch {
        return { status: 'error' };
      }
    },
    staleTime: 60 * 1000
  });

  const { data: infosimplesHealth } = useQuery({
    queryKey: ["health-infosimples"],
    queryFn: async () => {
      try {
        const consumos = await base44.entities.ConsumoRecurso.filter({
          recurso: { $in: ['infosimples_consulta', 'infosimples_consulta_cached'] }
        }, "-created_date", 50);
        
        const ultimas24h = consumos.filter(c => {
          const diff = Date.now() - new Date(c.created_date).getTime();
          return diff < 24 * 60 * 60 * 1000;
        });

        const apiCalls = ultimas24h.filter(c => c.recurso === 'infosimples_consulta');
        const cacheHits = ultimas24h.filter(c => c.recurso === 'infosimples_consulta_cached');
        const hitRate = ultimas24h.length > 0 ? (cacheHits.length / ultimas24h.length * 100).toFixed(1) : 0;
        
        return {
          status: ultimas24h.length > 0 ? 'online' : 'idle',
          last_call: consumos[0]?.created_date,
          cache_hit_rate: hitRate,
          chamadas_24h: ultimas24h.length
        };
      } catch {
        return { status: 'error' };
      }
    },
    staleTime: 60 * 1000
  });

  const { data: authentiqueHealth } = useQuery({
    queryKey: ["health-authentique"],
    queryFn: async () => {
      try {
        const logs = await base44.entities.AssinaturaDigitalLog.filter({}, "-created_date", 50);
        const ultimas24h = logs.filter(l => {
          const diff = Date.now() - new Date(l.created_date).getTime();
          return diff < 24 * 60 * 60 * 1000;
        });
        
        return {
          status: logs.length > 0 ? 'online' : 'idle',
          last_signature: logs[0]?.created_date,
          chamadas_24h: ultimas24h.length,
          taxa_sucesso: logs.length > 0 
            ? (logs.filter(l => l.status === 'assinado').length / logs.length * 100).toFixed(1)
            : 0
        };
      } catch {
        return { status: 'error' };
      }
    },
    staleTime: 60 * 1000
  });

  const { data: twilioHealth } = useQuery({
    queryKey: ["health-twilio"],
    queryFn: async () => {
      try {
        const consumos = await base44.entities.ConsumoRecurso.filter({
          recurso: 'whatsapp_mensagem_recebida'
        }, "-created_date", 100);
        
        const ultimas24h = consumos.filter(c => {
          const diff = Date.now() - new Date(c.created_date).getTime();
          return diff < 24 * 60 * 60 * 1000;
        });
        
        return {
          status: ultimas24h.length > 0 ? 'online' : 'idle',
          last_message: consumos[0]?.created_date,
          chamadas_24h: ultimas24h.length
        };
      } catch {
        return { status: 'error' };
      }
    },
    staleTime: 60 * 1000
  });

  // CUSTOS (mês atual)
  const mesAtual = new Date().toISOString().substring(0, 7);

  const { data: custos, isLoading: loadingCustos } = useQuery({
    queryKey: ["custos-integracoes", mesAtual],
    queryFn: async () => {
      const consumos = await base44.entities.ConsumoRecurso.filter({
        mes_referencia: mesAtual,
        recurso: { 
          $in: [
            'email_enviado',
            'infosimples_consulta',
            'whatsapp_mensagem_recebida'
          ]
        }
      });

      const stripe = await base44.entities.StripeEventLog.filter({
        impacto_receita: true,
        data_evento: { $gte: `${mesAtual}-01` }
      });

      const custoEmail = consumos
        .filter(c => c.recurso === 'email_enviado')
        .reduce((acc, c) => acc + (c.custo_unitario_brl || 0), 0);

      const custoInfoSimples = consumos
        .filter(c => c.recurso === 'infosimples_consulta')
        .reduce((acc, c) => acc + (c.custo_unitario_brl || 0), 0);

      const custoWhatsApp = consumos
        .filter(c => c.recurso === 'whatsapp_mensagem_recebida')
        .reduce((acc, c) => acc + (c.custo_unitario_brl || 0), 0);

      const receitaStripe = stripe
        .filter(e => ['invoice.paid', 'charge.succeeded'].includes(e.event_type))
        .reduce((acc, e) => acc + (e.valor_centavos || 0), 0) / 100;

      return {
        stripe: receitaStripe,
        sendgrid: custoEmail,
        infosimples: custoInfoSimples,
        twilio: custoWhatsApp,
        authentique: 0, // Fixo mensal
        total_custo: custoEmail + custoInfoSimples + custoWhatsApp,
        total_receita: receitaStripe
      };
    },
    staleTime: 5 * 60 * 1000
  });

  const integracoes = [
    {
      nome: 'Stripe',
      icon: CreditCard,
      color: '#635bff',
      bgColor: '#f5f3ff',
      health: stripeHealth,
      custo_mes: 0,
      receita_mes: custos?.stripe || 0,
      chamadas_24h: stripeHealth?.eventos_24h || 0,
      metricas: [
        { label: 'Latência Média', value: `${stripeHealth?.latencia_media_ms || 0}ms` },
        { label: 'Receita Processada', value: `R$ ${(custos?.stripe || 0).toFixed(2)}` }
      ]
    },
    {
      nome: 'SendGrid',
      icon: Mail,
      color: '#1a73e8',
      bgColor: '#e8f1fb',
      health: sendGridHealth,
      custo_mes: custos?.sendgrid || 0,
      chamadas_24h: sendGridHealth?.emails_24h || 0,
      metricas: [
        { label: 'Taxa Entrega', value: `${sendGridHealth?.taxa_entrega || 0}%` },
        { label: 'Custo Estimado', value: `R$ ${(custos?.sendgrid || 0).toFixed(2)}` }
      ]
    },
    {
      nome: 'InfoSimples',
      icon: FileSignature,
      color: '#34a853',
      bgColor: '#e6f7ed',
      health: infosimplesHealth,
      custo_mes: custos?.infosimples || 0,
      chamadas_24h: infosimplesHealth?.chamadas_24h || 0,
      metricas: [
        { label: 'Cache Hit Rate', value: `${infosimplesHealth?.cache_hit_rate || 0}%` },
        { label: 'Custo Real', value: `R$ ${(custos?.infosimples || 0).toFixed(2)}` }
      ]
    },
    {
      nome: 'Authentique',
      icon: Shield,
      color: '#7E57FF',
      bgColor: '#f5f3ff',
      health: authentiqueHealth,
      custo_mes: 0,
      chamadas_24h: authentiqueHealth?.chamadas_24h || 0,
      metricas: [
        { label: 'Taxa Sucesso', value: `${authentiqueHealth?.taxa_sucesso || 0}%` },
        { label: 'Custo Fixo', value: 'Incluído' }
      ]
    },
    {
      nome: 'Twilio WhatsApp',
      icon: Phone,
      color: '#f59e0b',
      bgColor: '#fef9e5',
      health: twilioHealth,
      custo_mes: custos?.twilio || 0,
      chamadas_24h: twilioHealth?.chamadas_24h || 0,
      metricas: [
        { label: 'Mensagens 24h', value: twilioHealth?.chamadas_24h || 0 },
        { label: 'Custo Estimado', value: `R$ ${(custos?.twilio || 0).toFixed(2)}` }
      ]
    }
  ];

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      content: <OverviewTab integracoes={integracoes} custos={custos} loadingCustos={loadingCustos} />
    },
    {
      id: 'logs',
      label: 'Logs Unificados',
      icon: Database,
      content: <LogsUnificadosTab />
    },
    {
      id: 'configuracao',
      label: 'Configuração',
      icon: Zap,
      content: <ConfiguracaoTab />
    },
    {
      id: 'auditoria',
      label: 'Auditoria',
      icon: Shield,
      content: <AuditoriaTab />
    }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Hub de Integrações"
          description="Comando central de todas as APIs externas"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Integrações" }]}
        />

        <HubTabs tabs={tabs} defaultTab="overview" />
      </div>
    </RouteGuard>
  );
}

function OverviewTab({ integracoes, custos, loadingCustos }) {
  const [testando, setTestando] = React.useState(null);
  const [resultadosTestes, setResultadosTestes] = React.useState({});

  const executarHealthCheck = async (nome) => {
    setTestando(nome);
    try {
      const endpoints = {
        'Stripe': 'healthChecks/testarStripe',
        'SendGrid': 'healthChecks/testarSendGrid',
        'InfoSimples': 'healthChecks/testarInfoSimples',
        'Authentique': 'healthChecks/testarAuthentique',
        'Twilio WhatsApp': 'healthChecks/testarTwilio'
      };

      const res = await base44.functions.invoke(endpoints[nome], {});
      setResultadosTestes(prev => ({ ...prev, [nome]: res.data }));
    } catch (error) {
      setResultadosTestes(prev => ({ 
        ...prev, 
        [nome]: { status: 'error', error: error.message, tests: [] }
      }));
    }
    setTestando(null);
  };

  if (loadingCustos) {
    return <Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />;
  }

  const statusOnline = integracoes.filter(i => i.health?.status === 'online').length;
  const totalChamadas24h = integracoes.reduce((acc, i) => acc + i.chamadas_24h, 0);

  return (
    <div className="space-y-6">
      {/* KPIs Globais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">APIs Online</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{statusOnline}/{integracoes.length}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5" style={{ color: '#1a73e8' }} />
            <p className="text-xs text-gray-500">Chamadas 24h</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalChamadas24h.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#ea4335' }} />
            <p className="text-xs text-gray-500">Custo Mês Atual</p>
          </div>
          <p className="text-3xl font-bold text-red-600">R$ {(custos?.total_custo || 0).toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">Receita Processada</p>
          </div>
          <p className="text-3xl font-bold text-green-600">R$ {(custos?.total_receita || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Grid de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integracoes.map(integracao => {
          const Icon = integracao.icon;
          const status = integracao.health?.status || 'unknown';
          const statusIcon = status === 'online' ? CheckCircle2 : status === 'error' ? XCircle : Clock;
          const StatusIcon = statusIcon;
          const resultado = resultadosTestes[integracao.nome];

          return (
            <div key={integracao.nome} className="bg-white rounded-xl p-6 border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: integracao.bgColor }}>
                    <Icon className="w-6 h-6" style={{ color: integracao.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{integracao.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusIcon className="w-4 h-4" style={{ 
                        color: status === 'online' ? '#34a853' : status === 'error' ? '#ea4335' : '#fbbc04' 
                      }} />
                      <span className="text-xs font-medium" style={{ 
                        color: status === 'online' ? '#34a853' : status === 'error' ? '#ea4335' : '#fbbc04'
                      }}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas */}
              <div className="space-y-2 mb-4">
                {integracao.metricas.map((metrica, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{metrica.label}</span>
                    <span className="font-bold text-gray-900">{metrica.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm pt-2 border-t" style={{ borderColor: '#e8eaed' }}>
                  <span className="text-gray-600">Custo/Mês</span>
                  <span className="font-bold text-red-600">
                    {integracao.custo_mes > 0 ? `R$ ${integracao.custo_mes.toFixed(2)}` : 'R$ 0,00'}
                  </span>
                </div>
              </div>

              {/* Botão Testar */}
              <button
                onClick={() => executarHealthCheck(integracao.nome)}
                disabled={testando === integracao.nome}
                className="w-full px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ backgroundColor: integracao.color, color: 'white' }}
              >
                {testando === integracao.nome ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Testar Agora
                  </>
                )}
              </button>

              {/* Resultado do Teste - TODOS OS DETALHES EXPOSTOS */}
              {resultado && (
                <div className={`mt-4 p-4 rounded-lg border-2 ${
                  resultado.status === 'success' ? 'bg-green-50 border-green-500' :
                  resultado.status === 'error' ? 'bg-red-50 border-red-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {resultado.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : resultado.status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="text-sm font-bold" style={{ 
                      color: resultado.status === 'success' ? '#16a34a' : 
                             resultado.status === 'error' ? '#dc2626' : '#ca8a04'
                    }}>
                      {resultado.status === 'success' ? 'PASSOU' : 
                       resultado.status === 'error' ? 'FALHOU' : 'AVISO'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {resultado.latencia_total_ms}ms
                    </span>
                  </div>

                  {/* TODOS OS TESTES - SEM ESCONDER NADA */}
                  <div className="space-y-2">
                    {resultado.tests?.map((test, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white border">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : test.status === 'info' ? 'ℹ️' : '⚠️'}</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{test.nome}</p>
                            {test.detalhes && (
                              <p className="text-xs text-gray-600 mt-1">{test.detalhes}</p>
                            )}
                            {test.erro && (
                              <pre className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded overflow-auto max-h-32">
                                {test.erro}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ERRO GERAL SE EXISTIR */}
                  {resultado.error && (
                    <div className="mt-3 p-3 rounded-lg bg-red-100">
                      <p className="text-xs font-bold text-red-800 mb-1">ERRO GERAL:</p>
                      <pre className="text-xs text-red-700 overflow-auto max-h-40">
                        {resultado.error}
                      </pre>
                    </div>
                  )}

                  {/* TIMESTAMP */}
                  <p className="text-xs text-gray-500 mt-3 border-t pt-2">
                    Executado em: {resultado.timestamp ? new Date(resultado.timestamp).toLocaleString('pt-BR') : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alerta Custo */}
      {(custos?.total_custo || 0) > 100 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-orange-900 mb-1">
                ⚠️ Custo elevado este mês: R$ {(custos.total_custo).toFixed(2)}
              </h3>
              <p className="text-sm text-orange-700">
                Revise as métricas de cache e rate limiting para otimizar custos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogsUnificadosTab() {
  const mesAtual = new Date().toISOString().substring(0, 7);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs-unificados", mesAtual],
    queryFn: async () => {
      const [stripe, sendgrid, infosimples, consumos] = await Promise.all([
        base44.entities.StripeEventLog.filter({}, "-created_date", 50),
        base44.entities.SendGridAuditoria.filter({}, "-created_date", 50),
        base44.entities.ConsumoRecurso.filter({ 
          recurso: { $in: ['infosimples_consulta', 'infosimples_consulta_cached'] }
        }, "-created_date", 50),
        base44.entities.ConsumoRecurso.filter({ 
          recurso: 'whatsapp_mensagem_recebida'
        }, "-created_date", 50)
      ]);

      const unificado = [
        ...stripe.map(e => ({ tipo: 'Stripe', timestamp: e.created_date, dados: e })),
        ...sendgrid.map(e => ({ tipo: 'SendGrid', timestamp: e.created_date, dados: e })),
        ...infosimples.map(e => ({ tipo: 'InfoSimples', timestamp: e.created_date, dados: e })),
        ...consumos.map(e => ({ tipo: 'WhatsApp', timestamp: e.created_date, dados: e }))
      ];

      unificado.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return unificado.slice(0, 100);
    },
    staleTime: 30 * 1000
  });

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900">Últimas 100 Chamadas (Todas as Integrações)</h3>
      
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <table className="w-full">
          <thead className="bg-gray-50 border-b" style={{ borderColor: '#e8eaed' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Integração</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Detalhes</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#e8eaed' }}>
            {logs.map((log, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                    backgroundColor: log.tipo === 'Stripe' ? '#f5f3ff' : 
                                     log.tipo === 'SendGrid' ? '#e8f1fb' :
                                     log.tipo === 'InfoSimples' ? '#e6f7ed' : '#fef9e5',
                    color: log.tipo === 'Stripe' ? '#635bff' :
                           log.tipo === 'SendGrid' ? '#1a73e8' :
                           log.tipo === 'InfoSimples' ? '#34a853' : '#f59e0b'
                  }}>
                    {log.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-900">
                  {log.tipo === 'Stripe' && `Evento: ${log.dados.event_type}`}
                  {log.tipo === 'SendGrid' && `Para: ${log.dados.destinatario}`}
                  {log.tipo === 'InfoSimples' && `Tipo: ${log.dados.metadata?.tipo}`}
                  {log.tipo === 'WhatsApp' && `From: ${log.dados.metadata?.from}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    log.dados.status === 'sent' || log.dados.status === 'delivered' || log.dados.status_processamento === 'processado' ? 'bg-green-100 text-green-700' :
                    log.dados.status === 'falhado' || log.dados.erro_detalhes ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {log.dados.status || log.dados.status_processamento || 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfiguracaoTab() {
  const rateLimits = [
    { api: 'Stripe', limite: 'Sem limite (Stripe SDK)', atual: '-' },
    { api: 'SendGrid', limite: '100 emails/min por clínica', atual: 'Ativo' },
    { api: 'InfoSimples', limite: '10 consultas/min por clínica', atual: 'Ativo' },
    { api: 'Authentique', limite: 'Sem limite', atual: '-' },
    { api: 'Twilio', limite: 'Twilio managed', atual: '-' }
  ];

  const retries = [
    { api: 'Stripe', estrategia: 'Stripe SDK auto-retry', max: 'N/A' },
    { api: 'SendGrid', estrategia: 'Exponencial backoff', max: '3 tentativas' },
    { api: 'InfoSimples', estrategia: 'Cache first', max: 'N/A' },
    { api: 'Authentique', estrategia: 'Sem retry', max: '-' },
    { api: 'Twilio', estrategia: 'Webhook idempotente', max: 'N/A' }
  ];

  return (
    <div className="space-y-6">
      {/* Rate Limits */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" style={{ color: '#7E57FF' }} />
          Rate Limiting por API
        </h3>
        <table className="w-full">
          <thead className="border-b" style={{ borderColor: '#e8eaed' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">API</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Limite Configurado</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#e8eaed' }}>
            {rateLimits.map((r, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.api}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.limite}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    r.atual === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {r.atual}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Retry Policies */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: '#7E57FF' }} />
          Estratégias de Retry
        </h3>
        <table className="w-full">
          <thead className="border-b" style={{ borderColor: '#e8eaed' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">API</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estratégia</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Max Retries</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: '#e8eaed' }}>
            {retries.map((r, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.api}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.estrategia}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditoriaTab() {
  const mesAtual = new Date().toISOString().substring(0, 7);

  const { data: auditoria = [], isLoading } = useQuery({
    queryKey: ["auditoria-integracoes", mesAtual],
    queryFn: async () => {
      const consumos = await base44.entities.ConsumoRecurso.filter({
        mes_referencia: mesAtual
      }, "-created_date", 500);

      // Agrupar por clínica e recurso
      const porClinica = {};
      consumos.forEach(c => {
        if (!porClinica[c.clinica_id]) {
          porClinica[c.clinica_id] = {};
        }
        if (!porClinica[c.clinica_id][c.recurso]) {
          porClinica[c.clinica_id][c.recurso] = { count: 0, custo: 0 };
        }
        porClinica[c.clinica_id][c.recurso].count += c.quantidade || 1;
        porClinica[c.clinica_id][c.recurso].custo += c.custo_unitario_brl || 0;
      });

      return Object.entries(porClinica).map(([clinica_id, recursos]) => ({
        clinica_id,
        recursos,
        total_custo: Object.values(recursos).reduce((acc, r) => acc + r.custo, 0),
        total_chamadas: Object.values(recursos).reduce((acc, r) => acc + r.count, 0)
      }))
      .sort((a, b) => b.total_custo - a.total_custo);
    },
    staleTime: 60 * 1000
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-auditoria"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarClinicas', {});
      return res.data.clinicas || [];
    }
  });

  if (isLoading) {
    return <Loader2 className="w-8 h-8 animate-spin mx-auto my-12" />;
  }

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-900">Consumo por Clínica (Mês Atual)</h3>
      
      <div className="space-y-3">
        {auditoria.map((item, idx) => {
          const clinica = clinicas.find(c => c.id === item.clinica_id);
          
          return (
            <div key={idx} className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">{clinica?.nome || item.clinica_id.substring(0, 12)}</h4>
                  <p className="text-sm text-gray-600">{item.total_chamadas} chamadas · R$ {item.total_custo.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries(item.recursos).map(([recurso, stats]) => (
                  <div key={recurso} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">{recurso.split('_').pop()}</p>
                    <p className="font-bold text-gray-900">{stats.count}x</p>
                    <p className="text-xs text-red-600">R$ {stats.custo.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}