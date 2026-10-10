import React, { useState } from "react";
import { ChevronRight, FileText, Magnet, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DockerView({ conexao, documentos, onDesconectar }) {
  const [expanded, setExpanded] = useState(true);

  // Ordenar documentos pela ordem da conexão
  const docsOrdenados = (conexao.documentos_ordenados || [])
    .map(docOrdem => {
      const doc = documentos.find(d => d.id === docOrdem.documento_id);
      return doc ? { ...doc, ordem: docOrdem.ordem } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="border-2 border-blue-400 rounded-lg p-3 bg-blue-50/50 mb-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 flex-1"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <Magnet className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-blue-900">{conexao.titulo}</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            {docsOrdenados.length} documentos
          </span>
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm(`Desmontar Docker "${conexao.titulo}"?`)) {
              onDesconectar(conexao.id);
            }
          }}
          className="text-red-600 hover:text-red-700"
        >
          <Unlink className="w-3 h-3 mr-1" />
          Desmontar
        </Button>
      </div>

      {expanded && (
        <div className="ml-6 space-y-1 mt-2">
          {docsOrdenados.map((doc, idx) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.titulo}</p>
                <p className="text-xs text-gray-500">
                  {doc.tipo_arquivo?.toUpperCase()} • {(doc.tamanho_bytes / 1024).toFixed(0)} KB
                </p>
              </div>
              {doc.indexado && (
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">IA ✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}