import React from "react";
import { Search, RefreshCw } from "lucide-react";

export default function EmailSearchForm({ emailBusca, setEmailBusca, onBuscar, buscando }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="email"
          placeholder="email@exemplo.com"
          value={emailBusca}
          onChange={(e) => setEmailBusca(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onBuscar()}
          className="w-full pl-11 pr-4 py-3 border rounded-xl"
          style={{ borderColor: '#e8eaed' }}
        />
      </div>
      
      <button
        onClick={onBuscar}
        disabled={buscando}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        style={{ backgroundColor: '#7E57FF', color: 'white' }}
      >
        {buscando ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Buscar Entregas
          </>
        )}
      </button>
    </div>
  );
}