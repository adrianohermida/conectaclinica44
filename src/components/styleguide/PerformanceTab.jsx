import React from "react";
import { Shield, CheckCircle, ChevronRight } from "lucide-react";

export default function PerformanceTab() {
  const contracts = [
    {
      metrica: 'FCP (First Contentful Paint)',
      target: '< 1.0s',
      critical: '< 1.5s',
      estrategias: ['Critical CSS inline', 'Preload fonts', 'Lazy load images']
    },
    {
      metrica: 'LCP (Largest Contentful Paint)',
      target: '< 2.0s',
      critical: '< 2.5s',
      estrategias: ['Optimize images (WebP)', 'CDN', 'Prefetch critical data']
    },
    {
      metrica: 'CLS (Cumulative Layout Shift)',
      target: '< 0.01',
      critical: '< 0.1',
      estrategias: ['Width/height on images', 'Reserve space for dynamic content']
    },
    {
      metrica: 'Bundle Size (JS)',
      target: '< 300KB',
      critical: '< 500KB',
      estrategias: ['Tree shaking', 'Dynamic imports', 'Remove unused libs']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">CONTRATO DE PERFORMANCE (OBRIGATÓRIO):</p>
            <p className="text-sm text-red-700 mt-1">
              Toda feature DEVE cumprir targets. Falha = rollback. Crítico = bloqueio de deploy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {contracts.map((contract) => (
          <div key={contract.metrica} className="pc-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{contract.metrica}</h3>
                <div className="flex gap-4 mt-2">
                  <div>
                    <span className="text-xs text-gray-600">Target:</span>
                    <code className="ml-2 px-2 py-1 rounded bg-green-100 text-green-700 font-bold text-sm">
                      {contract.target}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600">Critical:</span>
                    <code className="ml-2 px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-sm">
                      {contract.critical}
                    </code>
                  </div>
                </div>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Estratégias:</p>
              <ul className="space-y-1">
                {contract.estrategias.map((est, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="text-sm">{est}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}