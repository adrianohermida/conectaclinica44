import React from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export default function LintingGuide() {
  const rules = [
    {
      regra: 'no-hardcoded-colors',
      nivel: 'error',
      desc: 'Proibir cores hardcoded (hex/rgb) - usar apenas tokens CSS',
      exemplo_errado: "style={{ color: '#7E57FF' }}",
      exemplo_correto: "style={{ color: 'var(--brand-primary)' }}"
    },
    {
      regra: 'max-component-lines',
      nivel: 'error',
      desc: 'Componente não pode ter > 50 linhas',
      exemplo_errado: 'Component.js (150 linhas)',
      exemplo_correto: 'Component.js (40) + SubComponent.js (30)'
    },
    {
      regra: 'require-route-guard',
      nivel: 'error',
      desc: 'Páginas autenticadas DEVEM usar RouteGuard',
      exemplo_errado: 'export default Pacientes() { ... }',
      exemplo_correto: '<RouteGuard requireAuth>...</RouteGuard>'
    },
    {
      regra: 'require-clinica-filter',
      nivel: 'error',
      desc: 'Queries DEVEM filtrar por clinica_id (multi-tenant)',
      exemplo_errado: 'entities.Paciente.list()',
      exemplo_correto: 'entities.Paciente.filter({ clinica_id })'
    },
    {
      regra: 'min-touch-target',
      nivel: 'warning',
      desc: 'Botões/links devem ter mínimo 44x44px',
      exemplo_errado: '<button className="w-8 h-8">',
      exemplo_correto: '<button style={{ minWidth: "44px", minHeight: "44px" }}>'
    }
  ];

  const eslintConfig = {
    "rules": {
      "max-lines-per-function": ["error", 50],
      "no-inline-styles": ["error", { "allow": ["var(--"] }],
      "react/jsx-max-depth": ["error", 4],
      "complexity": ["error", 10]
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">LINTING OBRIGATÓRIO:</p>
            <p className="text-sm text-red-700 mt-1">
              Violação de regras = build failure. Sem exceções.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <div key={idx} className="pc-card p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold">{rule.regra}</code>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    rule.nivel === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {rule.nivel}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rule.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-50 border-2 border-red-500">
                <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> ERRADO:
                </p>
                <code className="text-xs text-red-800 block">{rule.exemplo_errado}</code>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border-2 border-green-500">
                <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> CORRETO:
                </p>
                <code className="text-xs text-green-800 block">{rule.exemplo_correto}</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pc-card p-6 bg-gray-900 text-green-400">
        <h3 className="font-bold mb-4 text-white">ESLint Config Recomendada:</h3>
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(eslintConfig, null, 2)}
        </pre>
      </div>
    </div>
  );
}