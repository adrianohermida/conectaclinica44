import React from "react";
import { 
  Activity, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Key,
  XCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function DashboardStatus({ 
  conectores = [], 
  incidentes = [], 
  precificacoes = [],
  testes = [],
  secrets = []
}) {
  const hoje = new Date();

  // Estatísticas de conectores
  const conectoresAtivos = conectores.filter(c => c.ativo).length;
  const conectoresInativos = conectores.length - conectoresAtivos;

  // Incidentes por severidade
  const incidentesPorSeveridade = {
    critica: incidentes.filter(i => i.severidade === "critica").length,
    alta: incidentes.filter(i => i.severidade === "alta").length,
    media: incidentes.filter(i => i.severidade === "media").length,
    baixa: incidentes.filter(i => i.severidade === "baixa").length
  };

  // Custo mensal total
  const custoMensal = precificacoes.reduce((acc, p) => acc + (p.projecao_fim_mes || 0), 0);

  // Taxa de sucesso média dos testes
  const taxaSucessoMedia = testes.length > 0
    ? (testes.reduce((acc, t) => acc + (t.taxa_sucesso || 0), 0) / testes.length).toFixed(1)
    : 0;

  // Secrets expirando
  const secretsExpirando = secrets.filter(s => {
    if (!s.data_expiracao || !s.ativo) return false;
    const dias = differenceInDays(new Date(s.data_expiracao), hoje);
    return dias >= 0 && dias <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B7A9E] to-[#58B4D4] rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Status Geral do Sistema</h2>
        <p className="text-blue-50">Visão consolidada de todas as integrações</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Conectores Ativos</p>
              <p className="text-3xl font-bold text-green-600">{conectoresAtivos}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {conectoresInativos} inativo{conectoresInativos !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Incidentes Abertos</p>
              <p className="text-3xl font-bold text-red-600">{incidentes.length}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-red-600">{incidentesPorSeveridade.critica} críticos</span>
            <span className="text-orange-600">{incidentesPorSeveridade.alta} altos</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Projeção Mensal</p>
              <p className="text-2xl font-bold text-purple-600">
                R$ {custoMensal.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Custo estimado</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Taxa Sucesso</p>
              <p className="text-3xl font-bold text-blue-600">{taxaSucessoMedia}%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Média dos testes</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Key className={`w-8 h-8 ${secretsExpirando.length > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            <div>
              <p className="text-sm text-gray-600">Secrets Expirando</p>
              <p className={`text-3xl font-bold ${secretsExpirando.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {secretsExpirando.length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Próximos 30 dias</p>
        </div>
      </div>

      {/* Distribuição de Incidentes */}
      {incidentes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Incidentes por Severidade
          </h3>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700 mb-1">Crítica</p>
              <p className="text-2xl font-bold text-red-700">{incidentesPorSeveridade.critica}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Alta</p>
              <p className="text-2xl font-bold text-orange-700">{incidentesPorSeveridade.alta}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-700 mb-1">Média</p>
              <p className="text-2xl font-bold text-yellow-700">{incidentesPorSeveridade.media}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Baixa</p>
              <p className="text-2xl font-bold text-blue-700">{incidentesPorSeveridade.baixa}</p>
            </div>
          </div>
        </div>
      )}

      {/* Secrets Expirando */}
      {secretsExpirando.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 mb-2">Secrets Expirando em Breve</h3>
              <div className="space-y-2">
                {secretsExpirando.map(s => {
                  const dias = differenceInDays(new Date(s.data_expiracao), hoje);
                  return (
                    <div key={s.id} className="bg-white rounded p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.conector_nome}</p>
                        <p className="text-xs text-gray-600">{s.chave}</p>
                      </div>
                      <span className="text-sm font-bold text-orange-700">{dias} dias</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de Conectores Inativos */}
      {conectoresInativos > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-900">Conectores Inativos</h3>
              <p className="text-sm text-yellow-800">
                {conectoresInativos} conector{conectoresInativos !== 1 ? 'es estão' : ' está'} inativo{conectoresInativos !== 1 ? 's' : ''} e não receberão health checks automáticos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}