import React, { useState, useMemo } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "./input";

/**
 * SearchableSelect - Select com busca integrada para listas grandes
 * Aplica checklist SlideInPanel: busca, z-index, acessibilidade, touch-friendly
 */
export default function SearchableSelect({
  items = [],
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  getLabel,
  getValue,
  disabled = false,
  required = false,
  id,
  ariaLabel,
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(item => 
      getLabel(item).toLowerCase().includes(lowerSearch)
    );
  }, [items, search, getLabel]);

  const selectedItem = items.find(item => getValue(item) === value);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-required={required}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`clay-inset border-0 min-h-[44px] text-base w-full flex items-center justify-between px-3 py-2 rounded-xl disabled:opacity-50 ${className}`}
      >
        <span className={selectedItem ? "text-[var(--pc-text-primary)]" : "text-[var(--pc-text-tertiary)]"}>
          {selectedItem ? getLabel(selectedItem) : placeholder}
        </span>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border overflow-hidden z-[9999999]"
            style={{ borderColor: '#e8eaed', maxHeight: '300px' }}
            role="listbox"
            aria-label={ariaLabel}
          >
            {/* Search Input */}
            <div className="p-2 border-b" style={{ borderColor: '#e8eaed' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--pc-text-tertiary)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-10 min-h-[40px] text-sm"
                  autoFocus
                  aria-label="Buscar item"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--pc-text-tertiary)]">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const itemValue = getValue(item);
                  const isSelected = itemValue === value;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        onValueChange(itemValue);
                        setOpen(false);
                        setSearch("");
                      }}
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between min-h-[44px] ${
                        isSelected ? 'bg-purple-50' : ''
                      }`}
                    >
                      <span className="text-sm truncate">{getLabel(item)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: '#7E57FF' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}