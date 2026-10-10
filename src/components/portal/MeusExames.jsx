import React, { useState } from "react";
import { FileImage, Download, Eye, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MeusExames({ documentos }) {
  const [visualizando, setVisualizando] = useState(null);

  const exames = documentos.filter(d => 
    ["exame_sangue", "exame_imagem", "raio_x", "tomografia", "ressonancia", "ultrassom"].includes(d.tipo_documento)
  );

  if (exames.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
        <FileImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum exame disponível</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {exames.map((exame) => (
          <div key={exame.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <FileImage className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 mb-2">{exame.nome_arquivo}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(exame.data_upload), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {exame.descricao && (
                      <p className="text-sm text-gray-700 mt-2">{exame.descricao}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisualizando(exame)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </button>
                <a
                  href={exame.arquivo_url}
                  download
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visualizando && (
        <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-800 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold">{visualizando.nome_arquivo}</h3>
              <button
                onClick={() => setVisualizando(null)}
                className="text-white hover:bg-white/20 p-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[80vh]">
              {visualizando.extensao === "pdf" ? (
                <iframe
                  src={visualizando.arquivo_url}
                  className="w-full h-[70vh] border border-gray-200 rounded"
                  title={visualizando.nome_arquivo}
                />
              ) : (
                <img
                  src={visualizando.arquivo_url}
                  alt={visualizando.nome_arquivo}
                  className="w-full h-auto rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}