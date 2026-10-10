import React from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ComponentsTab() {
  const components = [
    {
      name: 'Button',
      path: '@/components/ui/Button',
      variants: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'hover', 'active', 'disabled', 'loading']
    },
    {
      name: 'Input',
      path: '@/components/ui/input',
      variants: ['default', 'error'],
      features: ['placeholder', 'disabled', 'icon', 'clearable']
    },
    {
      name: 'Card',
      path: '@/components/ui/Card',
      variants: ['default', 'elevated', 'outlined'],
      features: ['header', 'footer', 'clickable']
    },
    {
      name: 'Badge',
      path: 'CSS utility',
      variants: ['success', 'warning', 'error', 'neutral', 'info'],
      usage: 'pc-badge pc-badge-success'
    },
    {
      name: 'Toast',
      path: 'sonner',
      methods: ['toast.success()', 'toast.error()', 'toast.warning()', 'toast.info()'],
      features: ['auto-dismiss', 'action', 'description']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-green-500 bg-green-50">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-800">REGRA DE COMPONENTES:</p>
            <p className="text-sm text-green-700 mt-1">
              Reutilize componentes existentes. Novo componente = justificativa + aprovação.
            </p>
          </div>
        </div>
      </div>

      {components.map((comp) => (
        <div key={comp.name} className="pc-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{comp.name}</h3>
              <code className="text-xs text-gray-600">{comp.path}</code>
            </div>
          </div>

          {comp.variants && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-600 mb-2">Variants:</p>
              <div className="flex gap-2 flex-wrap">
                {comp.variants.map(v => (
                  <code key={v} className="px-2 py-1 rounded bg-gray-100 text-xs">{v}</code>
                ))}
              </div>
            </div>
          )}

          {comp.name === 'Button' && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <p className="text-xs font-bold mb-3">Live Demo:</p>
              <div className="flex gap-2 flex-wrap">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          )}

          {comp.name === 'Toast' && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <p className="text-xs font-bold mb-3">Live Demo:</p>
              <div className="flex gap-2">
                <button onClick={() => toast.success('Sucesso!')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Success</button>
                <button onClick={() => toast.error('Erro!')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Error</button>
                <button onClick={() => toast.warning('Aviso!')} className="px-3 py-1.5 rounded-lg bg-yellow-600 text-white text-xs">Warning</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}