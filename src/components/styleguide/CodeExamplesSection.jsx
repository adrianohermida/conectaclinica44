import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function CodeExamplesSection() {
  const [copied, setCopied] = useState(null);

  const examples = [
    {
      component: 'Button',
      code: `<Button>Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>`,
      preview: () => (
        <div className="flex gap-2 flex-wrap">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      )
    },
    {
      component: 'Input',
      code: `<Input placeholder="Digite algo..." />
<Input type="email" placeholder="Email" />
<Input disabled placeholder="Desabilitado" />`,
      preview: () => (
        <div className="space-y-2">
          <Input placeholder="Digite algo..." />
          <Input type="email" placeholder="Email" />
          <Input disabled placeholder="Desabilitado" />
        </div>
      )
    },
    {
      component: 'Badge (CSS)',
      code: `<span className="pc-badge pc-badge-success">Sucesso</span>
<span className="pc-badge pc-badge-warning">Aviso</span>
<span className="pc-badge pc-badge-error">Erro</span>
<span className="pc-badge pc-badge-neutral">Neutro</span>`,
      preview: () => (
        <div className="flex gap-2 flex-wrap">
          <span className="pc-badge pc-badge-success">Sucesso</span>
          <span className="pc-badge pc-badge-warning">Aviso</span>
          <span className="pc-badge pc-badge-error">Erro</span>
          <span className="pc-badge pc-badge-neutral">Neutro</span>
        </div>
      )
    },
    {
      component: 'Card',
      code: `<div className="pc-card p-6">
  <h3 className="font-bold mb-2">Título</h3>
  <p className="text-sm text-gray-600">Conteúdo</p>
</div>`,
      preview: () => (
        <div className="pc-card p-6">
          <h3 className="font-bold mb-2">Título</h3>
          <p className="text-sm text-gray-600">Conteúdo do card</p>
        </div>
      )
    }
  ];

  const copyCode = (code, component) => {
    navigator.clipboard.writeText(code);
    setCopied(component);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Código copiado!');
  };

  return (
    <div className="space-y-6">
      {examples.map(ex => (
        <div key={ex.component} className="pc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{ex.component}</h3>
            <button
              onClick={() => copyCode(ex.code, ex.component)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 hover:bg-gray-50"
            >
              {copied === ex.component ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              Copiar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Código:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                {ex.code}
              </pre>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Preview:</p>
              <div className="p-4 rounded-lg border bg-gray-50">
                {ex.preview()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}