import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

/**
 * Alert Banner - One UI 8
 * Notificações e avisos com DNA PrevenClin
 */
export default function AlertBanner({ 
  variant = "info",
  title,
  children,
  onDismiss,
  className = ""
}) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      iconColor: "text-green-600"
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-900",
      iconColor: "text-yellow-600"
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      iconColor: "text-red-600"
    },
    info: {
      icon: Info,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      iconColor: "text-blue-600"
    }
  };

  const { icon: Icon, bg, border, text, iconColor } = config[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className={`oneui-card ${bg} border-l-4 ${border} p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold ${text} mb-1`}>{title}</h3>
          )}
          <div className={`text-sm ${text}`}>
            {children}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-black/5 rounded-full smooth-transition"
          >
            <X className={`w-4 h-4 ${iconColor}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
}