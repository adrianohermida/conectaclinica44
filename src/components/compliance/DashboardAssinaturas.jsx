import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileSignature, CheckCircle2, Clock, XCircle, AlertCircle, Loader2, Building2, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DashboardAssinaturas() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["assinaturas-digitais"],
    queryFn: () => base44.entities.AssinaturaDigitalLog.list("-created_date", 100),
    staleTime: 30 * 1000
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-assinaturas"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarClinicas', {});
      return res.data.clinicas || [];
    }
  });

  // Métricas
  const metricas = useMemo(() => {
    const total = logs.length;
    const assinados = logs.filter(l => l.status === 'assinado').length;
    const pendentes = logs.filter(l => l.status === 'enviado').length;
    const rejeitados = logs.filter(l => l.status === 'rejeitado').length;
    const falhados = logs.filter(l => l.status === 'erro').length;

    const taxaSucesso = total > 0 ? ((assinados / total) * 100).toFixed(1) : 0;
    const taxaRejeicao = total > 0 ? ((rejeitados / total) * 100).toFixed(1) : 0;

    const creditosConsumidos = logs.reduce((acc, l) => acc + (l.credito_utilizado || 0), 0);

    // Tempo médio até assinatura
    const assinadosComTempo = logs.filter(l => 
      l.status === 'assinado' && l.data_conclusao && l.created_date
    );
    
    const tempoMedioHoras = assinadosComTempo.length > 0
      ? assinadosComTempo.reduce((acc, l) => {
          const inicio = new Date(l.created_date);
          const fim = new Date(l.data_conclusao);
          const horas = (fim - inicio) / (1000 * 60 * 60);
          return acc + horas;
        }, 0) / assinadosComTempo.length
      : 0;

    return {
      total,
      assinados,
      pendentes,
      rejeitados,
      falhados,
      taxaSucesso,
      taxaRejeicao,
      creditosConsumidos,
      tempoMedioHoras: tempoMedioHoras.toFixed(1)
    };
  }, [logs]);

  const statusConfig = {
    'assinado': { icon: CheckCircle2, color: '#34a853', bg: '#e6f7ed', label: 'Assinado' },
    'enviado': { icon: Clock, color: '#fbbc04', bg: '#fef9e5', label: 'Aguardando' },
    'rejeitado': { icon: XCircle, color: '#ea4335', bg: '#fef2f2', label: 'Rejeitado' },
    'erro': { icon: AlertCircle, color: '#5f6368', bg: '#f8f9fa', label: 'Erro' }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">Taxa Sucesso</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{metricas.taxaSucesso}%</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.assinados} assinados</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5" style={{ color: '#fbbc04' }} />
            <p className="text-xs text-gray-500">Pendentes</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{metricas.pendentes}</p>
          <p className="text-xs text-gray-500 mt-1">Aguardando assinatura</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <FileSignature className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <p className="text-xs text-gray-500">Créditos Usados</p>
          </div>
          <p className="text-3xl font-bold text-purple-600">{metricas.creditosConsumidos}</p>
          <p className="text-xs text-gray-500 mt-1">Total consumido</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5" style={{ color: '#0B7A9E' }} />
            <p className="text-xs text-gray-500">Tempo Médio</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{metricas.tempoMedioHoras}h</p>
          <p className="text-xs text-gray-500 mt-1">Até assinatura completa</p>
        </div>
      </div>

      {/* Lista de Assinaturas */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">Histórico de Assinaturas</h3>
        
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border" style={{ borderColor: '#e8eaed' }}>
            <FileSignature className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">Nenhuma assinatura digital registrada</p>
          </div>
        ) : (
          logs.map(log => {
            const status = statusConfig[log.status] || statusConfig.erro;
            const StatusIcon = status.icon;
            const clinica = clinicas.find(c => c.id === log.clinica_id);

            return (
              <div key={log.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: status.bg }}>
                    <StatusIcon className="w-6 h-6" style={{ color: status.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900">{log.documento_nome}</h4>
                        <p className="text-sm text-gray-600">
                          {clinica?.nome || log.clinica_id.substring(0, 12)} · {log.documento_tipo}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0" style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>

                    {/* Signatários */}
                    <div className="mt-3 space-y-2">
                      {log.signatarios?.map((sig, idx) => {
                        const sigStatus = sig.status === 'assinado' ? '✅' : sig.status === 'pendente' ? '⏳' : '❌';
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span>{sigStatus}</span>
                            <span className="text-gray-700">{sig.nome}</span>
                            <span className="text-gray-500">({sig.email})</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ações */}
                    <div className="mt-4 flex gap-3">
                      {log.arquivo_assinado_url && (
                        <a
                          href={log.arquivo_assinado_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                          style={{ backgroundColor: '#34a853' }}
                        >
                          <Download className="w-4 h-4" />
                          Baixar Assinado
                        </a>
                      )}
                      <a
                        href={`https://app.autentique.com.br/documentos/${log.authentique_document_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border"
                      >
                        <Eye className="w-4 h-4" />
                        Ver no Authentique
                      </a>
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-4 text-xs text-gray-500" style={{ borderColor: '#e8eaed' }}>
                      <span>📅 {format(new Date(log.created_date), "dd/MM/yy HH:mm")}</span>
                      {log.data_conclusao && (
                        <span>✅ Concluído em {format(new Date(log.data_conclusao), "dd/MM/yy HH:mm")}</span>
                      )}
                      <span>💳 {log.credito_utilizado} crédito(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}