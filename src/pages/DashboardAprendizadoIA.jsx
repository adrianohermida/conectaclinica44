import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, CheckCircle2, AlertCircle, Loader2, ThumbsUp, ThumbsDown, Eye, Zap, MessageSquare } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardAprendizadoIA() {
  const [periodo, setPeriodo] = useState(30);
  const [executando, setExecutando] = useState(false);
  const queryClient = useQueryClient();

  const executarAprendizadoMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('executarAprendizadoManual', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['aprendizado-metricas']);
      alert(`✅ Aprendizado executado!\n\nConversas analisadas: ${data.resultado?.relatorio?.conversas_analisadas || 0}\nFAQs criados: ${data.resultado?.relatorio?.faqs_criados || 0}`);
    },
    onError: (error) => {
      alert(`❌ Erro: ${error.message}`);
    }
  });

  const { data: metricas, isLoading } = useQuery({
    queryKey: ['aprendizado-metricas', periodo],
    queryFn: async () => {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - periodo);

      const [conversas, aprendizados, playbooks, faqs] = await Promise.all([
        base44.entities.ConversaWidget.filter({ created_date: { $gte: dataLimite.toISOString() } }),
        base44.entities.AprendizadoIA.filter({ created_date: { $gte: dataLimite.toISOString() } }),
        base44.entities.PlaybookVendas.list(),
        base44.entities.ArtigoFAQ.filter({ origem: 'ia_sugerida' })
      ]);

      const conversasConvertidas = conversas.filter(c => c.resultado === 'converteu');
      const taxaConversao = conversas.length > 0 ? ((conversasConvertidas.length / conversas.length) * 100).toFixed(2) : 0;

      return {
        total_conversas: conversas.length,
        taxa_conversao: parseFloat(taxaConversao),
        conversas_convertidas: conversasConvertidas.length,
        tempo_medio: conversas.reduce((a, c) => a + (c.tempo_total_conversa_seg || 0), 0) / conversas.length || 0,
        aprendizados_pendentes: aprendizados.filter(a => !a.aprovado).length,
        aprendizados_aplicados: aprendizados.filter(a => a.aplicado).length,
        playbooks_gerados: playbooks.length,
        faqs_sugeridos: faqs.filter(f => !f.aprovado).length,
        custo_total_ia: conversas.reduce((a, c) => a + (c.custo_openai_usd || 0), 0),
        conversas_por_dia: agruparPorDia(conversas),
        top_gaps: extrairTopGaps(conversas)
      };
    }
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({ tipo, id }) => {
      if (tipo === 'faq') {
        await base44.entities.ArtigoFAQ.update(id, { aprovado: true, ativo: true, aprovado_por: (await base44.auth.me()).email });
      } else if (tipo === 'aprendizado') {
        await base44.entities.AprendizadoIA.update(id, { aprovado: true, aprovado_por: (await base44.auth.me()).email });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['aprendizado-metricas'])
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>🧠 Aprendizado Contínuo da IA</h1>
          <p className="text-sm" style={{ color: 'var(--brand-text-secondary)' }}>Motor autônomo de otimização baseado em dados reais</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => executarAprendizadoMutation.mutate()}
            disabled={executarAprendizadoMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {executarAprendizadoMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                ▶️ Executar Agora
              </>
            )}
          </button>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--brand-border-primary)' }}
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          titulo="Conversas Analisadas"
          valor={metricas.total_conversas}
          icone={MessageSquare}
          cor="#7E57FF"
        />
        <KPICard
          titulo="Taxa de Conversão"
          valor={`${metricas.taxa_conversao}%`}
          icone={TrendingUp}
          cor="#34a853"
          trend={metricas.taxa_conversao >= 30 ? 'up' : 'down'}
        />
        <KPICard
          titulo="FAQs Sugeridos"
          valor={metricas.faqs_sugeridos}
          icone={Brain}
          cor="#fbbc04"
          badge={metricas.faqs_sugeridos > 0 ? 'Aguardando aprovação' : null}
        />
        <KPICard
          titulo="Custo IA (USD)"
          valor={`$${metricas.custo_total_ia.toFixed(2)}`}
          icone={Zap}
          cor="#0B7A9E"
          subtexto={`$${(metricas.custo_total_ia / metricas.total_conversas || 0).toFixed(3)}/conversa`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm" style={{ border: '1px solid var(--brand-border-primary)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--brand-text-primary)' }}>Conversas por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metricas.conversas_por_dia}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--brand-border-primary)" />
              <XAxis dataKey="dia" stroke="var(--brand-text-tertiary)" />
              <YAxis stroke="var(--brand-text-tertiary)" />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#7E57FF" strokeWidth={2} />
              <Line type="monotone" dataKey="convertidas" stroke="#34a853" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm" style={{ border: '1px solid var(--brand-border-primary)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--brand-text-primary)' }}>Top Gaps no FAQ</h3>
          <div className="space-y-3">
            {metricas.top_gaps.slice(0, 5).map((gap, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-error)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--brand-text-primary)' }}>{gap.pergunta}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--brand-text-tertiary)' }}>{gap.frequencia}x sem resposta</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sugestões Pendentes de Aprovação */}
      <SugestoesAprovacao aprovarMutation={aprovarMutation} />
    </div>
  );
}

