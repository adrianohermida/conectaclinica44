import React from "react";
import { Building2, Zap } from "lucide-react";

export default function PreencherDadosFiscais({ dadosFiscais, onPreencher }) {
  if (!dadosFiscais || dadosFiscais.length === 0) {
    return null;
  }

  const fiscal = dadosFiscais[0];

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-start gap-3">
        <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-blue-900 mb-2">Dados Fiscais Cadastrados</h4>
          <div className="text-sm text-blue-800 space-y-1 mb-3">
            <p><strong>Razão Social:</strong> {fiscal.razao_social}</p>
            <p><strong>CNPJ:</strong> {fiscal.cnpj}</p>
            {fiscal.inscricao_municipal && <p><strong>IM:</strong> {fiscal.inscricao_municipal}</p>}
            <p><strong>Cidade/UF:</strong> {fiscal.cidade}/{fiscal.estado}</p>
          </div>
          <button
            type="button"
            onClick={() => onPreencher(fiscal)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Preencher Automaticamente
          </button>
        </div>
      </div>
    </div>
  );
}