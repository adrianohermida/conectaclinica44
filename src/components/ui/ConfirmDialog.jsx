import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./button";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false
}) {
  if (!open) return null;

  const variantColors = {
    danger: {
      bg: "var(--pc-error-50)",
      border: "var(--pc-error-200)",
      text: "var(--pc-error-700)",
      icon: "var(--pc-error)",
      btn: "bg-[var(--pc-error)] hover:bg-[var(--pc-error-600)]"
    },
    warning: {
      bg: "var(--pc-warning-50)",
      border: "var(--pc-warning-200)",
      text: "var(--pc-warning-700)",
      icon: "var(--pc-warning)",
      btn: "bg-[var(--pc-warning)] hover:bg-[var(--pc-warning-600)]"
    }
  };

  const colors = variantColors[variant];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90%] max-w-md">
        <div className="pc-card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.bg }}
            >
              <AlertTriangle style={{ color: colors.icon }} className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="pc-heading-4 mb-1">{title}</h3>
              <p className="pc-body-sm">{description}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`${colors.btn} text-white px-6 py-2 rounded-full font-medium disabled:opacity-50 flex items-center gap-2`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}