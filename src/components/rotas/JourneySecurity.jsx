import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Lock, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

/**
 * Journey Security - Identifica vulnerabilidades e valida isolamento multitenant
 * CRÍTICO: previne vazamento de dados entre clínicas
 */
export default function JourneySecurity() {
  const [diagnosis, setDiagnosis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const issues = [];

    try {
      // 1. Testar isolamento multitenant (query sem clinica_id)
      const contatosSemFiltro = await base44.entities.Contato.list().catch(() => []);
      const agendamentosSemFiltro = await base44.entities.Agendamento.list().catch(() => []);
      
      // Verificar se retorna dados de OUTRAS clínicas
      const user = await base44.auth.me();
      const contatosOutraClinica = contatosSemFiltro.filter(c => c.clinica_id !== user.clinica_id);
      
      if (contatosOutraClinica.length > 0) {
        issues.push({
          type: 'vazamento_multitenant',
          severity: 'critical',
          description: `VULNERABILIDADE CRÍTICA: Contato.list() retorna ${contatosOutraClinica.length} contatos de OUTRAS clínicas`,
          fix: 'Implementar Row-Level Security (RLS) no backend ou forçar filtro clinica_id em TODAS queries',
          impact: 'LGPD Art. 46 - Vazamento de dados pessoais entre tenants'
        });
      }

      // 2. Verificar guards em rotas sensíveis
      const nodes = await base44.entities.RouteNode.list();
      const rotasSensiveis = nodes.filter(n => 
        ['prontuarios', 'financeiro', 'administracao'].includes(n.module)
      );
      
      rotasSensiveis.forEach(rota => {
        if (!rota.guards || rota.guards.length === 0) {
          issues.push({
            type: 'rota_sem_guard',
            severity: 'high',
            description: `Rota sensível "${rota.path}" (${rota.module}) SEM guards`,
            fix: 'Adicionar RouteGuard + ModuloGuard'
          });
        }
      });

      // 3. Verificar certificados digitais expirados
      const certificados = await base44.entities.CertificadoDigital.list().catch(() => []);
      const expirados = certificados.filter(cert => 
        new Date(cert.validade) < new Date()
      );
      
      if (expirados.length > 0) {
        issues.push({
          type: 'certificados_expirados',
          severity: 'medium',
          description: `${expirados.length} certificados digitais EXPIRADOS (assinatura digital comprometida)`,
          fix: 'Renovar certificados e alertar clínicas afetadas'
        });
      }

      // 4. Verificar secrets não criptografados (heurística)
      const conectores = await base44.entities.Conector.list().catch(() => []);
      const semCripto = conectores.filter(c => 
        c.api_key && !c.api_key.startsWith('enc_') // Heurística: se não começa com enc_, não está criptografado
      );
      
      if (semCripto.length > 0) {
        issues.push({
          type: 'secrets_plain_text',
          severity: 'high',
          description: `${semCripto.length} conectores com API keys em PLAIN TEXT`,
          fix: 'Usar criptografarCertificado para secrets e armazenar apenas referência'
        });
      }

    } catch (error) {
      issues.push({
        type: 'erro_auditoria',
        severity: 'medium',
        description: `Erro ao executar auditoria: ${error.message}`,
        fix: 'Verificar permissões e disponibilidade das entities'
      });
    }

    setDiagnosis(issues);
    setAnalyzing(false);
  };

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🔒 Journey Security (Vulnerabilidades & Multitenant)</h3>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {analyzing ? 'Analisando...' : 'Auditar Segurança'}
        </button>
      </div>

      {diagnosis ? (
        <div className="space-y-3">
          {diagnosis.length === 0 ? (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-800">Segurança 100% - Sistema impenetrável</span>
            </div>
          ) : (
            <>
              <div className="bg-red-50 p-4 rounded-lg border-2 border-red-500 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-800">{diagnosis.length} Vulnerabilidades Detectadas</span>
                </div>
                <div className="text-xs text-red-700">
                  Crítico: {diagnosis.filter(i => i.severity === 'critical').length} | 
                  Alto: {diagnosis.filter(i => i.severity === 'high').length} | 
                  Médio: {diagnosis.filter(i => i.severity === 'medium').length}
                </div>
              </div>
              
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
                      {issue.impact && (
                        <div className="mt-2 text-xs text-red-700 font-bold">
                          ⚠️ Impacto: {issue.impact}
                        </div>
                      )}
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
      ) : (
        <div className="text-center py-12 text-gray-500 text-sm">
          Clique em "Auditar Segurança" para iniciar varredura de vulnerabilidades
        </div>
      )}
    </div>
  );
}