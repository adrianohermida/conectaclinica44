import React from "react";
import { motion } from "framer-motion";

/**
 * Button Component - One UI 8 + Android 16
 * Ripple effect, smooth transitions, DNA PrevenClin
 */
export const Button = React.forwardRef(({ 
  children, 
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  className = "",
  onClick,
  type = "button",
  ...props
}, ref) => {
  const baseClasses = "font-medium rounded-full inline-flex items-center justify-center gap-2 pc-transition-fast disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--pc-primary-200)] focus:ring-offset-2";
  
  const variantStyles = {
    primary: { backgroundColor: '#7E57FF', color: 'white' },
    secondary: { backgroundColor: 'white', color: '#7E57FF', border: '1px solid #7E57FF' },
    outline: { backgroundColor: 'transparent', color: '#7E57FF', border: '2px solid #7E57FF' },
    ghost: { backgroundColor: 'transparent', color: '#081828' },
    danger: { backgroundColor: '#ea4335', color: 'white' },
    success: { backgroundColor: '#34a853', color: 'white' }
  };

  const variants = {
    primary: "hover:opacity-90",
    secondary: "hover:bg-gray-50",
    outline: "hover:bg-[#7E57FF] hover:text-white",
    ghost: "hover:bg-gray-100",
    danger: "hover:opacity-90",
    success: "hover:opacity-90"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
    icon: "p-2.5"
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      style={variantStyles[variant]}
      whileHover={{ scale: 1 }}
      whileTap={{ scale: 1 }}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Processando...
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && icon}
          {children}
          {icon && iconPosition === "right" && icon}
        </>
      )}
    </motion.button>
  );
});

Button.displayName = "Button";