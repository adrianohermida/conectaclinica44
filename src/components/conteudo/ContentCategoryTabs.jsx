import React from "react";

/**
 * TABS CATEGORIA - Filtro horizontal
 */
export default function ContentCategoryTabs({ categories, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map(cat => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all ${
              active === cat.value ? '' : 'hover:bg-gray-100'
            }`}
            style={active === cat.value ? {
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--brand-text-on-primary)',
              fontSize: '14px'
            } : {
              backgroundColor: 'var(--pc-gray-50)',
              color: 'var(--brand-text-secondary)',
              fontSize: '14px'
            }}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}