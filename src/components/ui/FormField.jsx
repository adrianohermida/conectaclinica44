import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { AlertCircle, CheckCircle } from "lucide-react";

export function FormField({
  label,
  value,
  onChange,
  validacao,
  required = false,
  className = "",
  showValidation = true,
  ...props
}) {
  const [touched, setTouched] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (touched && validacao && value) {
      const resultado = validacao(value);
      setErro(resultado.valido ? null : resultado.erro);
    } else if (!value && touched && required) {
      setErro(`${label} é obrigatório`);
    } else {
      setErro(null);
    }
  }, [value, touched, validacao, required, label]);

  return (
    <div className={className}>
      <label className="block pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2">
        {label} {required && <span className="text-[var(--pc-error)]">*</span>}
      </label>
      <div className="relative">
        <Input
          value={value}
          onChange={onChange}
          onBlur={() => setTouched(true)}
          className={`pr-10 ${
            touched && erro ? 'border-[var(--pc-error)] focus:ring-[var(--pc-error)]' :
            touched && value && !erro ? 'border-[var(--pc-success)] focus:ring-[var(--pc-success)]' :
            ''
          }`}
          {...props}
        />
        {showValidation && touched && value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {erro ? (
              <AlertCircle className="w-4 h-4 text-[var(--pc-error)]" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[var(--pc-success)]" />
            )}
          </div>
        )}
      </div>
      {showValidation && touched && erro && (
        <p className="text-xs text-[var(--pc-error)] mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {erro}
        </p>
      )}
    </div>
  );
}