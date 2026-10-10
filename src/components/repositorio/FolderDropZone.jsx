import React, { useState } from "react";
import { FolderInput, Upload } from "lucide-react";

/**
 * FolderDropZone - Zona de drop para drag-and-drop de arquivos em pastas
 * Design: ConectaClínica (purple #7E57FF)
 */
export default function FolderDropZone({ pasta, onDrop, className = "" }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Extrair IDs dos itens arrastados
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.ids && data.ids.length > 0) {
        onDrop(pasta.id, data.ids);
      }
    } catch (error) {
      console.error('[FolderDropZone] Erro ao processar drop:', error);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative
        ${className}
        ${isDragOver ? 'ring-4 ring-purple-400 ring-offset-2 bg-purple-50' : ''}
      `}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 bg-purple-100/90 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Upload className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-bold text-purple-700">
              Mover para {pasta.nome}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}