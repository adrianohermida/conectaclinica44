import React, { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Brain, TrendingUp, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardInteligenciaFAQ() {
  const [gerando, setGerando] = useState(false);
  const queryClient = useQueryClient();

  const { data: aprendizados = [] } = useQuery({
    queryKey: ['aprendizados-ia'],
    queryFn: () => base44.entities.AprendizadoIA.list('-created_date', 20)
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['artigos-faq'],
    queryFn: () => base44.entities.ArtigoFAQ.list()
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks-all'],
    queryFn: () => base44.entities.FeedbackUsuario.list('-created_date', 100)
  });

  const gerarFAQsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('popularFAQsEssenciaisV2', {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['artigos-faq']);
      queryClient.invalidateQueries(['aprendizados-ia']);
    }
  });

  const predizerMutation = useMutation({
    mutationFn: () => base44.functions.invoke('predizerInsatisfacao', {}),
    onSuccess: () => queryClient.invalidateQueries(['aprendizados-ia'])
  });

  const ultimaPredicao = aprendizados.find(a => a.tipo_aprendizado === 'predicao_insatisfacao');
  const ultimaPesquisa = aprendizados.find(a => a.tipo_aprendizado === 'pesquisa_mercado');

  // Métricas
  const taxaResolucao = feedbacks.length > 0 
    ? (feedbacks.filter(f => f.status === 'aprovado').length / feedbacks.length * 100).toFixed(1)
    : 0;

  const faqsPorCategoria = faqs.reduce((acc, f) => {
    acc[f.categoria] = (acc[f.categoria] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(faqsPorCategoria).map(([cat, count]) => ({
    categoria: cat,
    total: count
  }));

  return (
    <RouteGuard requireAuth>
      <PageHeader
        title="🧠 Inteligência FAQ"
        description="Aprendizado contínuo e predição de insatisfação"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="pc-card p-6">
          <Brain className="w-8 h-8 text-purple-600 mb-3" />
          <p className="text-3xl font-bold">{faqs.length}</p>
          <p className="text-sm text-gray-600">FAQs Ativos</p>
        </div>
        <div className="pc-card p-6">
          <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
          <p className="text-3xl font-bold">{taxaResolucao}%</p>
          <p className="text-sm text-gray-600">Taxa Resolução IA</p>
        </div>
        <div className="pc-card p-6">
          <AlertTriangle className="w-8 h-8 text-orange-600 mb-3" />
          <p className="text-3xl font-bold">{ultimaPredicao?.score_confianca || 0}</p>
          <p className="text-sm text-gray-600">Score Saúde Geral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pc-card p-6">
          <h3 className="font-bold mb-4">Ações de Aprendizado</h3>
          <div className="space-y-3">
            <Button 
              onClick={() => gerarFAQsMutation.mutate()} 
              loading={gerarFAQsMutation.isPending}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar 50 FAQs via Pesquisa Mercado
            </Button>
            <Button 
              onClick={() => predizerMutation.mutate()} 
              loading={predizerMutation.isPending}
              variant="outline"
              className="w-full"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Prever Insatisfações
            </Button>
          </div>
        </div>

        <div className="pc-card p-6">
          <h3 className="font-bold mb-4">FAQs por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" style={{ fontSize: '11px' }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#7E57FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {ultimaPredicao && (
        <div className="pc-card p-6 mt-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Última Predição de Insatisfação
          </h3>
          <div className="space-y-3">
            {ultimaPredicao.insights?.slice(0, 5).map((insight, idx) => (
              <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {ultimaPesquisa && (
        <div className="pc-card p-6 mt-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Insights de Mercado
          </h3>
          <div className="space-y-2">
            {ultimaPesquisa.insights?.map((insight, idx) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </RouteGuard>
  );
}