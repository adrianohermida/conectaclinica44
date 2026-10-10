import React from "react";
import { Archive, Trash2 } from "lucide-react";

export default function BulkActionsBar({ 
  selecionadosCount, 
  onArquivar, 
  onExcluir 
}) {
  if (selecionadosCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
      <span className="text-sm font-semibold" style={{ color: '#6d28d9' }}>{selecionadosCount} selecionados</span>
      <button
        onClick={onArquivar}
        className="p-2 hover:bg-purple-100 rounded-lg transition-all"
        style={{ minWidth: '44px', minHeight: '44px' }}
        title="Arquivar selecionados"
        aria-label="Arquivar selecionados"
      >
        <Archive className="w-4 h-4" style={{ color: '#6d28d9' }} />
      </button>
      <button
        onClick={() => {
          if (confirm(`Excluir ${selecionadosCount} ticket(s)?`)) {
            onExcluir();
          }
        }}
        className="p-2 hover:bg-red-100 rounded-lg transition-all"
        style={{ minWidth: '44px', minHeight: '44px' }}
        title="Excluir selecionados"
        aria-label="Excluir selecionados"
      >
        <Trash2 className="w-4 h-4" style={{ color: '#ea4335' }} />
      </button>
    </div>
  );
}