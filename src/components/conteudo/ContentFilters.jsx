import React from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * FILTROS GENÉRICOS - Busca + Categoria + Tags
 */
export default function ContentFilters({ 
  busca, 
  onBuscaChange, 
  categoria, 
  onCategoriaChange, 
  categorias = [],
  placeholder = "Pesquisar..."
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 rounded-xl min-h-[48px]"
        />
      </div>
      
      {categorias.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-600 mb-2">CATEGORIA</p>
          {categorias.map(cat => (
            <button
              key={cat.value}
              onClick={() => onCategoriaChange(cat.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                categoria === cat.value ? 'bg-purple-50 font-bold text-[#7E57FF]' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}