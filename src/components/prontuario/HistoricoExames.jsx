import React, { useState } from "react";
import { FileImage, Eye, Download, Calendar, X, ZoomIn } from "lucide-react";
import { format } from "date-fns";

export default function HistoricoExames({ documentos }) {
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const examesImagem = documentos.filter(d => 
    d.tipo_documento === "raio_x" || 
    d.tipo_documento === "tomografia" || 
    d.tipo_documento === "ressonancia" ||
    d.tipo_documento === "ultrassom" ||
    d.tipo_documento === "exame_imagem"
  );

  const getTipoExame = (tipo) => {
    const tipos = {
      raio_x: "Raio-X",
      tomografia: "Tomografia",
      ressonancia: "Ressonância Magnética",
      ultrassom: "Ultrassom",
      exame_imagem: "Exame de Imagem"
    };
    return tipos[tipo] || tipo;
  };

  if (examesImagem.length === 0) {
    return (
      <div className="text-center py-8">
        <FileImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum exame de imagem registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-2">
          <FileImage className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-indigo-900">Histórico de Exames de Imagem</h3>
        </div>
        <p className="text-sm text-indigo-800">
          {examesImagem.length} exame(s) de imagem registrado(s)
        </p>
      </div>

      <div className="grid gap-3">
        {examesImagem.map((exame) => (
          <div key={exame.id} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative group cursor-pointer"
                onClick={() => setImagemAmpliada(exame)}
              >
                {exame.arquivo_url?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <>
                    <img 
                      src={exame.arquivo_url} 
                      alt={exame.nome_arquivo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800">{getTipoExame(exame.tipo_documento)}</h4>
                <p className="text-sm text-gray-600 mt-1">{exame.descricao || exame.nome_arquivo}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(exame.data_documento || exame.data_upload), "dd/MM/yyyy")}
                  </span>
                  {exame.medico_solicitante && (
                    <span>Dr(a). {exame.medico_solicitante}</span>
                  )}
                  {exame.analisado_ia && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      ✨ Analisado por IA
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setImagemAmpliada(exame)}
                  className="p-2 bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
                  title="Visualizar"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={exame.arquivo_url}
                  download
                  className="p-2 bg-green-50 hover:bg-green-100 rounded text-green-700"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Visualização */}
      {imagemAmpliada && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <div className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#0B7A9E]">
              <h3 className="font-bold text-white">{getTipoExame(imagemAmpliada.tipo_documento)}</h3>
              <button
                onClick={() => setImagemAmpliada(null)}
                className="p-2 hover:bg-white/10 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-auto">
              {imagemAmpliada.arquivo_url?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <img 
                  src={imagemAmpliada.arquivo_url} 
                  alt={imagemAmpliada.nome_arquivo}
                  className="w-full h-auto rounded-lg"
                />
              ) : imagemAmpliada.arquivo_url?.match(/\.pdf$/i) ? (
                <iframe
                  src={imagemAmpliada.arquivo_url}
                  className="w-full h-[600px] rounded-lg"
                  title="PDF Viewer"
                />
              ) : (
                <div className="text-center py-12">
                  <FileImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Visualização não disponível para este formato</p>
                  <a
                    href={imagemAmpliada.arquivo_url}
                    download
                    className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Fazer Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}