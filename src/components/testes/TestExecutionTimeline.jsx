import React from "react";
import { CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";

/**
 * Timeline visual de execução dos testes
 * Mostra progresso e identifica gargalos
 */
export default function TestExecutionTimeline({ suites, totalDuracao }) {
  if (!suites || suites.length === 0) return null;

  const maxTempo = Math.max(...suites.map(s => s.tempo_execucao || 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: '#9aa0a6' }}>
          Timeline de Execução
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#5f6368' }}>
          <Clock className="w-3 h-3" />
          Total: {totalDuracao ? `${(totalDuracao / 1000).toFixed(1)}s` : '—'}
        </div>
      </div>

      {suites.map((suite, i) => {
        const isPassed = suite.failed === 0;
        const tempo = suite.tempo_execucao || 0;
        const widthPercent = maxTempo > 0 ? (tempo / maxTempo * 100) : 0;
        const isLento = tempo > 5000; // > 5s = lento

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {isPassed ? (
                  <CheckCircle className="w-3 h-3" style={{ color: '#34a853' }} />
                ) : (
                  <AlertCircle className="w-3 h-3" style={{ color: '#ea4335' }} />
                )}
                <span className="font-medium" style={{ color: '#202124' }}>
                  {suite.suite}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isLento && (
                  <Zap className="w-3 h-3" style={{ color: '#fbbc04' }} />
                )}
                <span className="font-mono" style={{ color: '#5f6368' }}>
                  {tempo > 0 ? `${tempo}ms` : '—'}
                </span>
              </div>
            </div>
            
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${widthPercent}%`,
                  backgroundColor: isPassed ? '#34a853' : '#ea4335'
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Legenda */}
      <div className="flex items-center gap-4 pt-3 border-t text-xs" style={{ borderColor: '#f1f3f4', color: '#9aa0a6' }}>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" style={{ color: '#fbbc04' }} />
          <span>&gt; 5s = otimizar</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" style={{ color: '#34a853' }} />
          <span>Passou</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" style={{ color: '#ea4335' }} />
          <span>Falhou</span>
        </div>
      </div>
    </div>
  );
}