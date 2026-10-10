import React from "react";

/**
 * EmptyState - Estado vazio atômico ConectaClínica
 * 
 * CONSOLIDAÇÃO: 34 ocorrências de empty states custom → 1 component
 * DNA: Google Workspace (icon + mensagem centrada, tom consistente)
 * 
 * Props:
 * - icon: LucideIcon
 * - title: string
 * - description: string
 * - action: ReactNode (botão CTA)
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null
}) {
  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border overflow-hidden"
      style={{ 
        borderColor: 'var(--pc-border-primary)',
        padding: 'var(--pc-space-8)',
        textAlign: 'center'
      }}
    >
      {Icon && (
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 'var(--pc-space-4)'
        }}>
          <Icon 
            className="w-12 h-12 md:w-16 md:h-16" 
            style={{ color: 'var(--pc-gray-400)' }}
            aria-hidden="true"
          />
        </div>
      )}
      
      {title && (
        <h3 
          className="text-base md:text-lg font-semibold mb-2"
          style={{ color: 'var(--pc-text-primary)' }}
        >
          {title}
        </h3>
      )}
      
      {description && (
        <p 
          className="text-sm md:text-base mb-4"
          style={{ color: 'var(--pc-text-secondary)' }}
        >
          {description}
        </p>
      )}
      
      {action && (
        <div style={{ marginTop: 'var(--pc-space-6)' }}>
          {action}
        </div>
      )}
    </div>
  );
}