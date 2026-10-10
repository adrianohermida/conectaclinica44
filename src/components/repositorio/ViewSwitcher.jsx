import React from "react";
import { List, Grid, LayoutGrid, FileText, Image as ImageIcon } from "lucide-react";

const VIEWS = [
  { id: 'lista', label: 'Lista', icon: List },
  { id: 'detalhes', label: 'Detalhes', icon: FileText },
  { id: 'blocos', label: 'Blocos', icon: LayoutGrid },
  { id: 'icones-grandes', label: 'Ícones grandes', icon: Grid },
  { id: 'icones-medios', label: 'Ícones médios', icon: Grid },
  { id: 'icones-pequenos', label: 'Ícones pequenos', icon: Grid }
];

export default function ViewSwitcher({ currentView, onViewChange }) {
  return (
    <div className="flex items-center gap-1">
      {VIEWS.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${
            currentView === view.id ? 'bg-purple-50 text-purple-700' : 'text-gray-600'
          }`}
          title={view.label}
        >
          <view.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}