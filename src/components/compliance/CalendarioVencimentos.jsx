import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalendarioVencimentos({ certidoes = [], onSelectDate }) {
  const [mesAtual, setMesAtual] = useState(new Date());
  const hoje = new Date();

  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual);
    const fim = endOfMonth(mesAtual);
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const primeiroDiaSemana = startOfMonth(mesAtual).getDay();

  const certidoesPorDia = useMemo(() => {
    const mapa = {};
    certidoes.forEach(cert => {
      if (cert.data_validade) {
        const dataKey = format(new Date(cert.data_validade), "yyyy-MM-dd");
        if (!mapa[dataKey]) mapa[dataKey] = [];
        mapa[dataKey].push(cert);
      }
    });
    return mapa;
  }, [certidoes]);

  const getStatusDia = (dia) => {
    const dataKey = format(dia, "yyyy-MM-dd");
    const certs = certidoesPorDia[dataKey] || [];
    if (certs.length === 0) return null;
    
    const diasRestantes = differenceInDays(dia, hoje);
    if (diasRestantes < 0) return "vencida";
    if (diasRestantes <= 7) return "urgente";
    if (diasRestantes <= 30) return "alerta";
    return "ok";
  };

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMesAtual(subMonths(mesAtual, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-bold text-gray-800 capitalize">
          {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button
          onClick={() => setMesAtual(addMonths(mesAtual, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-xs font-medium text-gray-500 py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-1">
        {/* Espaços vazios antes do primeiro dia */}
        {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {diasDoMes.map(dia => {
          const dataKey = format(dia, "yyyy-MM-dd");
          const certs = certidoesPorDia[dataKey] || [];
          const status = getStatusDia(dia);
          const isHoje = isSameDay(dia, hoje);

          return (
            <button
              key={dataKey}
              onClick={() => certs.length > 0 && onSelectDate && onSelectDate(dia, certs)}
              className={`h-10 rounded-lg text-sm relative flex items-center justify-center transition-colors ${
                isHoje ? "ring-2 ring-[#0B7A9E]" : ""
              } ${
                certs.length > 0 ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
              } ${
                status === "vencida" ? "bg-red-100 text-red-800 font-bold" :
                status === "urgente" ? "bg-orange-100 text-orange-800 font-bold" :
                status === "alerta" ? "bg-yellow-100 text-yellow-800" :
                status === "ok" ? "bg-green-100 text-green-800" :
                "text-gray-700"
              }`}
            >
              {format(dia, "d")}
              {certs.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center ${
                  status === "vencida" ? "bg-red-600 text-white" :
                  status === "urgente" ? "bg-orange-600 text-white" :
                  status === "alerta" ? "bg-yellow-600 text-white" :
                  "bg-green-600 text-white"
                }`}>
                  {certs.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600">Vencida</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-gray-600">Urgente (7d)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-gray-600">Alerta (30d)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600">OK</span>
        </div>
      </div>
    </div>
  );
}