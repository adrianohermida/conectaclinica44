import React from "react";
import { motion } from "framer-motion";

/**
 * SectionCard - Card padronizado com tokens CSS obrigatórios
 * Substitui uso manual de bg-white, border, shadow
 */
export default function SectionCard({ 
  children, 
  title,
  icon: Icon,
  action,
  hoverable = false,
  elevated = false,
  animate = true,
  className = "",
  ...props
}) {
  const Card = animate ? motion.div : "div";
  
  return (
    <Card
      className={`pc-card ${hoverable ? 'pc-card-hover' : ''} ${elevated ? 'pc-card-elevated' : ''} ${className}`}
      style={{
        padding: 'var(--pc-space-6)',
        marginBottom: 'var(--pc-space-4)',
        borderRadius: 'var(--pc-radius-lg)',
        backgroundColor: 'var(--pc-surface)',
        border: '1px solid var(--pc-border-secondary)',
        boxShadow: elevated ? 'var(--pc-shadow-md)' : 'var(--pc-shadow-xs)'
      }}
      {...(animate && {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 }
      })}
      {...props}
    >
      {(title || action) && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 'var(--pc-space-6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pc-space-3)' }}>
            {Icon && (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--pc-radius-lg)',
                backgroundColor: 'var(--pc-primary-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon style={{ width: '20px', height: '20px', color: 'var(--pc-primary)' }} />
              </div>
            )}
            {title && (
              <h3 className="pc-heading-4" style={{ color: 'var(--pc-text-primary)' }}>
                {title}
              </h3>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}