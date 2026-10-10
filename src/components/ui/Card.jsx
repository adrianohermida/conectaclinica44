import React from "react";
import { motion } from "framer-motion";

/**
 * Card Component - One UI 8 + DNA PrevenClin
 * Elevação sutil, transição suave, bordas fluidas
 */
export function Card({ 
  children, 
  className = "", 
  hoverable = false,
  onClick,
  animate = true,
  delay = 0
}) {
  const Component = animate ? motion.div : "div";
  
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: 0.35, 
      delay,
      ease: [0.4, 0, 0.2, 1] 
    }
  } : {};

  return (
    <Component
      onClick={onClick}
      className={`
        pc-card
        ${hoverable ? 'cursor-pointer hover:shadow-[var(--pc-shadow-lg)] active:scale-[0.98]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        pc-transition
        ${className}
      `}
      {...animationProps}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-6 py-4 border-b border-[var(--pc-border-primary)] ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "" }) {
  return (
    <div className={`px-6 py-4 border-t border-[var(--pc-border-primary)] ${className}`}>
      {children}
    </div>
  );
}