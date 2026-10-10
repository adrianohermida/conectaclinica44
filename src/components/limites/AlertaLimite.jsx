import React from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AlertaLimite({ recurso, limites }) {
  if (!limites || !limites[recurso]) return null;

  const { usado, limite, percentual, atingido } = limites[recurso];

  if (!atingido && percentual < 80) return null;

  return (
    <div className={`rounded-xl p-4 border ${
      atingido 
        ? "bg-[var(--pc-error-50)] border-[var(--pc-error-200)]" 
        : "bg-[var(--pc-warning-50)] border-[var(--pc-warning-200)]"
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          atingido ? "text-[var(--pc-error-600)]" : "text-[var(--pc-warning-600)]"
        }`} />
        <div className="flex-1">
          <p className={`pc-body font-medium ${
            atingido ? "text-[var(--pc-error-800)]" : "text-[var(--pc-warning-800)]"
          }`}>
            {atingido ? "Limite Atingido" : "Atenção: Limite Próximo"}
          </p>
          <p className={`pc-body-sm mt-1 ${
            atingido ? "text-[var(--pc-error-700)]" : "text-[var(--pc-warning-700)]"
          }`}>
            Uso atual: <strong>{usado}/{limite === 999999 ? "∞" : limite}</strong> ({percentual}%)
          </p>
          {atingido && (
            <Link to={createPageUrl("PlanosPrecos")}>
              <button className="mt-3 pc-btn-secondary border-[var(--pc-error-300)] text-[var(--pc-error-700)] pc-body-sm inline-flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Fazer Upgrade
              </button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}