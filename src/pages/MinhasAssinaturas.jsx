import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { 
  FileSignature, Clock, CheckCircle2, XCircle, Download, 
  ExternalLink, RefreshCw, User, Calendar, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { toast } from "sonner";

export default function MinhasAssinaturas() {
  const [polling, setPolling] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['assinaturas-digitais'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.AssinaturaDigitalLog.filter(
        { clinica_id: user.clinica_id },
        '-created_date',
        100
      );
    },
    refetchInterval: 30000 // Polling 30s
  });

  // Polling manual para documentos pendentes
  useEffect(() => {
    const pendentes = logs.filter(l => l.status === 'enviado' || l.status === 'assinando');
    if (pendentes.length > 0 && !polling) {
      setPolling(true);
      const interval = setInterval(() => {
        refetch();
      }, 10000); // 10s para docs pendentes
      return () => clearInterval(interval);
    } else if (pendentes.length === 0) {
      setPolling(false);
    }
  }, [logs, polling, refetch]);

  const handleDownload = async (log) => {
    if (!log.arquivo_assinado_url) {
      toast.error("PDF assinado ainda não disponível");
      return;
    }

    try {
      const response = await base44.functions.invoke('baixarPDFAssinado', {
        file_uri: log.arquivo_assinado_url
      });

      window.open(response.data.signed_url, '_blank');
      toast.success("Download iniciado!");
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const statusConfig = {
    enviado: { 
      label: 'Aguardando', 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Clock 
    },
    assinando: { 
      label: 'Em Assinatura', 
      color: 'bg-blue-100 text-blue-800', 
      icon: FileSignature 
    },
    concluido: { 
      label: 'Concluído', 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle2 
    },
    cancelado: { 
      label: 'Cancelado', 
      color: 'bg-red-100 text-red-800', 
      icon: XCircle 
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7E57FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Assinaturas Digitais"
        description="Acompanhe o status de documentos enviados para assinatura eletrônica"
        icon={FileSignature}
      />

      {polling && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Monitoramento ativo
            </p>
            <p className="text-xs text-blue-700">
              Atualizando automaticamente a cada 10 segundos
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {logs.length} {logs.length === 1 ? 'documento' : 'documentos'}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileSignature className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma assinatura ainda
          </h3>
          <p className="text-gray-600">
            Envie documentos PDF para assinatura digital pelo Repositório
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => {
            const config = statusConfig[log.status] || statusConfig.enviado;
            const StatusIcon = config.icon;

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#7E57FF] transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileSignature className="w-5 h-5 text-[#7E57FF]" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {log.documento_nome}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {moment(log.created_date).format('DD/MM/YYYY HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {log.signatarios?.length || 0} signatário(s)
                      </div>
                    </div>
                  </div>
                  <Badge className={`${config.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </Badge>
                </div>

                {/* Signatários */}
                {log.signatarios && log.signatarios.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                      Signatários
                    </p>
                    <div className="space-y-2">
                      {log.signatarios.map((sig, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between bg-white rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {sig.nome}
                            </p>
                            <p className="text-xs text-gray-600">{sig.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sig.status === 'assinado' ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Assinado
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                            {sig.link_assinatura && sig.status !== 'assinado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(sig.link_assinatura, '_blank')}
                                className="h-7 text-xs"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    ID: {log.authentique_document_id?.slice(0, 8)}...
                  </div>
                  <div className="flex gap-2">
                    {log.status === 'concluido' && log.arquivo_assinado_url && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(log)}
                        className="bg-[#7E57FF] hover:bg-[#6d28d9] gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar PDF Assinado
                      </Button>
                    )}
                    {(log.status === 'enviado' || log.status === 'assinando') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Verificar Status
                      </Button>
                    )}
                  </div>
                </div>

                {/* Alerta de conclusão */}
                {log.status === 'concluido' && log.data_conclusao && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-800">
                      Concluído em {moment(log.data_conclusao).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}