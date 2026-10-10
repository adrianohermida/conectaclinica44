import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Journey Subscription - Mapeia jornada planos/assinaturas/beta
 * Identifica problemas: plano não sincronizado, beta não aplicado, módulos bloqueados incorretamente
 */
export default function JourneySubscription() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: planos = [] } = useQuery({
    queryKey: ['planos-modulo'],
    queryFn: () => base44.entities.PlanoModulo.list()
  });

  const { data: assinaturas = [] } = useQuery({
    queryKey: ['assinaturas'],
    queryFn: () => base44.entities.AssinaturaClinica.list()
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ['clinicas'],
    queryFn: () => base44.entities.Clinica.list()
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const issues = [];

    // 1. Assinaturas sem plano ativo
    assinaturas.forEach(ass => {
      const plano = planos.find(p => p.stripe_product_id === ass.stripe_price_id);
      if (!plano) {
        issues.push({
          type: 'plano_nao_encontrado',
          severity: 'critical',
          clinica_nome: ass.clinica_nome,
          description: `Assinatura ${ass.id} com stripe_price_id ${ass.stripe_price_id} não mapeia para nenhum PlanoModulo`,
          fix: 'Sincronizar PlanoModulo com Stripe ou corrigir stripe_price_id na assinatura'
        });
      }
    });

    // 2. Clínicas beta sem assinatura
    clinicas.forEach(clinica => {
      const ass = assinaturas.find(a => a.clinica_id === clinica.id);
      if (!ass && clinica.ativa) {
        issues.push({
          type: 'clinica_sem_assinatura',
          severity: 'high',
          clinica_nome: clinica.nome,
          description: `Clínica ${clinica.nome} ativa mas sem registro em AssinaturaClinica`,
          fix: 'Criar assinatura trial ou enterprise para clínica'
        });
      }
    });

    // 3. Beta não aplicado corretamente
    planos.forEach(plano => {
      (plano.beta_clinicas || []).forEach(clinicaId => {
        const ass = assinaturas.find(a => a.clinica_id === clinicaId);
        if (ass && ass.plano_slug !== 'enterprise') {
          issues.push({
            type: 'beta_nao_aplicado',
            severity: 'medium',
            clinica_id: clinicaId,
            description: `Clínica ${clinicaId} está em beta_clinicas do plano ${plano.nome} mas assinatura é ${ass.plano_slug}`,
            fix: 'Atualizar assinatura para enterprise ou remover de beta_clinicas'
          });
        }
      });
    });

    // 4. Módulos não sincronizados
    assinaturas.forEach(ass => {
      const plano = planos.find(p => p.stripe_product_id === ass.stripe_price_id);
      if (plano) {
        const modulosPlano = new Set(plano.modulos_inclusos || []);
        const modulosAss = new Set(ass.modulos_inclusos || []);
        
        const faltando = [...modulosPlano].filter(m => !modulosAss.has(m));
        const sobrando = [...modulosAss].filter(m => !modulosPlano.has(m));
        
        if (faltando.length > 0 || sobrando.length > 0) {
          issues.push({
            type: 'modulos_dessincronizados',
            severity: 'high',
            clinica_nome: ass.clinica_nome,
            description: `Assinatura ${ass.clinica_nome}: módulos faltando=[${faltando}], sobrando=[${sobrando}]`,
            fix: 'Executar sincronizarPlanoModulos para atualizar modulos_inclusos'
          });
        }
      }
    });

    setDiagnosis(issues);
    setAnalyzing(false);
  };

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🔐 Journey Subscription (Planos/Beta/Acesso)</h3>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {analyzing ? 'Analisando...' : 'Analisar Jornada'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-800">{planos.length}</div>
          <div className="text-xs text-green-700">Planos Cadastrados</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-800">{assinaturas.length}</div>
          <div className="text-xs text-blue-700">Assinaturas Ativas</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-800">
            {planos.reduce((acc, p) => acc + (p.beta_clinicas?.length || 0), 0)}
          </div>
          <div className="text-xs text-purple-700">Clínicas Beta</div>
        </div>
      </div>

      {diagnosis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">Issues Detectadas</h4>
            <span className={`text-xs px-2 py-1 rounded ${
              diagnosis.length === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {diagnosis.length} problemas
            </span>
          </div>
          
          {diagnosis.length === 0 ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">Jornada de assinatura 100% saudável</span>
            </div>
          ) : (
            diagnosis.map((issue, i) => (
              <div key={i} className={`p-4 rounded-lg border-l-4 ${
                issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                issue.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-bold">{issue.type}</span>
                    </div>
                    <div className="text-xs text-gray-700 mb-2">{issue.description}</div>
                    <div className="text-xs text-gray-600">
                      <strong>Fix:</strong> {issue.fix}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    issue.severity === 'critical' ? 'bg-red-200 text-red-900' :
                    issue.severity === 'high' ? 'bg-orange-200 text-orange-900' :
                    'bg-yellow-200 text-yellow-900'
                  }`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}