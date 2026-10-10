import React, { useMemo } from "react";
import { FileText, Calendar, User, Brain, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function HistoricoAnalises({ analises }) {
  const estatisticas = useMemo(() => {
    const total = analises.length;
    const aprovadas = analises.filter(a => a.status_validacao === "aprovado").length;
    const pendentes = analises.filter(a => a.status_validacao === "pendente").length;
    const rejeitadas = analises.filter(a => a.status_validacao === "rejeitado").length;
    const confiancaMedia = analises.length > 0
      ? Math.round(analises.reduce((acc, a) => acc + (a.confianca_extracao || 0), 0) / analises.length)
      : 0;

    return { total, aprovadas, pendentes, rejeitadas, confiancaMedia };
  }, [analises]);

  const dadosPorTipo = useMemo(() => {
    const contagem = {};
    analises.forEach(a => {
      const tipo = a.tipo_documento || "outro";
      contagem[tipo] = (contagem[tipo] || 0) + 1;
    });

    const labels = {
      exame_sangue: "Exames Sangue",
      exame_imagem: "Imagens",
      laudo_medico: "Laudos",
      receita: "Receitas",
      relatorio: "Relatórios",
      outro: "Outros"
    };

    return Object.entries(contagem).map(([tipo, count]) => ({
      name: labels[tipo] || tipo,
      value: count
    }));
  }, [analises]);

  const CORES = ["#0B7A9E", "#58B4D4", "#9B7EC8", "#F28C82", "#A8E6CF", "#FFD97D"];

  const dadosPorStatus = [
    { name: "Aprovadas", value: estatisticas.aprovadas, cor: "#10b981" },
    { name: "Pendentes", value: estatisticas.pendentes, cor: "#f59e0b" },
    { name: "Rejeitadas", value: estatisticas.rejeitadas, cor: "#ef4444" }
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Análises</p>
              <p className="text-2xl font-bold text-gray-800">{estatisticas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Aprovadas</p>
              <p className="text-2xl font-bold text-green-600">{estatisticas.aprovadas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">{estatisticas.pendentes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Confiança Média</p>
              <p className="text-2xl font-bold text-purple-600">{estatisticas.confiancaMedia}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico por Tipo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Análises por Tipo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosPorTipo}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPorTipo.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico por Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">Status de Validação</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosPorStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {dadosPorStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline de Análises Recentes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Análises Recentes</h3>
        <div className="space-y-3">
          {analises.slice(0, 10).map((analise) => (
            <div key={analise.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm">{analise.nome_arquivo}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {analise.paciente_nome} • {format(new Date(analise.created_date), "dd/MM/yy", { locale: ptBR })}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        analise.status_validacao === "aprovado" ? "bg-green-100 text-green-700" :
                        analise.status_validacao === "pendente" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {analise.status_validacao}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {analise.confianca_extracao || 0}% confiança
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}