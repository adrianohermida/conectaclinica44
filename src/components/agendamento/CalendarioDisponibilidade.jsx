import React, { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User } from "lucide-react";

export default function CalendarioDisponibilidade({ 
  agendamentos = [], 
  medicoSelecionado,
  onSelectHorario 
}) {
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  const horariosDisponiveis = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  const agendamentosDoDia = useMemo(() => {
    return agendamentos.filter(ag => {
      const agData = new Date(ag.data);
      return isSameDay(agData, dataSelecionada) && 
             (!medicoSelecionado || ag.medico === medicoSelecionado);
    });
  }, [agendamentos, dataSelecionada, medicoSelecionado]);

  const horariosOcupados = agendamentosDoDia.map(ag => ag.horario);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 md:gap-8">
        <div className="overflow-hidden">
          <h3 className="font-bold mb-6 text-xl" style={{ color: '#202124' }}>Selecione a Data</h3>
          <div className="overflow-x-auto">
            <Calendar
              mode="single"
              selected={dataSelecionada}
              onSelect={setDataSelecionada}
              locale={ptBR}
              className="rounded-xl border w-full [&_button]:min-h-[48px] [&_button]:text-base [&_td]:p-1"
              style={{ fontSize: '16px' }}
              disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <h3 className="font-bold mb-6 text-xl" style={{ color: '#202124' }}>
            Horários - {format(dataSelecionada, "dd/MM/yyyy")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pc-scrollbar pr-1">
            {horariosDisponiveis.map(horario => {
              const ocupado = horariosOcupados.includes(horario);
              const agendamento = agendamentosDoDia.find(ag => ag.horario === horario);
              
              return (
                <button
                  key={horario}
                  onClick={() => !ocupado && onSelectHorario(dataSelecionada, horario)}
                  disabled={ocupado}
                  className={`p-4 rounded-xl border transition-all min-h-[68px] text-base font-medium ${
                    ocupado 
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" 
                      : "bg-white border-gray-200 hover:border-[#7E57FF] hover:bg-[#f5f3ff] hover:text-[#7E57FF] cursor-pointer hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <span className="font-bold text-lg">{horario}</span>
                  </div>
                  {ocupado && agendamento && (
                    <p className="text-xs mt-2 truncate flex items-center gap-1 justify-center" style={{ color: '#5f6368' }}>
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate font-medium">{agendamento.paciente_nome}</span>
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}