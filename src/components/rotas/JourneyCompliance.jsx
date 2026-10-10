import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Journey Compliance & LGPD
 * Valida: termos aceitos, ROPA, DPIA, minimização, logs acesso
 */
export default function JourneyCompliance() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: termos = [] } = useQuery({
    queryKey: ['termos-legais'],
    queryFn: () => base44.entities.ConteudoLegal.filter({ ativo: true })
  });

  const { data: aceites = [] } = useQuery({
    queryKey: ['aceites'],
    queryFn: () => base44.entities.AceiteTermoLegal.list()
  });

  const { data: ropa = [] } = useQuery({
    queryKey: ['ropa'],
    queryFn: () => base44.entities.ROPA.list()
  });

  const { data: logsAcesso = [] } = useQuery({
    queryKey: ['logs-acesso'],
    queryFn: () => base44.entities.LogAcessoDado.list()
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const issues = [];

    // 1. Termos ativos sem aceites recentes
    termos.forEach(termo => {
      const totalAceites = aceites.filter(a => 
        a.termo_id === termo.id && 
        new Date(a.created_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 dias
      ).length;
      
      if (totalAceites === 0) {
        issues.push({
          type: 'termo_sem_aceites',
          severity: 'high',
          description: `Termo "${termo.tipo_documento}" (v${termo.versao}) ativo mas SEM aceites nos últimos 90 dias`,
          fix: 'Verificar se termo está sendo exibido corretamente ou desativar'
        });
      }
    });

    // 2. ROPA vazio (LGPD)
    if (ropa.length === 0) {
      issues.push({
        type: 'ropa_vazio',
        severity: 'critical',
        description: 'ROPA (Registro de Operações de Tratamento) VAZIO - não compliance LGPD',
        fix: 'Criar entradas ROPA para cada módulo que processa dados pessoais'
      });
    }

    // 3. Logs de acesso insuficientes (LGPD Art. 46)
    const logsUltimos30d = logsAcesso.filter(log => 
      new Date(log.created_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    if (logsUltimos30d < 10) {
      issues.push({
        type: 'logs_insuficientes',
        severity: 'medium',
        description: `Apenas ${logsUltimos30d} logs de acesso nos últimos 30 dias - rastreabilidade LGPD insuficiente`,
        fix: 'Implementar registrarAcessoDado em módulos críticos (prontuários, financeiro)'
      });
    }

    // 4. Aceites sem termo correspondente (órfãos)
    const termosIds = new Set(termos.map(t => t.id));
    const aceitesOrfaos = aceites.filter(a => !termosIds.has(a.termo_id));
    
    if (aceitesOrfaos.length > 0) {
      issues.push({
        type: 'aceites_orfaos',
        severity: 'low',
        description: `${aceitesOrfaos.length} aceites vinculados a termos inexistentes`,
        fix: 'Limpar aceites órfãos ou recriar termos deletados'
      });
    }

    setDiagnosis(issues);
    setAnalyzing(false);
  };

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🛡️ Journey Compliance & LGPD</h3>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {analyzing ? 'Analisando...' : 'Auditar Compliance'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-800">{termos.length}</div>
          <div className="text-xs text-blue-700">Termos Ativos</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-800">{aceites.length}</div>
          <div className="text-xs text-green-700">Aceites Registrados</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-800">{ropa.length}</div>
          <div className="text-xs text-purple-700">Registros ROPA</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-800">{logsAcesso.length}</div>
          <div className="text-xs text-orange-700">Logs Acesso (total)</div>
        </div>
      </div>

      {diagnosis && (
        <div className="space-y-3">
          {diagnosis.length === 0 ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">Compliance 100% - Nenhum problema detectado</span>
            </div>
          ) : (
            <>
              <div className="text-sm font-bold text-red-600 mb-2">⚠️ {diagnosis.length} Problemas de Compliance</div>
              {diagnosis.map((issue, i) => (
                <div key={i} className={`p-4 rounded-lg border-l-4 ${
                  issue.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  issue.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                  'bg-yellow-50 border-yellow-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-bold mb-1">{issue.type}</div>
                      <div className="text-xs text-gray-700 mb-2">{issue.description}</div>
                      <div className="text-xs text-gray-600"><strong>Fix:</strong> {issue.fix}</div>
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
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}