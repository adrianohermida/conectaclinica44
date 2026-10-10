import React from "react";
import { Paperclip, X as XIcon } from "lucide-react";

export default function AnexosList({ anexos, onRemove }) {
  if (anexos.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {anexos.map((anexo, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Paperclip className="w-4 h-4 flex-shrink-0" style={{ color: '#7E57FF' }} />
            <span className="text-sm truncate" style={{ color: '#202124' }}>{anexo.nome}</span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
          >
            <XIcon className="w-4 h-4" style={{ color: '#ea4335' }} />
          </button>
        </div>
      ))}
    </div>
  );
}