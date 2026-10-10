import React from "react";
import { Shield, X } from "lucide-react";

export default function SecurityTab() {
  const securityRules = [
    {
      categoria: 'Autenticação',
      regras: [
        'Todas rotas autenticadas devem usar RouteGuard',
        'Token JWT com expiração de 15 min',
        'Rate limiting em login (5 tentativas/min)'
      ]
    },
    {
      categoria: 'Autorização',
      regras: [
        'Verificar user.role em todas funções backend',
        'Multi-tenant: SEMPRE filtrar por clinica_id',
        'Admin: validar user.role === "admin"'
      ]
    },
    {
      categoria: 'LGPD',
      regras: [
        'Consentimento explícito antes de coletar dados',
        'Registro de tratamento (ROPA)',
        'Mascaramento de CPF/telefone em logs',
        'Direito ao esquecimento implementado'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">SEGURANÇA = REQUISITO NÃO-FUNCIONAL:</p>
            <p className="text-sm text-red-700 mt-1">
              Violação de segurança = rollback imediato + auditoria completa.
            </p>
          </div>
        </div>
      </div>

      {securityRules.map((category) => (
        <div key={category.categoria} className="pc-card p-6">
          <h3 className="text-lg font-bold mb-4">{category.categoria}</h3>
          <div className="space-y-2">
            {category.regras.map((regra, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{regra}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}