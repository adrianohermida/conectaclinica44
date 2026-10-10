import React from "react";
import { Calendar, FileText, Activity, Pill, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TimelinePaciente({ eventos }) {
  const getIcone = (tipo) => {
    switch (tipo) {
      case "consulta": return <Calendar className="w-4 h-4" />;
      case "prontuario": return <FileText className="w-4 h-4" />;
      case "plano": return <Activity className="w-4 h-4" />;
      case "prescricao": return <Pill className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCor = (tipo) => {
    switch (tipo) {
      case "consulta": return "bg-blue-100 text-blue-600";
      case "prontuario": return "bg-purple-100 text-purple-600";
      case "plano": return "bg-green-100 text-green-600";
      case "prescricao": return "bg-orange-100 text-orange-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-3">
      {eventos.map((evento, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${getCor(evento.tipo)} flex items-center justify-center flex-shrink-0`}>
              {getIcone(evento.tipo)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-bold text-gray-800">{evento.titulo}</h4>
                {evento.status && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    evento.status === "concluido" ? "bg-green-100 text-green-700" :
                    evento.status === "em_andamento" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {evento.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{evento.descricao}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(evento.data), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {evento.profissional && (
                  <span>{evento.profissional}</span>
                )}
              </div>
            </div>
            {evento.onVer && (
              <button
                onClick={evento.onVer}
                className="text-blue-600 hover:text-blue-700 p-2"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}