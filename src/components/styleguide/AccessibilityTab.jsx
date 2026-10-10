import React from "react";
import { Eye, CheckCircle } from "lucide-react";

export default function AccessibilityTab() {
  const wcagCriteria = [
    {
      criterio: 'Contraste de cores',
      nivel: 'AA',
      regra: 'Contraste mínimo 4.5:1 (texto normal), 3:1 (texto grande)',
      implementacao: 'Usar tokens --brand-text-* que já cumprem'
    },
    {
      criterio: 'Touch targets',
      nivel: 'AA',
      regra: 'Mínimo 44x44px para botões e links',
      implementacao: 'Todos botões têm min-height: 44px'
    },
    {
      criterio: 'Keyboard navigation',
      nivel: 'A',
      regra: 'Todas funcionalidades acessíveis via teclado',
      implementacao: 'Tab order lógico, focus visible'
    },
    {
      criterio: 'ARIA labels',
      nivel: 'A',
      regra: 'Elementos interativos devem ter labels',
      implementacao: 'aria-label em botões sem texto'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-800">WCAG AA (Obrigatório):</p>
            <p className="text-sm text-blue-700 mt-1">
              Todas páginas DEVEM cumprir WCAG 2.1 AA. Falha = bloqueio de deploy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {wcagCriteria.map((item) => (
          <div key={item.criterio} className="pc-card p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{item.criterio}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {item.nivel}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{item.regra}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs font-bold text-green-700 mb-1">✅ Implementação:</p>
              <p className="text-sm text-green-800">{item.implementacao}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}