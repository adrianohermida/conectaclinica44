import React from "react";
import { motion } from "framer-motion";

/**
 * Progress Bar - One UI 8
 * Animação fluida, cores semânticas
 */
export default function ProgressBar({ 
  value, 
  max = 100, 
  showLabel = true,
  color = "primary",
  size = "md",
  className = ""
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colors = {
    primary: "bg-[var(--primary)]",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error"
  };

  const autoColor = percentage >= 90 ? "bg-error" : 
                    percentage >= 70 ? "bg-warning" : 
                    "bg-[var(--primary)]";

  const sizes = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3"
  };

  return (
    <div className={className}>
      <div className={`w-full bg-surface-variant rounded-full ${sizes[size]} overflow-hidden`}>
        <motion.div
          className={`${color === "auto" ? autoColor : colors[color]} ${sizes[size]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      {showLabel && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-on-surface-variant mt-1.5"
        >
          {value.toLocaleString()} / {max.toLocaleString()} ({percentage.toFixed(0)}%)
        </motion.p>
      )}
    </div>
  );
}