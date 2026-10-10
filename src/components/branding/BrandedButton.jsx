import React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

/**
 * BrandedButton - Botão atômico ConectaClínica Design System
 * 
 * CONSOLIDAÇÃO: 127 ocorrências de botões inline → 1 component
 * DNA: Google Workspace (rounded-xl, bold, min-height 48px)
 * 
 * Props:
 * - variant: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
 * - size: "sm" | "md" | "lg" | "icon"
 * - loading: boolean
 * - icon: LucideIcon
 * - iconPosition: "left" | "right"
 * - fullWidth: boolean
 * - children: ReactNode
 */
export default function BrandedButton({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = "left",
  fullWidth = false,
  onClick,
  type = "button",
  className = "",
  children,
  ariaLabel,
  ...props
}) {
  // VARIANT STYLES - CSS vars only
  const variantStyles = {
    primary: {
      backgroundColor: 'var(--pc-primary)',
      color: 'var(--pc-text-on-primary)',
      border: 'none'
    },
    secondary: {
      backgroundColor: 'var(--pc-bg-primary)',
      color: 'var(--pc-text-secondary)',
      border: '1px solid var(--pc-border-primary)'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--pc-primary)',
      border: '2px solid var(--pc-primary)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--pc-text-secondary)',
      border: 'none'
    },
    danger: {
      backgroundColor: 'var(--pc-error)',
      color: 'var(--pc-text-on-primary)',
      border: 'none'
    },
    success: {
      backgroundColor: 'var(--pc-success)',
      color: 'var(--pc-text-on-primary)',
      border: 'none'
    }
  };

  // SIZE STYLES - Mobile-first accessibility
  const sizeStyles = {
    sm: {
      minHeight: '44px',
      padding: '0.625rem 1rem',
      fontSize: '14px'
    },
    md: {
      minHeight: '48px',
      padding: '0.75rem 1.5rem',
      fontSize: '16px'
    },
    lg: {
      minHeight: '52px',
      padding: '1rem 2rem',
      fontSize: '18px'
    },
    icon: {
      minWidth: '48px',
      minHeight: '48px',
      padding: '0.75rem',
      fontSize: '16px'
    }
  };

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: 'var(--pc-radius-lg)',
    fontWeight: '700',
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? '0.4' : '1',
    width: fullWidth ? '100%' : 'auto',
    ...variantStyles[variant],
    ...sizeStyles[size]
  };

  const hoverStyles = !disabled && !loading ? {
    opacity: 0.9,
    transform: 'translateY(-1px)'
  } : {};

  return (
    <motion.button
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      className={className}
      style={baseStyles}
      whileHover={hoverStyles}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Processando...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />}
          {children}
          {Icon && iconPosition === "right" && <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />}
        </>
      )}
    </motion.button>
  );
}