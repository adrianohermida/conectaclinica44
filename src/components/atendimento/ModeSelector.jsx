import React from "react";
import { LayoutGrid, List } from "lucide-react";

export default function ModeSelector({ modo, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--pc-bg-tertiary)', border: '1px solid var(--pc-border-primary)' }}>
      <button
        onClick={() => onChange('helpdesk')}
        className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${modo === 'helpdesk' ? 'shadow-sm' : ''}`}
        style={modo === 'helpdesk' ? { backgroundColor: 'white', color: '#7E57FF', minWidth: '44px', minHeight: '44px' } : { color: '#5f6368', minWidth: '44px', minHeight: '44px' }}
        title="Modo Helpdesk"
        aria-label="Modo Helpdesk"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-xs font-semibold hidden sm:inline">Helpdesk</span>
      </button>
      <button
        onClick={() => onChange('inbox')}
        className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${modo === 'inbox' ? 'shadow-sm' : ''}`}
        style={modo === 'inbox' ? { backgroundColor: 'white', color: '#7E57FF', minWidth: '44px', minHeight: '44px' } : { color: '#5f6368', minWidth: '44px', minHeight: '44px' }}
        title="Modo Inbox (estilo Gmail)"
        aria-label="Modo Inbox"
      >
        <List className="w-4 h-4" />
        <span className="text-xs font-semibold hidden sm:inline">Inbox</span>
      </button>
    </div>
  );
}