import React, { useMemo } from "react";
import { TrendingUp, Users, CheckCircle, Clock, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function MetricasConversao({ jornadas }) {
  const metricas = useMemo(() => {
    const total = jornadas.length;
    const altas = jornadas.filter(j => j.etapa_atual === "alta").length;
    const emTratamento = jornadas.filter(j => j.etapa_atual === "em_tratamento").length;
    const inativos = jornadas.filter(j => j.etapa_atual === "inativo").length;
    
    const taxaConversao = total > 0 ? ((altas / total) * 100).toFixed(1) : 0;
    const taxaRetencao = total > 0 ? (((total - inativos) / total) * 100).toFixed(1) : 0;
    
    const satisfacaoMedia = jornadas.length > 0
      ? (jornadas.reduce((acc, j) => acc + (j.satisfacao || 0), 0) / jornadas.length).toFixed(1)
      : 0;

    return {
      total,
      altas,
      emTratamento,
      inativos,
      taxaConversao,
      taxaRetencao,
      satisfacaoMedia
    };
  }, [jornadas]);

  const dadosPorEtapa = useMemo(() => {
    const contagem = {};
    jornadas.forEach(j => {
      contagem[j.etapa_atual] = (contagem[j.etapa_atual] || 0) + 1;
    });

    const etapasLabels = {
      cadastro: "Cadastro",
      primeira_consulta: "1ª Consulta",
      avaliacao_inicial: "Avaliação",
      plano_tratamento: "Plano",
      em_tratamento: "Tratamento",
      acompanhamento: "Acompanhamento",
      retorno_agendado: "Retorno",
      alta: "Alta",
      inativo: "Inativo"
    };

    return Object.entries(contagem).map(([etapa, count]) => ({
      name: etapasLabels[etapa] || etapa,
      value: count,
      etapa: etapa
    }));
  }, [jornadas]);

  const CORES = {
    cadastro: "#6b7280",
    primeira_consulta: "#3b82f6",
    avaliacao_inicial: "#06b6d4",
    plano_tratamento: "#a855f7",
    em_tratamento: "#f97316",
    acompanhamento: "#eab308",
    retorno_agendado: "#22c55e",
    alta: "#10b981",
    inativo: "#9ca3af"
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Jornadas</p>
              <p className="text-2xl font-bold text-gray-800">{metricas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-green-600">{metricas.taxaConversao}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Taxa de Retenção</p>
              <p className="text-2xl font-bold text-purple-600">{metricas.taxaRetencao}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Satisfação Média</p>
              <p className="text-2xl font-bold text-yellow-500">{metricas.satisfacaoMedia}/5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Distribuição por Etapa */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Distribuição por Etapa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosPorEtapa}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPorEtapa.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[entry.etapa] || "#6b7280"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Quantidade por Etapa */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Pacientes por Etapa</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosPorEtapa}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {dadosPorEtapa.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[entry.etapa] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-2">📊 Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {metricas.emTratamento} pacientes em tratamento ativo</li>
            <li>• {metricas.altas} pacientes receberam alta</li>
            <li>• {metricas.inativos} pacientes inativos ({((metricas.inativos / metricas.total) * 100).toFixed(1)}%)</li>
          </ul>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="font-bold text-green-900 mb-2">✅ Qualidade</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Satisfação média: {metricas.satisfacaoMedia}/5.0 estrelas</li>
            <li>• Taxa de conversão para alta: {metricas.taxaConversao}%</li>
            <li>• Taxa de retenção: {metricas.taxaRetencao}%</li>
          </ul>
        </div>
      </div>
    </div>
  );
}