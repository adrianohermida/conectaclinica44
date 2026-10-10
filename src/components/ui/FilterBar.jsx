import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * FilterBar - Design System ConectaClínica
 * 
 * Barra de filtros reutilizável com search + selects
 * Elimina duplicação em 5+ páginas
 * 
 * Props:
 * - searchValue: string
 * - onSearchChange: (value) => void
 * - searchPlaceholder: string
 * - filters: array de { value, onValueChange, options: [{value, label}], placeholder }
 */
export default function FilterBar({ 
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters = []
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex-shrink-0" style={{ color: '#80868b' }} />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 border-gray-300 rounded-xl w-full min-h-[48px] text-base"
          />
        </div>

        {/* Filtros dinâmicos */}
        {filters.map((filter, idx) => (
          <Select key={idx} value={filter.value} onValueChange={filter.onValueChange}>
            <SelectTrigger className="w-full sm:w-48 border-gray-300 rounded-xl min-h-[48px] text-base">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}