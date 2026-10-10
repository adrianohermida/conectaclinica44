import React, { useState } from "react";
import { Loader2, Download } from "lucide-react";

export default function LazyLoadImage({ item, onClick }) {
  const [loadFull, setLoadFull] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLarge = (item.tamanho_bytes || 0) > 5 * 1024 * 1024; // >5MB
  const hasThumbnail = !!item.thumbnail_url;

  if (!isLarge || !hasThumbnail) {
    // Carregar direto se pequeno ou sem thumbnail
    return (
      <img
        src={item.arquivo_url}
        alt={item.titulo}
        className="w-full h-full object-cover cursor-pointer"
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  if (!loadFull) {
    return (
      <div className="relative w-full h-full group">
        <img
          src={item.thumbnail_url}
          alt={`${item.titulo} (preview)`}
          className="w-full h-full object-cover blur-[2px]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLoading(true);
              // Pré-carregar imagem full
              const img = new Image();
              img.src = item.arquivo_url;
              img.onload = () => {
                setLoadFull(true);
                setLoading(false);
              };
            }}
            className="bg-white text-gray-900 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 hover:bg-gray-100"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Carregar HD ({(item.tamanho_bytes / 1024 / 1024).toFixed(1)} MB)
          </button>
        </div>
      </div>
    );
  }

  return (
    <img
      src={item.arquivo_url}
      alt={item.titulo}
      className="w-full h-full object-cover cursor-pointer"
      onClick={onClick}
      loading="lazy"
    />
  );
}