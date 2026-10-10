import React from "react";
import { Monitor, Smartphone } from "lucide-react";

export default function PreviewDocumento({ blocos, tipoDocumento }) {
  const [viewMode, setViewMode] = React.useState("desktop");

  const getTitulo = () => {
    switch(tipoDocumento) {
      case 'termos_uso': return 'Termos de Uso';
      case 'politica_privacidade': return 'Política de Privacidade';
      case 'lgpd': return 'Compliance LGPD';
      default: return 'Documento';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-bold text-gray-700">Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("desktop")}
            className={`p-2 rounded-lg ${viewMode === "desktop" ? "bg-[#7E57FF] text-white" : "bg-white text-gray-600"}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={`p-2 rounded-lg ${viewMode === "mobile" ? "bg-[#7E57FF] text-white" : "bg-white text-gray-600"}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div
          className={`mx-auto bg-white rounded-xl shadow-md p-8 ${
            viewMode === "mobile" ? "max-w-[375px]" : "max-w-4xl"
          }`}
        >
          <h1 className="text-3xl font-bold text-[#081828] mb-6">{getTitulo()}</h1>
          
          {blocos.filter(b => b.visivel).sort((a, b) => a.ordem - b.ordem).map(bloco => (
            <div key={bloco.id} className="mb-6">
              <h2 className="text-xl font-bold text-[#202124] mb-3">{bloco.titulo}</h2>
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: bloco.conteudo_html }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}