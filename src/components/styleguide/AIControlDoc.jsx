import React from "react";
import { Shield, Zap, AlertCircle, CheckCircle } from "lucide-react";

/**
 * AI CONTROL - Documentação de Compliance para Base44 Agent
 * Contratos obrigatórios: Design, Performance, Acessibilidade, Segurança
 */
export default function AIControlDoc() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="pc-card p-8 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-500">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h1 className="text-3xl font-bold text-red-800 mb-3">AI CONTROL - CONTRATOS OBRIGATÓRIOS</h1>
            <p className="text-lg text-red-700">
              Base44 Agent DEVE seguir estes contratos. Violação = ROLLBACK IMEDIATO.
            </p>
          </div>
        </div>
      </div>

      {/* DESIGN SYSTEM */}
      <div className="pc-card p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6" style={{ color: '#7E57FF' }} />
          Design System
        </h2>
        <div className="space-y-4">
          <Rule 
            type="error" 
            title="TOKENS CSS OBRIGATÓRIOS" 
            description="Toda cor, espaçamento, tipografia DEVE usar var(--brand-*). Valores hardcoded = REJEITADO."
            examples={[
              { wrong: 'color: #7E57FF', right: 'color: var(--brand-primary)' },
              { wrong: 'padding: 16px', right: 'padding: var(--pc-space-4)' }
            ]}
          />
          <Rule 
            type="warning" 
            title="COMPONENTES REUTILIZÁVEIS" 
            description="Antes de criar: verificar /components/ui/. Novo componente = justificativa + aprovação."
          />
          <Rule 
            type="success" 
            title="ATOMICIDADE" 
            description="Componentes < 50 linhas. Maior = quebrar em múltiplos componentes."
          />
        </div>
      </div>

      {/* PERFORMANCE */}
      <div className="pc-card p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" />
          Performance (Core Web Vitals)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Métrica</th>
              <th className="text-center py-2">Target</th>
              <th className="text-center py-2">Critical</th>
              <th className="text-center py-2">Bloqueio</th>
            </tr>
          </thead>
          <tbody>
            {[
              { metrica: 'FCP', target: '< 1.0s', critical: '< 1.5s', bloqueio: true },
              { metrica: 'LCP', target: '< 2.0s', critical: '< 2.5s', bloqueio: true },
              { metrica: 'CLS', target: '< 0.01', critical: '< 0.1', bloqueio: true },
              { metrica: 'TBT', target: '< 150ms', critical: '< 300ms', bloqueio: false },
              { metrica: 'API P95', target: '< 200ms', critical: '< 500ms', bloqueio: true },
              { metrica: 'Bundle JS', target: '< 300KB', critical: '< 500KB', bloqueio: true },
              { metrica: 'Bundle CSS', target: '< 50KB', critical: '< 100KB', bloqueio: false }
            ].map((row, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-3 font-bold">{row.metrica}</td>
                <td className="py-3 text-center">
                  <code className="px-2 py-1 rounded bg-green-100 text-green-700 font-bold text-xs">
                    {row.target}
                  </code>
                </td>
                <td className="py-3 text-center">
                  <code className="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">
                    {row.critical}
                  </code>
                </td>
                <td className="py-3 text-center">
                  {row.bloqueio ? (
                    <span className="text-red-600 font-bold">❌ SIM</span>
                  ) : (
                    <span className="text-yellow-600">⚠️ Aviso</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ACESSIBILIDADE */}
      <div className="pc-card p-6">
        <h2 className="text-2xl font-bold mb-4">Acessibilidade (WCAG 2.1 AA)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Contraste 4.5:1 (texto) / 3:1 (UI)',
            'Touch targets 44x44px mínimo',
            'Keyboard navigation completa',
            'ARIA labels em botões sem texto',
            'Skip to content link',
            'Alt text descritivo em imagens',
            'Headings sequenciais (H1>H2>H3)',
            'Lighthouse score > 90'
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-800">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SEGURANÇA */}
      <div className="pc-card p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-600" />
          Segurança & LGPD
        </h2>
        <div className="space-y-3">
          {[
            { categoria: 'Auth', regra: 'RouteGuard em todas páginas autenticadas' },
            { categoria: 'Multi-tenant', regra: 'SEMPRE filtrar por clinica_id' },
            { categoria: 'Role', regra: 'Verificar user.role em backend functions' },
            { categoria: 'Logs', regra: 'NUNCA logar senhas, tokens, CPF, dados médicos' },
            { categoria: 'LGPD', regra: 'Consentimento explícito + ROPA + minimização' },
            { categoria: 'SQL', regra: 'NUNCA concatenar SQL diretamente' },
            { categoria: 'XSS', regra: 'Sanitizar HTML antes de renderizar' },
            { categoria: 'Secrets', regra: 'SEMPRE usar Deno.env.get(), nunca hardcode' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold flex-shrink-0">
                {item.categoria}
              </span>
              <p className="text-sm text-red-800 flex-1">{item.regra}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DEPLOY CHECKLIST */}
      <div className="pc-card p-6 bg-yellow-50 border-2 border-yellow-500">
        <h2 className="text-2xl font-bold mb-4">Checklist Pré-Deploy (Obrigatório)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Lint pass (0 errors)',
            'Build success',
            'Lighthouse > 90',
            'Bundle size < limits',
            'Security scan (0 critical)',
            'Secrets configuradas',
            'Rate limiting ativo',
            'CORS configurado',
            'Headers de segurança',
            'Backup de dados',
            'Rollback plan documentado',
            'Zero console.log sensível'
          ].map((item, idx) => (
            <label key={idx} className="flex items-center gap-2 p-2 rounded hover:bg-yellow-100 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Rule({ type, title, description, examples }) {
  const config = {
    error: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: '❌' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800', icon: '⚠️' },
    success: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800', icon: '✅' }
  }[type];

  return (
    <div className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}>
      <p className="font-bold mb-2 flex items-center gap-2 ${config.text}">
        <span className="text-xl">{config.icon}</span>
        {title}
      </p>
      <p className={`text-sm ${config.text} mb-3`}>{description}</p>
      {examples && (
        <div className="space-y-2">
          {examples.map((ex, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3 text-xs">
              <code className="px-2 py-1 rounded bg-red-100 text-red-700">❌ {ex.wrong}</code>
              <code className="px-2 py-1 rounded bg-green-100 text-green-700">✅ {ex.right}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}