import React from "react";

/**
 * Hero section padronizado para páginas públicas
 * Fundo escuro (brand-text-primary) com texto branco
 */
export default function PublicHero({ title, subtitle, children }) {
  return (
    <section 
      className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden" 
      style={{ backgroundColor: 'var(--brand-text-primary)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center min-w-0">
        <h1 
          className="font-bold text-white mb-6 break-words" 
          style={{ fontSize: 'clamp(32px, 8vw, 56px)', lineHeight: '1.2' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p 
            className="max-w-3xl mx-auto leading-relaxed break-words" 
            style={{ 
              color: 'var(--brand-text-disabled)', 
              fontSize: 'clamp(18px, 4vw, 24px)', 
              lineHeight: '1.5' 
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}