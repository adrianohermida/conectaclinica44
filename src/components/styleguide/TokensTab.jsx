import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Copy, Check, Zap } from "lucide-react";
import { toast } from "sonner";

export default function TokensTab() {
  const [copiedToken, setCopiedToken] = useState(null);

  const tokenGroups = [
    {
      title: 'Cores Primárias',
      tokens: [
        { name: '--brand-primary', value: '#7E57FF', uso: 'Botões, links, foco' },
        { name: '--brand-primary-50', value: '#f5f3ff', uso: 'Backgrounds hover' },
        { name: '--brand-primary-600', value: '#7E57FF', uso: 'Hover states' },
        { name: '--brand-primary-700', value: '#6d28d9', uso: 'Active states' }
      ]
    },
    {
      title: 'Cores Semânticas',
      tokens: [
        { name: '--brand-success', value: '#34a853', uso: 'Sucesso, confirmação' },
        { name: '--brand-warning', value: '#fbbc04', uso: 'Avisos, atenção' },
        { name: '--brand-error', value: '#ea4335', uso: 'Erros, falhas' },
        { name: '--brand-info', value: '#0B7A9E', uso: 'Informação, neutro' }
      ]
    },
    {
      title: 'Tipografia',
      tokens: [
        { name: '--brand-text-primary', value: '#202124', uso: 'Texto principal' },
        { name: '--brand-text-secondary', value: '#5f6368', uso: 'Texto secundário' },
        { name: '--brand-text-tertiary', value: '#80868b', uso: 'Texto desabilitado' },
        { name: '--brand-text-on-primary', value: '#ffffff', uso: 'Texto sobre primário' }
      ]
    },
    {
      title: 'Backgrounds',
      tokens: [
        { name: '--brand-bg-primary', value: '#ffffff', uso: 'Fundo cards' },
        { name: '--brand-bg-secondary', value: '#F4F7FA', uso: 'Fundo páginas' },
        { name: '--brand-bg-tertiary', value: '#f8f9fa', uso: 'Fundo alternativo' }
      ]
    }
  ];

  const copyToken = (token) => {
    navigator.clipboard.writeText(`var(${token})`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success('Token copiado!');
  };

  return (
    <div className="space-y-8">
      <div className="p-4 rounded-xl border-2 border-yellow-500 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-800">REGRA ABSOLUTA:</p>
            <p className="text-sm text-yellow-700 mt-1">
              Toda cor, espaçamento, tipografia DEVE usar tokens CSS. Valores hardcoded = REJEITADO.
            </p>
          </div>
        </div>
      </div>

      {tokenGroups.map((group) => (
        <div key={group.title} className="space-y-3">
          <h3 className="text-lg font-bold">{group.title}</h3>
          <div className="grid gap-3">
            {group.tokens.map((token) => (
              <div key={token.name} className="pc-card p-4 flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-lg border-2"
                  style={{ backgroundColor: token.value, borderColor: '#e8eaed' }}
                />
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono font-bold">{token.name}</code>
                  <p className="text-xs text-gray-600 mt-1">{token.uso}</p>
                </div>
                <code className="text-xs font-mono bg-gray-100 px-3 py-1 rounded">{token.value}</code>
                <button onClick={() => copyToken(token.name)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  {copiedToken === token.name ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pc-card p-6 bg-blue-50 border-2 border-blue-500">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Como Rebrandar Completamente
        </h3>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>Abrir <code className="bg-white px-2 py-1 rounded">globals.css</code></li>
          <li>Editar APENAS os tokens <code className="bg-white px-2 py-1 rounded">--brand-*</code></li>
          <li>Todos componentes se atualizam automaticamente</li>
          <li>Deploy e validar visualmente</li>
        </ol>
      </div>
    </div>
  );
}