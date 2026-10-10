import React from "react";
import { Calendar, Clock, MapPin, Video, User } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProximasConsultas({ agendamentos }) {
  const proximas = agendamentos
    .filter(a => {
      const dataHora = new Date(`${a.data} ${a.horario || "00:00"}`);
      return isFuture(dataHora) && a.status !== "cancelado";
    })
    .slice(0, 5);

  if (proximas.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhuma consulta agendada</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {proximas.map((agend) => (
        <div key={agend.id} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              agend.tipo_consulta === "telemedicina" ? "bg-purple-100" : "bg-blue-100"
            }`}>
              {agend.tipo_consulta === "telemedicina" ? (
                <Video className="w-6 h-6 text-purple-600" />
              ) : (
                <Calendar className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-2">
                {agend.especialidade || "Consulta"} - {agend.tipo_consulta === "telemedicina" ? "Online" : "Presencial"}
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(agend.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {agend.horario}
                </p>
                {agend.medico && (
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dr(a). {agend.medico}
                  </p>
                )}
                {agend.tipo_consulta === "presencial" && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    PrevenClin - Ponta Negra, Manaus/AM
                  </p>
                )}
              </div>
              {agend.tipo_consulta === "telemedicina" && agend.link_telemedicina && (
                <a
                  href={agend.link_telemedicina}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Entrar na Consulta
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}