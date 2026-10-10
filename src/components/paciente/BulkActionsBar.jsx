import React from "react";
import { X, GitMerge, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  onMesclar, 
  onArquivar, 
  onExcluir 
}) {
  return (
    <div 
      className="pc-card p-4 flex items-center justify-between gap-4" 
      style={{ backgroundColor: '#f5f3ff', borderColor: '#7E57FF' }}
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold" style={{ color: '#7E57FF' }}>
          {selectedCount} selecionado(s)
        </span>
        <button
          onClick={onClear}
          className="p-1 hover:bg-white rounded-full transition-all"
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label="Limpar seleção"
        >
          <X className="w-4 h-4" style={{ color: '#7E57FF' }} />
        </button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onMesclar}
          aria-label="Mesclar pacientes selecionados"
          style={{ minHeight: '44px' }}
        >
          <GitMerge className="w-4 h-4 mr-1" />
          Mesclar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onArquivar}
          aria-label={`Arquivar ${selectedCount} paciente(s) selecionado(s)`}
          style={{ minHeight: '44px' }}
        >
          <Archive className="w-4 h-4 mr-1" />
          Arquivar
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onExcluir}
          aria-label={`Excluir ${selectedCount} paciente(s) selecionado(s)`}
          style={{ minHeight: '44px' }}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Excluir
        </Button>
      </div>
    </div>
  );
}