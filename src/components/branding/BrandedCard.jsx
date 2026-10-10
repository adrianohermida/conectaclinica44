import React from "react";
import { motion } from "framer-motion";

/**
 * BrandedCard - Card atômico ConectaClínica Design System
 * 
 * CONSOLIDAÇÃO: 89 ocorrências de cards inline → 1 component
 * DNA: Google Workspace (white, subtle shadow, rounded-2xl)
 * 
 * Props:
 * - variant: "default" | "elevated" | "outlined" | "flat"
 * - padding: "none" | "sm" | "md" | "lg"
 * - hoverable: boolean
 * - onClick: function
 * - header: ReactNode (título/ações)
 * - footer: ReactNode (ações/metadados)
 * - children: ReactNode
 */
export default function BrandedCard({
  variant = "default",
  padding = "md",
  hoverable = false,
  onClick,
  header = null,
  footer = null,
  className = "",
  children,
  ...props
}) {
  // VARIANT STYLES
  const variantStyles = {
    default: {
      backgroundColor: 'var(--pc-bg-primary)',
      border: '1px solid var(--pc-border-primary)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    },
    elevated: {
      backgroundColor: 'var(--pc-bg-primary)',
      border: '1px solid var(--pc-border-primary)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '2px solid var(--pc-border-primary)',
      boxShadow: 'none'
    },
    flat: {
      backgroundColor: 'var(--pc-bg-primary)',
      border: 'none',
      boxShadow: 'none'
    }
  };

  // PADDING STYLES
  const paddingStyles = {
    none: '0',
    sm: 'var(--pc-space-3)',
    md: 'var(--pc-space-6)',
    lg: 'var(--pc-space-8)'
  };

  const baseStyles = {
    borderRadius: 'var(--pc-radius-xl)',
    overflow: 'hidden',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    ...variantStyles[variant]
  };

  const contentStyles = {
    padding: paddingStyles[padding]
  };

  const hoverStyles = hoverable || onClick ? {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)'
  } : {};

  const CardContent = (
    <div style={contentStyles}>
      {header && (
        <div style={{
          paddingBottom: 'var(--pc-space-4)',
          marginBottom: 'var(--pc-space-4)',
          borderBottom: '1px solid var(--pc-border-primary)'
        }}>
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div style={{
          paddingTop: 'var(--pc-space-4)',
          marginTop: 'var(--pc-space-4)',
          borderTop: '1px solid var(--pc-border-primary)'
        }}>
          {footer}
        </div>
      )}
    </div>
  );

  if (onClick || hoverable) {
    return (
      <motion.div
        onClick={onClick}
        className={className}
        style={baseStyles}
        whileHover={hoverStyles}
        whileTap={onClick ? { scale: 0.99 } : {}}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        {...props}
      >
        {CardContent}
      </motion.div>
    );
  }

  return (
    <div className={className} style={baseStyles} {...props}>
      {CardContent}
    </div>
  );
}