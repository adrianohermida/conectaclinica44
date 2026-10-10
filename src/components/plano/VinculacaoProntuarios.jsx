import React, { useMemo } from "react";
import { FileText, Calendar, Stethoscope, LinkIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function VinculacaoProntuarios({ plano, prontuarios }) {
  const prontuariosVinculados = useMemo(() => {
    return prontuarios
      .filter(p => p.paciente_id === plano.paciente_id)
      .sort((a, b) => new Date(b.data_atendimento) - new Date(a.data_atendimento));
  }, [prontuarios, plano.paciente_id]);

  const prontuariosRelacionados = useMemo(() => {
    if (!plano.diagnostico) return prontuariosVinculados;
    
    // Filtrar prontuários com diagnóstico similar
    return prontuariosVinculados.filter(p => 
      p.hipotese_diagnostica?.toLowerCase().includes(plano.diagnostico?.toLowerCase()) ||
      p.queixa_principal?.toLowerCase().includes(plano.diagnostico?.toLowerCase())
    );
  }, [prontuariosVinculados, plano.diagnostico]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-[#0B7A9E]" />
          Prontuários Vinculados
        </h3>
        <p className="text-sm text-gray-600">
          Histórico de consultas relacionadas ao plano de tratamento
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-blue-600">{prontuariosVinculados.length}</p>
          <p className="text-xs text-gray-600 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-purple-600">{prontuariosRelacionados.length}</p>
          <p className="text-xs text-gray-600 mt-1">Relacionados</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-green-600">
            {prontuariosVinculados.filter(p => p.status_prontuario === "assinado").length}
          </p>
          <p className="text-xs text-gray-600 mt-1">Assinados</p>
        </div>
      </div>

      {/* Lista de Prontuários */}
      {prontuariosVinculados.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum prontuário vinculado</p>
          <Link to={createPageUrl("Prontuarios")}>
            <button className="text-sm text-[#0B7A9E] font-medium hover:underline mt-2">
              Criar primeiro prontuário →
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {prontuariosVinculados.map((pront) => {
            const isRelacionado = prontuariosRelacionados.includes(pront);
            
            return (
              <div
                key={pront.id}
                className={`bg-white rounded-lg p-4 border-2 ${
                  isRelacionado ? "border-purple-300 bg-purple-50/30" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    pront.status_prontuario === "assinado" ? "bg-green-100" : "bg-blue-100"
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      pront.status_prontuario === "assinado" ? "text-green-600" : "text-blue-600"
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 text-sm">
                          {pront.tipo_atendimento?.replace("_", " ").toUpperCase() || "Consulta"}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {pront.queixa_principal || pront.motivo_consulta}
                        </p>
                      </div>
                      {isRelacionado && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          Relacionado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(pront.data_atendimento), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Dr(a). {pront.medico_nome}
                      </span>
                    </div>

                    {pront.hipotese_diagnostica && (
                      <div className="mt-2 bg-gray-50 rounded p-2 border border-gray-200">
                        <p className="text-xs text-gray-700">
                          <strong>Diagnóstico:</strong> {pront.hipotese_diagnostica}
                        </p>
                      </div>
                    )}

                    <Link to={createPageUrl("Prontuarios")}>
                      <button className="mt-3 text-xs text-[#0B7A9E] font-medium hover:underline flex items-center gap-1">
                        Ver prontuário completo
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}