import React, { useMemo } from "react";
import { Shield, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar, FileText, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { differenceInDays, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const CORES_STATUS = {
  vigente: "#10b981",
  vencendo: "#f59e0b",
  vencida: "#ef4444"
};

const CORES_CATEGORIA = {
  federal: "#3b82f6",
  estadual: "#8b5cf6",
  municipal: "#06b6d4",
  trabalhista: "#f97316",
  judicial: "#ec4899",
  ambiental: "#22c55e"
};

export default function DashboardCompliance({ certidoes = [], agendamentos = [], historico = [] }) {
  const hoje = new Date();

  // Estatísticas por status
  const estatisticasStatus = useMemo(() => {
    let vigentes = 0, vencendo = 0, vencidas = 0;
    
    certidoes.forEach(cert => {
      const dias = differenceInDays(new Date(cert.data_validade), hoje);
      if (dias < 0) vencidas++;
      else if (dias <= 30) vencendo++;
      else vigentes++;
    });

    return [
      { name: "Vigentes", value: vigentes, color: CORES_STATUS.vigente },
      { name: "Vencendo", value: vencendo, color: CORES_STATUS.vencendo },
      { name: "Vencidas", value: vencidas, color: CORES_STATUS.vencida }
    ];
  }, [certidoes]);

  // Estatísticas por categoria
  const estatisticasCategoria = useMemo(() => {
    const porCategoria = {};
    certidoes.forEach(cert => {
      const cat = cert.categoria || "federal";
      porCategoria[cat] = (porCategoria[cat] || 0) + 1;
    });

    return Object.entries(porCategoria).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: CORES_CATEGORIA[key] || "#6b7280"
    }));
  }, [certidoes]);

  // Próximos vencimentos (7 dias)
  const proximosVencimentos = useMemo(() => {
    return certidoes
      .filter(cert => {
        const dias = differenceInDays(new Date(cert.data_validade), hoje);
        return dias >= 0 && dias <= 7;
      })
      .sort((a, b) => new Date(a.data_validade) - new Date(b.data_validade))
      .slice(0, 5);
  }, [certidoes]);

  // Atividade recente
  const atividadeRecente = useMemo(() => {
    return historico.slice(0, 5);
  }, [historico]);

  // Taxa de conformidade
  const taxaConformidade = useMemo(() => {
    if (certidoes.length === 0) return 100;
    const vigentes = certidoes.filter(c => differenceInDays(new Date(c.data_validade), hoje) > 0).length;
    return Math.round((vigentes / certidoes.length) * 100);
  }, [certidoes]);

  // Agendamentos ativos
  const agendamentosAtivos = agendamentos.filter(a => a.ativo).length;

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{certidoes.length}</p>
              <p className="text-xs text-gray-500">Total Certidões</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              taxaConformidade >= 90 ? "bg-green-100" : taxaConformidade >= 70 ? "bg-yellow-100" : "bg-red-100"
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                taxaConformidade >= 90 ? "text-green-600" : taxaConformidade >= 70 ? "text-yellow-600" : "text-red-600"
              }`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{taxaConformidade}%</p>
              <p className="text-xs text-gray-500">Conformidade</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{proximosVencimentos.length}</p>
              <p className="text-xs text-gray-500">Vencendo (7d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{agendamentosAtivos}</p>
              <p className="text-xs text-gray-500">Agend. Ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Pizza - Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Status das Certidões</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estatisticasStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {estatisticasStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras - Por Categoria */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Por Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={estatisticasCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {estatisticasCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Listas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximos Vencimentos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Próximos Vencimentos
          </h3>
          <div className="space-y-3">
            {proximosVencimentos.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhum vencimento nos próximos 7 dias</p>
            ) : (
              proximosVencimentos.map(cert => {
                const dias = differenceInDays(new Date(cert.data_validade), hoje);
                return (
                  <div key={cert.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{cert.titulo}</p>
                      <p className="text-xs text-gray-500">{cert.orgao_emissor}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      dias <= 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias} dias`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Atividade Recente
          </h3>
          <div className="space-y-3">
            {atividadeRecente.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma atividade recente</p>
            ) : (
              atividadeRecente.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    h.tipo_registro === "emissao" ? "bg-green-100" : "bg-blue-100"
                  }`}>
                    {h.tipo_registro === "emissao" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{h.certidao_titulo}</p>
                    <p className="text-xs text-gray-500">
                      {h.tipo_registro?.replace(/_/g, " ")} • {format(new Date(h.created_date), "dd/MM HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}