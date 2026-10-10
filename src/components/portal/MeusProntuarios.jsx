import React from "react";
import { FileText, Download, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MeusProntuarios({ prontuarios, onVerDetalhes }) {
  if (prontuarios.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum prontuário disponível</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {prontuarios.map((prontuario) => (
        <div key={prontuario.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-2">
                  {prontuario.tipo_atendimento === "consulta" ? "Consulta Médica" : 
                   prontuario.tipo_atendimento === "retorno" ? "Consulta de Retorno" :
                   prontuario.tipo_atendimento}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(prontuario.data_atendimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Dr(a). {prontuario.medico_nome}
                  </p>
                  {prontuario.hipotese_diagnostica && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Diagnóstico:</p>
                      <p className="text-sm text-gray-800 font-medium">{prontuario.hipotese_diagnostica}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onVerDetalhes(prontuario)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <Eye className="w-4 h-4" />
                Ver
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}