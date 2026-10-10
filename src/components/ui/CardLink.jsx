import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * CardLink - Componente genérico reutilizável para links de navegação
 * Reduz duplicação de código e padroniza UX
 */
export default function CardLink({ 
  title, 
  description, 
  icon: Icon, 
  to, 
  badge,
  onClick,
  className = "",
  ...props 
}) {
  const content = (
    <div className={`pc-card p-5 hover:shadow-lg pc-transition cursor-pointer group h-full flex flex-col ${className}`}>
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" 
               style={{ backgroundColor: '#f5f3ff' }}>
            <Icon className="w-6 h-6" style={{ color: '#7E57FF' }} />
          </div>
        )}
        {badge && (
          <span className="pc-badge pc-badge-warning text-[10px]">{badge}</span>
        )}
      </div>
      
      <h3 className="text-base font-semibold mb-2 text-[var(--pc-text-primary)] group-hover:text-[var(--pc-primary)] pc-transition">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-[var(--pc-text-secondary)] flex-1">
          {description}
        </p>
      )}
      
      <div className="mt-3 flex items-center text-[var(--pc-primary)] text-sm font-medium opacity-0 group-hover:opacity-100 pc-transition">
        Acessar
        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 pc-transition" />
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left" {...props}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} className="block" {...props}>
      {content}
    </Link>
  );
}