import React from "react";

/**
 * BrandedInput - Input com design system ConectaClínica
 */
export const BrandedInput = React.forwardRef(({ 
  className = "", 
  error = false,
  ...props 
}, ref) => {
  const classes = [
    "w-full",
    "bg-[var(--pc-surface-variant)]",
    "border",
    error ? "border-[var(--pc-error)]" : "border-[var(--pc-border-secondary)]",
    "rounded-xl",
    "px-3 md:px-4",
    "py-2.5 md:py-3",
    "text-sm md:text-base",
    "text-[var(--pc-text-primary)]",
    "placeholder:text-[var(--pc-text-tertiary)]",
    "pc-transition-fast",
    "hover:border-[var(--pc-border-primary)]",
    "hover:bg-white",
    "focus:bg-white",
    "focus:border-[var(--pc-primary)]",
    "focus:outline-none",
    "focus:ring-3",
    "focus:ring-[var(--pc-primary-50)]",
    "disabled:bg-[var(--pc-gray-100)]",
    "disabled:cursor-not-allowed",
    "disabled:text-[var(--pc-text-disabled)]",
    "min-h-[44px]",
    className
  ].filter(Boolean).join(" ");

  return <input ref={ref} className={classes} {...props} />;
});

BrandedInput.displayName = "BrandedInput";

/**
 * BrandedTextarea - Textarea com design system
 */
export const BrandedTextarea = React.forwardRef(({ 
  className = "", 
  error = false,
  rows = 4,
  ...props 
}, ref) => {
  const classes = [
    "w-full",
    "bg-[var(--pc-surface-variant)]",
    "border",
    error ? "border-[var(--pc-error)]" : "border-[var(--pc-border-secondary)]",
    "rounded-xl",
    "px-3 md:px-4",
    "py-2.5 md:py-3",
    "text-sm md:text-base",
    "text-[var(--pc-text-primary)]",
    "placeholder:text-[var(--pc-text-tertiary)]",
    "pc-transition-fast",
    "hover:border-[var(--pc-border-primary)]",
    "hover:bg-white",
    "focus:bg-white",
    "focus:border-[var(--pc-primary)]",
    "focus:outline-none",
    "focus:ring-3",
    "focus:ring-[var(--pc-primary-50)]",
    "disabled:bg-[var(--pc-gray-100)]",
    "disabled:cursor-not-allowed",
    "resize-none",
    className
  ].filter(Boolean).join(" ");

  return <textarea ref={ref} className={classes} rows={rows} {...props} />;
});

BrandedTextarea.displayName = "BrandedTextarea";