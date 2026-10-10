import React from "react";
import { motion } from "framer-motion";

/**
 * Icon Button - Material Design + One UI 8
 * Ripple effect, circular, DNA PrevenClin
 */
export default function IconButton({ 
  icon: Icon, 
  onClick,
  variant = "ghost",
  color = "default",
  size = "md",
  className = "",
  tooltip,
  ...props
}) {
  const variants = {
    ghost: "hover:bg-surface-variant",
    primary: "bg-[var(--primary-50)] hover:bg-[var(--primary-100)] text-[var(--primary)]",
    surface: "bg-surface-variant hover:bg-outline-variant"
  };

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <motion.button
      onClick={onClick}
      className={`
        ${sizes[size]}
        ${variants[variant]}
        rounded-full
        flex items-center justify-center
        smooth-transition
        ripple
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={tooltip}
      {...props}
    >
      <Icon className={`${iconSizes[size]} text-on-surface-variant`} />
    </motion.button>
  );
}