function KPICard({ titulo, valor, icone: Icon, cor, trend, badge, subtexto }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm" style={{ border: '1px solid var(--brand-border-primary)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cor}15` }}>
          <Icon className="w-6 h-6" style={{ color: cor }} />
        </div>
        {badge && <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">{badge}</span>}
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--brand-text-primary)' }}>{valor}</p>
      <p className="text-xs" style={{ color: 'var(--brand-text-tertiary)' }}>{titulo}</p>
      {subtexto && <p className="text-xs mt-1" style={{ color: 'var(--brand-text-secondary)' }}>{subtexto}</p>}
    </div>
  );
}

function SugestoesAprovacao({ aprovarMutation }) {
  const { data: faqsPendentes } = useQuery({
    queryKey: ['faqs-pendentes'],
    queryFn: () => base44.entities.ArtigoFAQ.filter({ origem: 'ia_sugerida', aprovado: false, ativo: false })
  });

  const { data: aprendizadosPendentes } = useQuery({
    queryKey: ['aprendizados-pendentes'],
    queryFn: () => base44.entities.AprendizadoIA.filter({ aprovado: false })
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm" style={{ border: '1px solid var(--brand-border-primary)' }}>
      <h3 className="font-semibold mb-6" style={{ color: 'var(--brand-text-primary)' }}>⚡ Sugestões Aguardando Aprovação</h3>

      {/* FAQs Sugeridos */}
      {faqsPendentes?.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--brand-text-secondary)' }}>📝 FAQs Sugeridos pela IA</h4>
          <div className="space-y-3">
            {faqsPendentes.map(faq => (
              <div key={faq.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--brand-bg-secondary)', border: '1px solid var(--brand-border-primary)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm mb-1" style={{ color: 'var(--brand-text-primary)' }}>{faq.pergunta}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--brand-text-secondary)' }}>{faq.resposta_curta}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => aprovarMutation.mutate({ tipo: 'faq', id: faq.id })}
                      className="p-2 rounded-lg hover:bg-green-50 transition-colors"
                      style={{ border: '1px solid var(--brand-success)' }}
                      title="Aprovar"
                    >
                      <ThumbsUp className="w-4 h-4" style={{ color: 'var(--brand-success)' }} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-red-50 transition-colors" style={{ border: '1px solid var(--brand-error)' }} title="Rejeitar">
                      <ThumbsDown className="w-4 h-4" style={{ color: 'var(--brand-error)' }} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--brand-text-tertiary)' }}>
                  <span>Categoria: {faq.categoria}</span>
                  <span>•</span>
                  <span>Gerado: {new Date(faq.created_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aprendizados */}
      {aprendizadosPendentes?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--brand-text-secondary)' }}>💡 Insights & Melhorias</h4>
          <div className="space-y-3">
            {aprendizadosPendentes.map(apr => (
              <div key={apr.id} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--brand-warning-50)', border: '1px solid var(--brand-warning)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-2" style={{ color: 'var(--brand-text-primary)' }}>
                      {apr.tipo_aprendizado.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <ul className="space-y-1 text-xs" style={{ color: 'var(--brand-text-secondary)' }}>
                      {apr.insights?.slice(0, 3).map((insight, idx) => (
                        <li key={idx}>• {insight}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => aprovarMutation.mutate({ tipo: 'aprendizado', id: apr.id })}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: 'var(--brand-success)' }}
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
                {apr.impacto_estimado && (
                  <div className="flex gap-4 text-xs mt-3 pt-3" style={{ borderTop: '1px solid var(--brand-warning)' }}>
                    <span>📈 Conversão: +{apr.impacto_estimado.taxa_resolucao_esperada}%</span>
                    <span>📉 Tickets: -{apr.impacto_estimado.reducao_tickets}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {faqsPendentes?.length === 0 && aprendizadosPendentes?.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--brand-success)' }} />
          <p className="text-sm" style={{ color: 'var(--brand-text-secondary)' }}>Nenhuma sugestão pendente</p>
        </div>
      )}
    </div>
  );
}

function agruparPorDia(conversas) {
  const grupos = {};
  conversas.forEach(c => {
    const dia = new Date(c.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!grupos[dia]) grupos[dia] = { dia, total: 0, convertidas: 0 };
    grupos[dia].total++;
    if (c.resultado === 'converteu') grupos[dia].convertidas++;
  });
  return Object.values(grupos).sort((a, b) => {
    const [diaA, mesA] = a.dia.split('/');
    const [diaB, mesB] = b.dia.split('/');
    return new Date(2025, mesA - 1, diaA) - new Date(2025, mesB - 1, diaB);
  });
}

function extrairTopGaps(conversas) {
  const todasPerguntas = conversas.flatMap(c => c.perguntas_sem_resposta || []);
  const mapa = {};
  todasPerguntas.forEach(p => {
    mapa[p] = (mapa[p] || 0) + 1;
  });
  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pergunta, frequencia]) => ({ pergunta, frequencia }));
}