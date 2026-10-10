import React from "react";
import { CheckCircle, Circle, ArrowRight, Clock } from "lucide-react";

export default function VisualizacaoFluxo({ jornada, agendamentos, prontuarios }) {
  const etapas = [
    { id: "cadastro", label: "Cadastro", cor: "bg-gray-500" },
    { id: "primeira_consulta", label: "1ª Consulta", cor: "bg-blue-500" },
    { id: "avaliacao_inicial", label: "Avaliação", cor: "bg-cyan-500" },
    { id: "plano_tratamento", label: "Plano", cor: "bg-purple-500" },
    { id: "em_tratamento", label: "Tratamento", cor: "bg-orange-500" },
    { id: "acompanhamento", label: "Acompanhamento", cor: "bg-yellow-500" },
    { id: "retorno_agendado", label: "Retorno", cor: "bg-green-500" },
    { id: "alta", label: "Alta", cor: "bg-emerald-600" }
  ];

  const etapaAtualIndex = etapas.findIndex(e => e.id === jornada.etapa_atual);
  
  const consultasRealizadas = prontuarios.filter(p => p.paciente_id === jornada.paciente_id).length;
  const proximoAgendamento = agendamentos
    .filter(a => a.paciente_id === jornada.paciente_id && new Date(a.data) > new Date())
    .sort((a, b) => new Date(a.data) - new Date(b.data))[0];

  return (
    <div className="space-y-6">
      {/* Fluxo Visual */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-6">Fluxo da Jornada</h3>
        
        {/* Desktop - Horizontal */}
        <div className="hidden md:flex items-center justify-between">
          {etapas.map((etapa, index) => {
            const isConcluida = index < etapaAtualIndex;
            const isAtual = index === etapaAtualIndex;
            const isPendente = index > etapaAtualIndex;

            return (
              <React.Fragment key={etapa.id}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isConcluida 
                        ? "bg-green-500" 
                        : isAtual 
                        ? etapa.cor 
                        : "bg-gray-200"
                    }`}
                  >
                    {isConcluida ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : isAtual ? (
                      <Clock className="w-6 h-6 text-white animate-pulse" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <p
                    className={`text-xs text-center font-medium ${
                      isAtual ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {etapa.label}
                  </p>
                </div>
                {index < etapas.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                    <div
                      className={`h-full transition-all ${
                        index < etapaAtualIndex ? "bg-green-500" : "bg-gray-200"
                      }`}
                      style={{ width: index < etapaAtualIndex ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile - Vertical */}
        <div className="md:hidden space-y-3">
          {etapas.map((etapa, index) => {
            const isConcluida = index < etapaAtualIndex;
            const isAtual = index === etapaAtualIndex;

            return (
              <div key={etapa.id} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isConcluida ? "bg-green-500" : isAtual ? etapa.cor : "bg-gray-200"
                  }`}
                >
                  {isConcluida ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isAtual ? (
                    <Clock className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className={`font-medium ${isAtual ? "text-gray-900" : "text-gray-500"}`}>
                  {etapa.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Consultas Realizadas</p>
          <p className="text-2xl font-bold text-blue-900">{consultasRealizadas}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Tratamentos</p>
          <p className="text-2xl font-bold text-purple-900">
            {jornada.tratamentos_realizados?.length || 0}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 mb-1">Próximo Agendamento</p>
          <p className="text-sm font-bold text-green-900">
            {proximoAgendamento 
              ? new Date(proximoAgendamento.data).toLocaleDateString('pt-BR')
              : "Nenhum"}
          </p>
        </div>
      </div>

      {/* Histórico de Etapas */}
      {jornada.historico_etapas && jornada.historico_etapas.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Histórico de Mudanças</h3>
          <div className="space-y-3">
            {jornada.historico_etapas.map((hist, idx) => {
              const etapaInfo = etapas.find(e => e.id === hist.etapa);
              return (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-full ${etapaInfo?.cor || "bg-gray-500"} flex items-center justify-center`}>
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{etapaInfo?.label || hist.etapa}</p>
                    <p className="text-sm text-gray-600">{hist.observacao}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(hist.data).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}