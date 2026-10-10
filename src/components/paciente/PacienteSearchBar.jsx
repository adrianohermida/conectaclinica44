import React from "react";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PacienteSearchBar({ busca, setBusca, filtro, setFiltro }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ height: '80px', contain: 'layout' }}>
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input 
            value={busca} 
            onChange={e => setBusca(e.target.value)} 
            placeholder="Buscar pacientes..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border bg-gray-50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500" 
            style={{ willChange: 'contents', transition: 'border-color 0.15s ease' }}
            aria-label="Buscar pacientes"
            autoComplete="off"
            type="search"
          />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-40" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ zIndex: 999999 }}>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="baixado">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}