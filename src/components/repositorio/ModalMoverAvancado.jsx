import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FolderInput, FolderPlus, ChevronRight, Home, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ModalMoverAvancado({ item, pastas, onMove, onClose, onCreatePasta }) {
  const [pastaDestino, setPastaDestino] = useState(null);
  const [expandedPastas, setExpandedPastas] = useState(new Set());
  const [showCriarPasta, setShowCriarPasta] = useState(false);
  const [moving, setMoving] = useState(false);

  const toggleExpand = (pastaId) => {
    const next = new Set(expandedPastas);
    if (next.has(pastaId)) {
      next.delete(pastaId);
    } else {
      next.add(pastaId);
    }
    setExpandedPastas(next);
  };

  const renderPastaTree = (pastaId, level = 0) => {
    const filhas = pastas.filter(p => p.pasta_pai_id === pastaId);
    
    return filhas.map(pasta => {
      const isExpanded = expandedPastas.has(pasta.id);
      const hasFilhas = pastas.some(p => p.pasta_pai_id === pasta.id);
      const isSelected = pastaDestino === pasta.id;
      
      return (
        <div key={pasta.id}>
          <button
            type="button"
            onClick={() => setPastaDestino(pasta.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-all text-left ${
              isSelected ? 'bg-purple-100 border-2 border-purple-500' : 'hover:bg-gray-100'
            }`}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {hasFilhas && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(pasta.id);
                }}
                className="p-0.5 hover:bg-gray-200 rounded cursor-pointer inline-flex"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </span>
            )}
            {!hasFilhas && <span className="w-4 inline-block" />}
            <FolderInput className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{pasta.nome}</span>
          </button>
          {isExpanded && renderPastaTree(pasta.id, level + 1)}
        </div>
      );
    });
  };

  const handleMover = async () => {
    if (moving) return;
    setMoving(true);
    try {
      await onMove(pastaDestino);
      onClose();
    } catch (error) {
      toast.error(`Erro ao mover: ${error.message}`);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Mover para...</h3>
          <p className="text-sm text-gray-600 mt-1">{item.titulo || item.nome}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Raiz */}
          <button
            type="button"
            onClick={() => setPastaDestino(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-all text-left ${
              pastaDestino === null ? 'bg-purple-100 border-2 border-purple-500' : 'hover:bg-gray-100'
            }`}
          >
            <Home className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Raiz</span>
          </button>

          {/* Árvore de Pastas */}
          {renderPastaTree(null, 0)}

          {/* Criar Nova Pasta Inline */}
          {showCriarPasta ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const nome = new FormData(e.target).get('nome');
              await onCreatePasta({ nome, pasta_pai_id: pastaDestino });
              setShowCriarPasta(false);
            }} className="mt-3 p-3 bg-gray-50 rounded-lg">
              <Input name="nome" placeholder="Nome da nova pasta" autoFocus className="mb-2" />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">Criar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowCriarPasta(false)}>Cancelar</Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCriarPasta(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded transition-all text-sm"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Criar nova pasta aqui</span>
            </button>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleMover} disabled={moving} className="flex-1">
            {moving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Mover
          </Button>
        </div>
      </div>
    </div>
  );
}