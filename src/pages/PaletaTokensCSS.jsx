import React, { useState } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Copy, CheckCircle2, Eye, Code, Palette } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function PaletaTokensCSS() {
  const [copiado, setCopiado] = useState(null);

  const copiar = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiado(id);
    toast.success('Copiado');
    setTimeout(() => setCopiado(null), 2000);
  };

  const tokens = [
    {
      categoria: "Primárias (Brand Identity)",
      descricao: "Cores principais da marca - definem identidade visual",
      cores: [
        { token: "--brand-primary", atual: "#7E57FF", uso: "Botões primários, links, destaques" },
        { token: "--brand-primary-50", atual: "#f5f3ff", uso: "Backgrounds hover, badges" },
        { token: "--brand-primary-100", atual: "#ede9fe", uso: "Backgrounds sutis" },
        { token: "--brand-primary-600", atual: "#7E57FF", uso: "Cores ativas" },
        { token: "--brand-primary-700", atual: "#6d28d9", uso: "Hover states" },
        { token: "--brand-primary-800", atual: "#5b21b6", uso: "Pressed states" }
      ]
    },
    {
      categoria: "Semânticas (Status)",
      descricao: "Feedback visual - sucesso, erro, aviso, info",
      cores: [
        { token: "--brand-success", atual: "#34a853", uso: "Ações bem-sucedidas, confirmações" },
        { token: "--brand-success-50", atual: "#e6f7ed", uso: "Badges sucesso" },
        { token: "--brand-warning", atual: "#fbbc04", uso: "Avisos, atenção" },
        { token: "--brand-warning-50", atual: "#fef9e5", uso: "Badges aviso" },
        { token: "--brand-error", atual: "#ea4335", uso: "Erros, ações destrutivas" },
        { token: "--brand-error-50", atual: "#fef2f2", uso: "Badges erro" },
        { token: "--brand-info", atual: "#0B7A9E", uso: "Informações, dicas" },
        { token: "--brand-info-50", atual: "#e0f2fe", uso: "Badges info" }
      ]
    },
    {
      categoria: "Textos",
      descricao: "Hierarquia de textos - legibilidade garantida",
      cores: [
        { token: "--brand-text-primary", atual: "#202124", uso: "Títulos, textos principais" },
        { token: "--brand-text-secondary", atual: "#5f6368", uso: "Subtítulos, descrições" },
        { token: "--brand-text-tertiary", atual: "#80868b", uso: "Labels, hints" },
        { token: "--brand-text-disabled", atual: "#bdc1c6", uso: "Elementos desabilitados" },
        { token: "--brand-text-on-primary", atual: "#ffffff", uso: "Texto sobre cores primárias" }
      ]
    },
    {
      categoria: "Backgrounds",
      descricao: "Camadas visuais - profundidade e organização",
      cores: [
        { token: "--brand-bg-primary", atual: "#ffffff", uso: "Cards, modais, containers" },
        { token: "--brand-bg-secondary", atual: "#F4F7FA", uso: "Background da página" },
        { token: "--brand-bg-tertiary", atual: "#f8f9fa", uso: "Backgrounds alternativos" }
      ]
    },
    {
      categoria: "Borders",
      descricao: "Separadores e contornos",
      cores: [
        { token: "--brand-border-primary", atual: "#e8eaed", uso: "Borders padrão, divisores" },
        { token: "--brand-border-secondary", atual: "#dadce0", uso: "Borders secundários" },
        { token: "--brand-border-focus", atual: "var(--brand-primary)", uso: "Focus states, inputs ativos" }
      ]
    }
  ];

  const exemplosUso = [
    {
      nome: "Button Primary",
      codigo: `<button style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)' }}>
  Ação Principal
</button>`,
      preview: (
        <button className="px-6 py-3 rounded-lg font-medium" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)' }}>
          Ação Principal
        </button>
      )
    },
    {
      nome: "Badge Success",
      codigo: `<span style={{ backgroundColor: 'var(--brand-success-50)', color: 'var(--brand-success)' }}>
  Completo
</span>`,
      preview: (
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--brand-success-50)', color: 'var(--brand-success)' }}>
          Completo
        </span>
      )
    },
    {
      nome: "Card",
      codigo: `<div style={{ backgroundColor: 'var(--brand-bg-primary)', borderColor: 'var(--brand-border-primary)' }}>
  Conteúdo
</div>`,
      preview: (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--brand-bg-primary)', borderColor: 'var(--brand-border-primary)' }}>
          Conteúdo do Card
        </div>
      )
    }
  ];

  return (
    <RouteGuard requireAuth>
      <PageHeader 
        title="Paleta Tokens CSS"
        description="Sistema de rebranding - altere 1 linha, atualize todo o app"
      />

      {/* Instruções */}
      <div className="pc-card p-6 mb-6" style={{ backgroundColor: 'var(--brand-primary-50)', borderColor: 'var(--brand-primary-200)' }}>
        <div className="flex items-start gap-4">
          <Palette className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>Como Rebrandar</h2>
            <ol className="space-y-2 text-sm" style={{ color: 'var(--brand-text-secondary)' }}>
              <li>1. Abra <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--brand-bg-primary)' }}>globals.css</code></li>
              <li>2. Localize o bloco <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--brand-bg-primary)' }}>:root</code></li>
              <li>3. Altere APENAS os valores dos tokens <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--brand-bg-primary)' }}>--brand-*</code></li>
              <li>4. Salve e veja o app inteiro se atualizar</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Paleta de Tokens */}
      {tokens.map((grupo, idx) => (
        <div key={idx} className="pc-card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>{grupo.categoria}</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--brand-text-secondary)' }}>{grupo.descricao}</p>

          <div className="grid gap-4">
            {grupo.cores.map((cor, cidx) => (
              <div key={cidx} className="flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: 'var(--brand-border-primary)' }}>
                {/* Preview */}
                <div 
                  className="w-16 h-16 rounded-lg border-2 flex-shrink-0"
                  style={{ 
                    backgroundColor: `var(${cor.token})`,
                    borderColor: 'var(--brand-border-secondary)'
                  }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="font-mono text-sm font-bold" style={{ color: 'var(--brand-text-primary)' }}>
                      {cor.token}
                    </code>
                    <button
                      onClick={() => copiar(cor.token, `token-${idx}-${cidx}`)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {copiado === `token-${idx}-${cidx}` ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand-success)' }} />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: 'var(--brand-text-tertiary)' }} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs mb-1" style={{ color: 'var(--brand-text-secondary)' }}>
                    Atual: <span className="font-mono">{cor.atual}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--brand-text-tertiary)' }}>
                    {cor.uso}
                  </p>
                </div>

                {/* CSS Snippet */}
                <button
                  onClick={() => copiar(`var(${cor.token})`, `css-${idx}-${cidx}`)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80"
                  style={{ backgroundColor: 'var(--brand-primary-50)', color: 'var(--brand-primary)' }}
                >
                  {copiado === `css-${idx}-${cidx}` ? 'Copiado!' : 'Copiar CSS'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Exemplos de Uso */}
      <div className="pc-card p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>Exemplos Práticos</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {exemplosUso.map((exemplo, idx) => (
            <div key={idx} className="border rounded-lg p-4" style={{ borderColor: 'var(--brand-border-primary)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold" style={{ color: 'var(--brand-text-primary)' }}>{exemplo.nome}</h3>
                <button
                  onClick={() => copiar(exemplo.codigo, `exemplo-${idx}`)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  {copiado === `exemplo-${idx}` ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand-success)' }} />
                  ) : (
                    <Code className="w-4 h-4" style={{ color: 'var(--brand-text-tertiary)' }} />
                  )}
                </button>
              </div>

              {/* Preview */}
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
                {exemplo.preview}
              </div>

              {/* Código */}
              <pre className="text-xs p-3 rounded overflow-x-auto" style={{ backgroundColor: 'var(--brand-bg-tertiary)', color: 'var(--brand-text-secondary)' }}>
                {exemplo.codigo}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Teste Interativo */}
      <div className="pc-card p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>Teste de Rebranding</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--brand-text-secondary)' }}>
          Abra globals.css, altere <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--brand-bg-tertiary)' }}>--brand-primary: #1e3a8a;</code> e veja esta página mudar em tempo real
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>
      </div>
    </RouteGuard>
  );
}