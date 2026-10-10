import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, ChevronRight, ChevronDown, Eye, EyeOff, Edit2, Trash2 } from "lucide-react";
import { Menu } from "lucide-react";
import {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2, Folder
} from "lucide-react";

const iconMap = {
  LayoutDashboard, Calendar, Users, FileText, Video, Package,
  DollarSign, ShoppingCart, MessageSquare, Settings, Shield,
  Activity, BarChart3, Inbox, Mail, Zap, Globe, Building2, Folder, Menu
};

export default function MenuItem({ item, index, onEdit, onDelete, expandidos, toggleExpandir }) {
  const IconComponent = iconMap[item.icone_lucide] || iconMap.Menu;
  const isExpanded = expandidos[item.id];

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="border rounded-lg bg-white">
          <div className="flex items-center gap-3 p-4">
            <div {...provided.dragHandleProps}>
              <GripVertical className="w-5 h-5 text-gray-400" />
            </div>

            {item.tipo_item === 'pasta' && item.filhos?.length > 0 && (
              <button onClick={() => toggleExpandir(item.id)}>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}

            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.cor}15` }}>
              <IconComponent className="w-5 h-5" style={{ color: item.cor }} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{item.titulo}</h4>
                {item.beta && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Beta</span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {item.tipo_item === 'pasta' ? 'Pasta' : 
                 item.tipo_item === 'pagina' ? `Página: ${item.rota_pagina}` : 
                 `Link: ${item.url_externa}`}
                {item.modulo_slug && ` • Módulo: ${item.modulo_slug}`}
              </p>
            </div>

            {item.visivel ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}

            <button onClick={() => onEdit(item)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Edit2 className="w-4 h-4" />
            </button>

            <button onClick={() => { if (confirm('Deletar?')) onDelete(item.id); }} className="p-2 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>

          {isExpanded && item.filhos?.length > 0 && (
            <div className="ml-12 mr-4 mb-4 border-l-2 pl-4 space-y-2">
              {item.filhos.map((filho, idx) => (
                <MenuItem key={filho.id} item={filho} index={idx} onEdit={onEdit} onDelete={onDelete} expandidos={expandidos} toggleExpandir={toggleExpandir} />
              ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}