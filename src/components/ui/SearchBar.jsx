import React from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Search Bar - One UI 8 Style
 * Foco suave, clear button animado
 */
export default function SearchBar({ 
  value = "", 
  onChange, 
  placeholder = "Pesquisar...",
  className = ""
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--pc-text-tertiary)] pc-transition-fast" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--pc-surface-variant)] hover:bg-[var(--pc-surface)] focus:bg-[var(--pc-surface)] border-0 rounded-full pl-12 pr-12 py-3 text-sm text-[var(--pc-text-primary)] placeholder-[var(--pc-text-tertiary)] outline-none pc-transition focus:ring-2 focus:ring-[var(--pc-primary-200)]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[var(--pc-gray-200)] rounded-full pc-transition-fast"
        >
          <X className="w-4 h-4 text-[var(--pc-text-secondary)]" />
        </button>
      )}
    </div>
  );
}