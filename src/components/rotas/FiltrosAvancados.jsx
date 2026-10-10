import React from "react";
import { Filter } from "lucide-react";

export default function FiltrosAvancados({ filters, onFilterChange }) {
  return (
    <div className="pc-card p-4 flex items-center gap-4">
      <Filter className="w-5 h-5 text-gray-600" />
      
      <select
        value={filters.type}
        onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
        className="px-3 py-2 border rounded-lg text-sm"
      >
        <option value="all">Todos os tipos</option>
        <option value="public">Público</option>
        <option value="auth">Autenticado</option>
        <option value="admin">Admin</option>
        <option value="superadmin">SuperAdmin</option>
      </select>

      <select
        value={filters.module}
        onChange={(e) => onFilterChange({ ...filters, module: e.target.value })}
        className="px-3 py-2 border rounded-lg text-sm"
      >
        <option value="all">Todos os módulos</option>
        <option value="dashboard">Dashboard</option>
        <option value="agenda">Agenda</option>
        <option value="pacientes">Pacientes</option>
        <option value="prontuarios">Prontuários</option>
        <option value="produtos">Produtos</option>
        <option value="atendimento">Atendimento</option>
        <option value="superadmin">SuperAdmin</option>
      </select>

      <select
        value={filters.performance}
        onChange={(e) => onFilterChange({ ...filters, performance: e.target.value })}
        className="px-3 py-2 border rounded-lg text-sm"
      >
        <option value="all">Performance</option>
        <option value="slow">Lento (&lt;70)</option>
        <option value="medium">Médio (70-85)</option>
        <option value="fast">Rápido (&gt;85)</option>
      </select>

      <button
        onClick={() => onFilterChange({ type: 'all', module: 'all', performance: 'all' })}
        className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
      >
        Limpar
      </button>
    </div>
  );
}