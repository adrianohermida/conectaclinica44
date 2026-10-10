import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Edit, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import RichTextEditor from "./RichTextEditor";

export default function EditorBlocos({ blocos = [], onChange }) {
  const [expandidos, setExpandidos] = useState(new Set(blocos.map(b => b.id)));
  const [editando, setEditando] = useState(null);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(blocos);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    const reordenados = items.map((item, idx) => ({ ...item, ordem: idx }));
    onChange(reordenados);
  };

  const toggleExpand = (id) => {
    const novo = new Set(expandidos);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    setExpandidos(novo);
  };

  const adicionarBloco = () => {
    const novoBloco = {
      id: `bloco_${Date.now()}`,
      ordem: blocos.length,
      tipo: "secao",
      titulo: "Nova Seção",
      conteudo_html: "<p>Conteúdo da seção...</p>",
      expansivel: true,
      visivel: true
    };
    onChange([...blocos, novoBloco]);
    setExpandidos(new Set([...expandidos, novoBloco.id]));
  };

  const removerBloco = (id) => {
    if (confirm("Remover este bloco?")) {
      onChange(blocos.filter(b => b.id !== id));
    }
  };

  const atualizarBloco = (id, campo, valor) => {
    onChange(blocos.map(b => b.id === id ? { ...b, [campo]: valor } : b));
  };

  return (
    <div className="space-y-3">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocos">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {blocos.map((bloco, index) => (
                <Draggable key={bloco.id} draggableId={bloco.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50">
                        <div {...provided.dragHandleProps} className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        <button
                          onClick={() => toggleExpand(bloco.id)}
                          className="flex-shrink-0"
                        >
                          {expandidos.has(bloco.id) ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </button>

                        {editando === bloco.id ? (
                          <input
                            type="text"
                            value={bloco.titulo}
                            onChange={(e) => atualizarBloco(bloco.id, 'titulo', e.target.value)}
                            onBlur={() => setEditando(null)}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-[#7E57FF] rounded font-bold text-[#202124] outline-none"
                          />
                        ) : (
                          <h3
                            onClick={() => setEditando(bloco.id)}
                            className="flex-1 font-bold text-[#202124] cursor-pointer hover:text-[#7E57FF]"
                          >
                            {bloco.titulo}
                          </h3>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditando(bloco.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerBloco(bloco.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Content */}
                      {expandidos.has(bloco.id) && (
                        <div className="p-4">
                          <RichTextEditor
                            value={bloco.conteudo_html}
                            onChange={(val) => atualizarBloco(bloco.id, 'conteudo_html', val)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button
        onClick={adicionarBloco}
        className="w-full bg-[#7E57FF] hover:bg-[#6d28d9] text-white"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Bloco
      </Button>
    </div>
  );
}