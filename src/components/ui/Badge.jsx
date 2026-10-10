import React from "react";
import { motion } from "framer-motion";

/**
 * Badge Component - One UI 8
 * Status indicators com cores semânticas
 */
export function Badge({ 
  children, 
  variant = "default",
  icon: Icon,
  animate = true,
  className = ""
}) {
  const variants = {
    default: "pc-badge-neutral",
    primary: "pc-badge-primary",
    success: "pc-badge-success",
    warning: "pc-badge-warning",
    error: "pc-badge-error",
    info: "pc-badge-info"
  };

  const Component = animate ? motion.span : "span";
  const animationProps = animate ? {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.2 }
  } : {};

  return (
    <Component
      className={`pc-badge ${variants[variant]} ${className}`}
      {...animationProps}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </Component>
  );
}