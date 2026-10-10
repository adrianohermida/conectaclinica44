import React from "react";
import { motion } from "framer-motion";

/**
 * Loading Spinner - DNA PrevenClin
 * Animação circular suave
 */
export default function LoadingSpinner({ size = "md", color = "primary" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  const colors = {
    primary: "border-[var(--primary)]",
    white: "border-white",
    gray: "border-gray-400"
  };

  return (
    <motion.div
      className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

export function LoadingState({ text = "Carregando..." }) {
  return (
    <div className="oneui-card p-8 text-center">
      <LoadingSpinner size="lg" color="primary" />
      <p className="text-sm text-on-surface-variant mt-4">{text}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="oneui-card p-12 text-center"
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-variant flex items-center justify-center"
        >
          <Icon className="w-8 h-8 text-on-surface-variant" />
        </motion.div>
      )}
      <h3 className="text-lg font-medium text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action}
    </motion.div>
  );
}