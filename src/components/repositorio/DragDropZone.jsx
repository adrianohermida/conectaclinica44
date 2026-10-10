import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Folder, FileText, GripVertical } from "lucide-react";

export default function DragDropZone({ items, onReorder, onMove, renderItem }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Mover entre pastas
    if (source.droppableId !== destination.droppableId) {
      const item = items.find(i => i.id === draggableId);
      onMove(item, destination.droppableId === 'root' ? null : destination.droppableId);
      return;
    }

    // Reordenar
    if (source.index !== destination.index) {
      onReorder(source.index, destination.index);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="items">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1 ${snapshot.isDraggingOver ? 'bg-purple-50' : ''}`}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>
                      {renderItem(item)}
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}