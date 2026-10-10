import React, { useState, useEffect } from "react";
import { Users, Clock, Bell, Play, Video, MessageCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SalaEsperaVirtual({ pacientes, onIniciarConsulta, onNotificar }) {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setAgora(new Date());
    }, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const calcularTempoEspera = (agendamento) => {
    const horaAgendada = new Date(`${agendamento.data} ${agendamento.horario}`);
    const minutos = differenceInMinutes(agora, horaAgendada);
    
    if (minutos < 0) return "Aguardando horário";
    if (minutos === 0) return "Hora exata";
    if (minutos < 60) return `${minutos} min aguardando`;
    return `${Math.floor(minutos / 60)}h ${minutos % 60}min aguardando`;
  };

  const getCorEspera = (agendamento) => {
    const horaAgendada = new Date(`${agendamento.data} ${agendamento.horario}`);
    const minutos = differenceInMinutes(agora, horaAgendada);
    
    if (minutos < 0) return "bg-blue-50 border-blue-200";
    if (minutos < 10) return "bg-green-50 border-green-200";
    if (minutos < 20) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  if (pacientes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum paciente na sala de espera</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-bold text-green-900">
                Sala de Espera Virtual
              </h3>
              <p className="text-sm text-green-700">
                {pacientes.length} paciente{pacientes.length > 1 ? 's' : ''} aguardando
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
            Tempo real
          </div>
        </div>
      </div>

      {/* Lista de Pacientes */}
      <div className="grid gap-3">
        {pacientes
          .sort((a, b) => {
            const horaA = new Date(`${a.data} ${a.horario}`);
            const horaB = new Date(`${b.data} ${b.horario}`);
            return horaA - horaB;
          })
          .map((paciente, index) => {
            const tempoEspera = calcularTempoEspera(paciente);
            const corCard = getCorEspera(paciente);
            
            return (
              <div
                key={paciente.id}
                className={`rounded-lg p-4 border-2 ${corCard} transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info do Paciente */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-[#0B7A9E] flex items-center justify-center text-white font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 text-lg">{paciente.paciente_nome}</h4>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {paciente.horario}
                        </span>
                        <span className="capitalize">
                          {paciente.especialidade?.replace(/_/g, " ")}
                        </span>
                        {paciente.medico && (
                          <span>Dr(a). {paciente.medico}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          tempoEspera === "Hora exata" ? "bg-green-100 text-green-700" :
                          tempoEspera === "Aguardando horário" ? "bg-blue-100 text-blue-700" :
                          tempoEspera.includes("h") ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          <Clock className="w-3 h-3" />
                          {tempoEspera}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onIniciarConsulta(paciente)}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar
                    </button>
                    <button
                      onClick={() => onNotificar(paciente)}
                      className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Bell className="w-4 h-4" />
                      Notificar
                    </button>
                    {paciente.link_telemedicina && (
                      <a
                        href={`${paciente.link_telemedicina}?chat=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </a>
                    )}
                  </div>
                </div>

                {/* Observações */}
                {paciente.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Obs:</span> {paciente.observacoes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-xl font-bold text-gray-800">{pacientes.length}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600">No horário</p>
          <p className="text-xl font-bold text-green-600">
            {pacientes.filter(p => {
              const horaAgendada = new Date(`${p.data} ${p.horario}`);
              const minutos = differenceInMinutes(agora, horaAgendada);
              return minutos >= 0 && minutos < 10;
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600">Atrasados</p>
          <p className="text-xl font-bold text-yellow-600">
            {pacientes.filter(p => {
              const horaAgendada = new Date(`${p.data} ${p.horario}`);
              const minutos = differenceInMinutes(agora, horaAgendada);
              return minutos >= 10;
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-600">Aguardando</p>
          <p className="text-xl font-bold text-blue-600">
            {pacientes.filter(p => {
              const horaAgendada = new Date(`${p.data} ${p.horario}`);
              const minutos = differenceInMinutes(agora, horaAgendada);
              return minutos < 0;
            }).length}
          </p>
        </div>
      </div>
    </div>
  );
}