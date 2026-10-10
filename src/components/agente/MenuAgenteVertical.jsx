import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * Menu Vertical do Agente com agrupamento funcional, CTA numérico e responsividade.
 * 
 * @param {Array} menuItems - Array de itens: { id, titulo, icone: LucideIcon, badge: number, onClick, ativo }
 * @param {string} activePath - Path ativo (opcional)
 * @param {Object} badges - Objeto com contadores: { tickets: 3, consultas: 5, faturas: 2 }
 */
export default function MenuAgenteVertical({ menuItems = [], activePath, badges = {} }) {
  return (
    <nav className="flex flex-col gap-1 p-2" aria-label="Menu do agente">
      {menuItems.map(item => {
        const Icon = item.icone;
        const isActive = activePath === item.id;
        const badgeCount = badges[item.id] || item.badge || 0;

        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full min-h-[48px] ${
              isActive ? '' : 'hover:bg-gray-50'
            }`}
            style={isActive ? { backgroundColor: 'var(--brand-primary-50)' } : {}}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${item.titulo}${badgeCount > 0 ? ` (${badgeCount} pendente${badgeCount > 1 ? 's' : ''})` : ''}`}
          >
            {/* Ícone */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ 
                backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--brand-primary-50)' 
              }}
            >
              <Icon 
                className="w-5 h-5" 
                style={{ color: isActive ? 'white' : 'var(--brand-primary)' }}
                aria-hidden="true"
              />
            </div>

            {/* Label */}
            <span 
              className={`font-medium text-sm truncate flex-1 text-left transition-colors ${
                isActive ? 'text-[var(--brand-text-primary)]' : 'text-[var(--brand-text-secondary)]'
              }`}
            >
              {item.titulo}
            </span>

            {/* CTA Numérico */}
            {badgeCount > 0 && (
              <span 
                className="ml-auto bg-[var(--brand-error)] text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] px-2 flex items-center justify-center flex-shrink-0"
                aria-label={`${badgeCount} ação${badgeCount > 1 ? 'ões' : ''} pendente${badgeCount > 1 ? 's' : ''}`}
              >
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}

            {/* Submenu indicator (se necessário) */}
            {item.temSubmenu && (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </nav>
  );
}