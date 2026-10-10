import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * BrandedSelect - Select com design system ConectaClínica
 */
export default function BrandedSelect({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder = "Selecione",
  className = "",
  ...props 
}) {
  const triggerClasses = [
    "bg-[var(--pc-surface-variant)]",
    "border-[var(--pc-border-secondary)]",
    "rounded-xl",
    "h-11 md:h-12",
    "text-sm md:text-base",
    "hover:border-[var(--pc-border-primary)]",
    "hover:bg-white",
    "focus:bg-white",
    "focus:border-[var(--pc-primary)]",
    "focus:ring-3",
    "focus:ring-[var(--pc-primary-50)]",
    className
  ].filter(Boolean).join(" ");

  return (
    <Select value={value} onValueChange={onValueChange} {...props}>
      <SelectTrigger className={triggerClasses}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}