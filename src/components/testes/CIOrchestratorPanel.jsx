import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Play, GitBranch, Shield, Zap, Terminal, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Painel de orquestração de testes - permite executar diferentes suites
 */
export default function CIOrchestratorPanel() {
  const [selectedPipeline, setSelectedPipeline] = useState('completo');

  const pipelines = [
    {
      id: 'completo',
      nome: 'Suite Completa',
      descricao: '17 módulos • ~30s',
      icon: Shield,
      color: '#7E57FF',
      funcao: 'testeE2EIsolamentoCompleto'
    },
    {
      id: 'domains',
      nome: 'Isolamento Domains',
      descricao: 'Email whitelabel • ~5s',
      icon: GitBranch,
      color: '#0284c7',
      funcao: 'testeE2EIsolamentoDomains'
    },
    {
      id: 'diagnostico',
      nome: 'Diagnóstico Rápido',
      descricao: 'Scan vazamentos • ~3s',
      icon: Zap,
      color: '#fbbc04',
      funcao: 'diagnosticarIsolamentoDomains'
    }
  ];

  const executarMutation = useMutation({
    mutationFn: async (pipelineId) => {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      const res = await base44.functions.invoke(pipeline.funcao, {});
      return { ...res.data, pipeline: pipeline.nome };
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.pipeline} executado`);
    }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: '#9aa0a6' }}>
        Pipelines Disponíveis
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {pipelines.map(pipeline => {
          const Icon = pipeline.icon;
          const isSelected = selectedPipeline === pipeline.id;
          
          return (
            <button
              key={pipeline.id}
              onClick={() => setSelectedPipeline(pipeline.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all`}
              style={{
                borderColor: isSelected ? pipeline.color : '#e8eaed',
                backgroundColor: isSelected ? `${pipeline.color}10` : 'white'
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{ backgroundColor: `${pipeline.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: pipeline.color }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#202124' }}>
                    {pipeline.nome}
                  </p>
                </div>
              </div>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                {pipeline.descricao}
              </p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => executarMutation.mutate(selectedPipeline)}
        disabled={executarMutation.isPending}
        className="w-full px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3"
        style={{ 
          backgroundColor: '#7E57FF', 
          color: 'white',
          opacity: executarMutation.isPending ? 0.6 : 1
        }}
      >
        <Play className="w-5 h-5" />
        {executarMutation.isPending ? 'Executando...' : 'Executar Pipeline'}
      </button>

      {/* Comando CLI */}
      <div className="p-4 rounded-lg border" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4" style={{ color: '#5f6368' }} />
          <p className="text-xs font-medium" style={{ color: '#5f6368' }}>
            Executar via CLI:
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] font-mono bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
            curl -X POST https://base44.app/.../
            {pipelines.find(p => p.id === selectedPipeline)?.funcao}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `curl -X POST https://base44.app/api/apps/YOUR_APP_ID/functions/${pipelines.find(p => p.id === selectedPipeline)?.funcao}`
              );
              toast.success('Comando copiado');
            }}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <Copy className="w-4 h-4" style={{ color: '#5f6368' }} />
          </button>
        </div>
      </div>
    </div>
  );
}