import React from "react";
import { Search } from "lucide-react";

/**
 * BUSCA UNIFICADA - Todos módulos de conteúdo
 */
export default function ContentSearchBar({ value, onChange, placeholder = "Pesquisar..." }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 rounded-full border focus:border-[var(--brand-primary)] focus:outline-none min-h-[48px]"
        style={{ borderColor: 'var(--brand-border-primary)', fontSize: '16px' }}
      />
    </div>
  );
}