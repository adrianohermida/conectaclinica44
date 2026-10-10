import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";

/**
 * BrandingAuditor - Ferramenta de auditoria automatizada PrevenClin DNA
 * 
 * Valida:
 * - Cores primárias/secundárias/terciárias
 * - Tokens CSS --pc-*
 * - Tipografia Google Sans/Roboto
 * - Border radius (12, 16, 20, 24px)
 * - Shadows
 * - Ícones consistentes
 * - Componentes pc-*
 */

const BRANDING_RULES = {
  coresPrimarias: {
    name: "Cores Primárias PrevenClin",
    test: () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const primary = computedStyle.getPropertyValue("--pc-primary").trim();
      return primary === "#0B7A9E" || primary.includes("11, 122, 158");
    }
  },
  coresSecundarias: {
    name: "Cores Secundárias (success/warning/error)",
    test: () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const success = computedStyle.getPropertyValue("--pc-success").trim();
      return success.includes("52, 168, 83") || success === "#34a853";
    }
  },
  tokensCss: {
    name: "Tokens CSS --pc-* consistentes",
    test: () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const requiredTokens = ["--pc-primary", "--pc-success", "--pc-error", "--pc-text-primary", "--pc-radius-lg"];
      return requiredTokens.every(token => computedStyle.getPropertyValue(token).trim() !== "");
    }
  },
  tipografia: {
    name: "Google Sans/Roboto aplicadas",
    test: () => {
      const bodyFont = getComputedStyle(document.body).fontFamily;
      return bodyFont.includes("Roboto") || bodyFont.includes("Google Sans");
    }
  },
  borderRadius: {
    name: "Border Radius DNA (12, 16, 20, 24px)",
    test: () => {
      const cards = document.querySelectorAll(".pc-card");
      if (cards.length === 0) return null; // Não aplicável
      const radiuses = Array.from(cards).map(el => getComputedStyle(el).borderRadius);
      return radiuses.some(r => ["12px", "16px", "20px", "24px"].some(valid => r.includes(valid)));
    }
  },
  shadows: {
    name: "Shadows suaves --pc-shadow-*",
    test: () => {
      const computedStyle = getComputedStyle(document.documentElement);
      return computedStyle.getPropertyValue("--pc-shadow-sm").trim() !== "";
    }
  },
  componentesPc: {
    name: "Componentes pc-* (btn/card/badge)",
    test: () => {
      const hasPcComponents = document.querySelectorAll('[class*="pc-btn"], [class*="pc-card"], [class*="pc-badge"]').length > 0;
      const hasOldComponents = document.querySelectorAll('[class*="oneui-"]').length > 0;
      return hasPcComponents && !hasOldComponents;
    }
  },
  icones: {
    name: "Ícones tamanhos consistentes (w-4/5/6)",
    test: () => {
      const icons = document.querySelectorAll('svg[class*="lucide"]');
      if (icons.length === 0) return null;
      const sizes = Array.from(icons).map(el => {
        const classes = el.className.baseVal || el.className;
        return classes.includes("w-4") || classes.includes("w-5") || classes.includes("w-6");
      });
      return sizes.filter(Boolean).length / sizes.length > 0.8; // 80% dos ícones conformes
    }
  }
};

export default function BrandingAuditor() {
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const runAudit = () => {
    const auditResults = {};
    
    Object.entries(BRANDING_RULES).forEach(([key, rule]) => {
      try {
        const result = rule.test();
        auditResults[key] = {
          name: rule.name,
          passed: result === true,
          na: result === null,
          failed: result === false
        };
      } catch (e) {
        auditResults[key] = {
          name: rule.name,
          passed: false,
          na: false,
          failed: true,
          error: e.message
        };
      }
    });

    setResults(auditResults);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <button
        onClick={runAudit}
        className="fixed bottom-4 right-4 z-50 bg-[var(--pc-primary)] hover:bg-[var(--pc-primary-700)] text-white p-3 rounded-full shadow-lg pc-transition"
        title="Auditar Branding PrevenClin"
      >
        <Eye className="w-5 h-5" />
      </button>
    );
  }

  const passed = results ? Object.values(results).filter(r => r.passed).length : 0;
  const total = results ? Object.keys(results).length : 0;
  const score = Math.round((passed / total) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-2xl w-96 max-h-[600px] overflow-y-auto border border-[var(--pc-border-primary)]">
      <div className="p-4 border-b border-[var(--pc-border-secondary)] bg-[var(--pc-primary)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">Auditoria Branding DNA</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/10 p-1 rounded-full pc-transition"
          >
            ✕
          </button>
        </div>
        <div className="text-white text-sm">
          Score: <span className="font-bold text-2xl">{score}%</span> ({passed}/{total})
        </div>
      </div>

      <div className="p-4 space-y-3">
        {results && Object.entries(results).map(([key, result]) => (
          <div
            key={key}
            className={`p-3 rounded-lg border ${
              result.na ? "bg-gray-50 border-gray-200" :
              result.passed ? "bg-green-50 border-green-200" :
              "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-2">
              {result.na ? (
                <AlertTriangle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              ) : result.passed ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  result.na ? "text-gray-700" :
                  result.passed ? "text-green-900" :
                  "text-red-900"
                }`}>
                  {result.name}
                </p>
                {result.na && (
                  <p className="text-xs text-gray-600 mt-1">Não aplicável nesta página</p>
                )}
                {result.error && (
                  <p className="text-xs text-red-600 mt-1">Erro: {result.error}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--pc-border-secondary)] bg-[var(--pc-gray-50)]">
        <Button
          onClick={runAudit}
          className="w-full pc-btn-primary text-sm"
        >
          Reaudit
        </Button>
      </div>
    </div>
  );
}