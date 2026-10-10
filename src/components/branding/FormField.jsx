import React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * FormField - Campo de formulário atômico ConectaClínica
 * 
 * CONSOLIDAÇÃO: 287 ocorrências de label + input → 1 component
 * FEATURES: Validação built-in, error states, acessibilidade completa
 * 
 * Props:
 * - label: string
 * - type: "text" | "email" | "number" | "date" | "textarea" | "select"
 * - value: any
 * - onChange: (value) => void
 * - required: boolean
 * - error: string
 * - placeholder: string
 * - options: array (para select)
 * - rows: number (para textarea)
 * - disabled: boolean
 * - helperText: string
 */
export default function FormField({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  error = null,
  placeholder = "",
  options = [],
  rows = 3,
  disabled = false,
  helperText = "",
  id,
  className = "",
  ...props
}) {
  const fieldId = id || `field-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = !!error;

  const labelStyles = {
    display: 'block',
    fontSize: 'var(--pc-text-sm)',
    fontWeight: '500',
    color: 'var(--pc-text-secondary)',
    marginBottom: 'var(--pc-space-2)'
  };

  const errorStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--pc-space-1)',
    marginTop: 'var(--pc-space-2)',
    fontSize: 'var(--pc-text-xs)',
    color: 'var(--pc-error)'
  };

  const helperStyles = {
    marginTop: 'var(--pc-space-2)',
    fontSize: 'var(--pc-text-xs)',
    color: 'var(--pc-text-tertiary)'
  };

  const inputBaseClass = `border rounded-lg min-h-[44px] w-full ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[var(--pc-primary)]'
  } ${className}`;

  const renderInput = () => {
    switch (type) {
      case "textarea":
        return (
          <textarea
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows}
            className={`${inputBaseClass} p-3 resize-none text-sm md:text-base`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
            {...props}
          />
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={fieldId}
              className={`${inputBaseClass} text-base`}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {options.map((opt) => (
                <SelectItem 
                  key={typeof opt === 'string' ? opt : opt.value} 
                  value={typeof opt === 'string' ? opt : opt.value}
                >
                  {typeof opt === 'string' ? opt : opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={fieldId}
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`${inputBaseClass} text-base`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined}
            {...props}
          />
        );
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} style={labelStyles}>
          {label}
          {required && <span style={{ color: 'var(--pc-error)' }}> *</span>}
        </label>
      )}
      
      {renderInput()}
      
      {hasError && (
        <div id={`${fieldId}-error`} style={errorStyles} role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {!hasError && helperText && (
        <p id={`${fieldId}-helper`} style={helperStyles}>
          {helperText}
        </p>
      )}
    </div>
  );
}