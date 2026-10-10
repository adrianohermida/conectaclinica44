import React, { useState } from "react";
import { Loader2, FileText, Download } from "lucide-react";

export default function LazyLoadPDF({ item, onLoad }) {
  const [loadFull, setLoadFull] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLarge = (item.tamanho_bytes || 0) > 5 * 1024 * 1024; // >5MB

  if (!isLarge) {
    // Carregar direto se pequeno
    return (
      <iframe
        src={item.arquivo_url}
        className="w-full h-full border-0"
        title={item.titulo}
      />
    );
  }

  if (!loadFull) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
        <FileText className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-sm font-medium text-gray-700 mb-2">{item.titulo}</p>
        <p className="text-xs text-gray-500 mb-4">
          PDF grande ({(item.tamanho_bytes / 1024 / 1024).toFixed(1)} MB)
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setLoadFull(true);
            setTimeout(() => {
              setLoading(false);
              onLoad?.();
            }, 500);
          }}
          disabled={loading}
          className="bg-[#7E57FF] text-white px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Carregar PDF
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <iframe
      src={item.arquivo_url}
      className="w-full h-full border-0"
      title={item.titulo}
    />
  );
}