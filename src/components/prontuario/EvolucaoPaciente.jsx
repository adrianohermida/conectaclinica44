import React, { useMemo } from "react";
import { TrendingUp, Activity, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function EvolucaoPaciente({ prontuarios }) {
  const prontuariosOrdenados = useMemo(() => {
    return [...prontuarios].sort((a, b) => 
      new Date(a.data_atendimento) - new Date(b.data_atendimento)
    );
  }, [prontuarios]);

  const evolucaoTemporal = useMemo(() => {
    return prontuariosOrdenados.map((p, idx) => ({
      atendimento: `#${idx + 1}`,
      data: format(new Date(p.data_atendimento), "dd/MM"),
      dataCompleta: format(new Date(p.data_atendimento), "dd/MM/yyyy"),
      pa_sistolica: p.exame_fisico?.pressao_arterial?.split("/")[0] || null,
      pa_diastolica: p.exame_fisico?.pressao_arterial?.split("/")[1] || null,
      fc: p.exame_fisico?.frequencia_cardiaca || null,
      peso: p.exame_fisico?.peso || null,
      temperatura: p.exame_fisico?.temperatura || null
    }));
  }, [prontuariosOrdenados]);

  const diagnosticosFrequentes = useMemo(() => {
    const contagem = {};
    prontuarios.forEach(p => {
      if (p.hipotese_diagnostica) {
        contagem[p.hipotese_diagnostica] = (contagem[p.hipotese_diagnostica] || 0) + 1;
      }
    });
    return Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [prontuarios]);

  const medicamentosRecorrentes = useMemo(() => {
    const contagem = {};
    prontuarios.forEach(p => {
      p.medicamentos_uso?.forEach(med => {
        contagem[med] = (contagem[med] || 0) + 1;
      });
    });
    return Object.entries(contagem)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [prontuarios]);

  if (prontuarios.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Sem dados suficientes para análise de evolução</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-green-900">Acompanhamento de Evolução</h3>
        </div>
        <p className="text-sm text-green-800">
          Análise temporal com {prontuarios.length} atendimento(s)
        </p>
      </div>

      {/* Resumo Estatístico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Total Consultas</p>
          <p className="text-2xl font-bold text-gray-800">{prontuarios.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Período</p>
          <p className="text-sm font-bold text-gray-800">
            {prontuarios.length > 0 ? 
              `${format(new Date(prontuariosOrdenados[0].data_atendimento), "MM/yy")} - ${format(new Date(prontuariosOrdenados[prontuariosOrdenados.length - 1].data_atendimento), "MM/yy")}` 
              : "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Diagnósticos</p>
          <p className="text-2xl font-bold text-gray-800">{diagnosticosFrequentes.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Medicamentos</p>
          <p className="text-2xl font-bold text-gray-800">{medicamentosRecorrentes.length}</p>
        </div>
      </div>

      {/* Gráficos de Sinais Vitais */}
      {evolucaoTemporal.some(e => e.peso || e.pa_sistolica || e.fc) && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-4">📊 Evolução dos Sinais Vitais</h4>
          
          {/* Peso */}
          {evolucaoTemporal.some(e => e.peso) && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Peso (kg)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolucaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="peso" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pressão Arterial */}
          {evolucaoTemporal.some(e => e.pa_sistolica) && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Pressão Arterial (mmHg)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolucaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pa_sistolica" stroke="#ef4444" strokeWidth={2} name="Sistólica" />
                  <Line type="monotone" dataKey="pa_diastolica" stroke="#f59e0b" strokeWidth={2} name="Diastólica" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Diagnósticos Frequentes */}
      {diagnosticosFrequentes.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-3">🔍 Diagnósticos Mais Frequentes</h4>
          <div className="space-y-2">
            {diagnosticosFrequentes.map(([diag, count], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm text-gray-800">{diag}</span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                  {count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linha do Tempo */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h4 className="font-bold text-gray-800 mb-4">📅 Linha do Tempo</h4>
        <div className="space-y-3">
          {prontuariosOrdenados.map((p, idx) => (
            <div key={p.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-[#0B7A9E] rounded-full"></div>
                {idx < prontuariosOrdenados.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {format(new Date(p.data_atendimento), "dd/MM/yyyy")}
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-600 capitalize">{p.tipo_atendimento}</span>
                </div>
                <p className="text-sm text-gray-700">{p.queixa_principal}</p>
                {p.hipotese_diagnostica && (
                  <p className="text-xs text-gray-600 mt-1">
                    Diagnóstico: {p.hipotese_diagnostica}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}