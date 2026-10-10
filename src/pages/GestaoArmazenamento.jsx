import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { 
  Database, HardDrive, Trash2, Zap, RefreshCw, 
  AlertTriangle, CheckCircle2, Package, TrendingDown, Download, Loader2 
} from "lucide-react";
import { toast } from "sonner";

export default function GestaoArmazenamento() {
  const queryClient = useQueryClient();
  const [executandoLimpeza, setExecutandoLimpeza] = useState(false);
  const [exportandoBackup, setExportandoBackup] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: usageData, isLoading: loadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ['storage-usage-real'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getStorageUsageReal', {});
      return response.data;
    },
    staleTime: 60000
  });

  const { data: documentos = [] } = useQuery({
    queryKey: ['all-docs-storage'],
    queryFn: async () => {
      return await base44.entities.DocumentoCompliance.list('-tamanho_bytes', 500);
    },
    staleTime: 60000
  });

  const analisarDuplicatasMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('limparDuplicatas', { 
        dias_antigos: 90,
        dry_run: true 
      });
    },
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`📊 ${data.total_duplicatas} duplicatas (${data.mb_recuperados} MB recuperáveis)`);
    }
  });

  const executarLimpezaMutation = useMutation({
    mutationFn: async (diasAntigos) => {
      return await base44.functions.invoke('limparDuplicatas', { 
        dias_antigos: diasAntigos,
        dry_run: false 
      });
    },
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`✅ ${data.deletados} duplicatas removidas! ${data.mb_recuperados} MB liberados`);
      queryClient.invalidateQueries(['storage-usage-real']);
      queryClient.invalidateQueries(['all-docs-storage']);
      setExecutandoLimpeza(false);
    }
  });

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageColorBg = (percent) => {
    if (percent >= 90) return '#ef4444';
    if (percent >= 70) return '#f59e0b';
    return '#34a853';
  };

  if (loadingUsage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#7E57FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Armazenamento"
        description="Monitore uso, otimize espaço e remova duplicatas"
        icon={Database}
      />

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <HardDrive className="w-8 h-8 text-[#7E57FF]" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchUsage()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold" style={{ color: getUsageColorBg(usageData?.percent_used || 0) }}>
              {usageData?.percent_used || 0}%
            </p>
            <p className="text-sm text-gray-600">
              {usageData?.used_gb || 0} GB de {usageData?.limit_gb || 5} GB
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(usageData?.percent_used || 0, 100)}%`,
                  backgroundColor: getUsageColorBg(usageData?.percent_used || 0)
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <Package className="w-8 h-8 text-blue-600 mb-4" />
          <p className="text-2xl font-bold text-gray-900">
            {documentos.length}
          </p>
          <p className="text-sm text-gray-600">Documentos totais</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <TrendingDown className="w-8 h-8 text-green-600 mb-4" />
          <p className="text-2xl font-bold text-gray-900">
            {((usageData?.limit_gb || 5) - (usageData?.used_gb || 0)).toFixed(2)} GB
          </p>
          <p className="text-sm text-gray-600">Espaço livre</p>
        </div>
      </div>

      {/* Alertas */}
      {usageData?.percent_used >= 90 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-1">
              Limite Crítico Atingido!
            </p>
            <p className="text-sm text-red-700">
              Apenas {(100 - usageData.percent_used).toFixed(1)}% disponível. 
              Execute limpeza de duplicatas ou aumente seu plano.
            </p>
          </div>
        </div>
      )}

      {usageData?.percent_used >= 70 && usageData?.percent_used < 90 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900 mb-1">
              Atenção: Espaço em Alerta
            </p>
            <p className="text-sm text-yellow-700">
              {(100 - usageData.percent_used).toFixed(1)}% disponível. 
              Considere executar limpeza preventiva.
            </p>
          </div>
        </div>
      )}

      {/* Breakdown por tipo de arquivo */}
      {usageData?.breakdown && usageData.breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#7E57FF]" />
            Breakdown por Tipo de Arquivo
          </h3>
          <div className="space-y-3">
            {usageData.breakdown.map((item, idx) => (
              <div key={item.tipo} className="flex items-center gap-3">
                <div className="w-8 text-center">
                  <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 uppercase">
                      {item.tipo}
                    </span>
                    <span className="text-sm text-gray-600">
                      {item.mb} MB ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: '#7E57FF'
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.count} arquivo{item.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ferramentas de Otimização */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Ferramentas de Otimização
        </h3>

        <div className="space-y-4">
          {/* Analisar Duplicatas */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Limpar Duplicatas
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Remove arquivos duplicados antigos ({'>'}90 dias) baseado em hash SHA-256.
                Mantém o documento mais antigo.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analisarDuplicatasMutation.mutate()}
                  disabled={analisarDuplicatasMutation.isPending}
                  className="gap-2"
                >
                  {analisarDuplicatasMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  Analisar
                </Button>
                {analisarDuplicatasMutation.data && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Executar limpeza e remover ${analisarDuplicatasMutation.data.data.total_duplicatas} duplicatas?`)) {
                        executarLimpezaMutation.mutate(90);
                      }
                    }}
                    disabled={executarLimpezaMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 gap-2"
                  >
                    {executarLimpezaMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Executar Limpeza
                  </Button>
                )}
              </div>
              {analisarDuplicatasMutation.data && (
                <div className="mt-3 bg-white border border-gray-200 rounded p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Resultado da Análise:</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Duplicatas:</p>
                      <p className="font-bold text-gray-900">{analisarDuplicatasMutation.data.data.total_duplicatas}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Espaço recuperável:</p>
                      <p className="font-bold text-green-600">{analisarDuplicatasMutation.data.data.mb_recuperados} MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compressão Automática - INFO */}
          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Compressão Automática ATIVA
              </h4>
              <p className="text-sm text-gray-600">
                Imagens são automaticamente comprimidas para WebP (85% qualidade) no upload. 
                Economia média: 60-80% por imagem.
              </p>
            </div>
          </div>

          {/* Thumbnails - INFO */}
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Thumbnails Automáticos
              </h4>
              <p className="text-sm text-gray-600">
                Miniaturas (200px) geradas automaticamente para visualização em grid. 
                Reduz bandwidth em 95%.
              </p>
            </div>
          </div>

          {/* LGPD Art. 18: Export Backup Completo */}
          <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <Database className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                Backup Completo da Clínica
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">LGPD Art. 18</span>
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Exporta TODOS os dados da clínica em JSON (pacientes, prontuários, documentos, tickets, vendas). 
                Link temporário válido por 24h enviado por email.
              </p>
              <Button
                onClick={async () => {
                  if (!user?.clinica_id) {
                    toast.error('Clínica não identificada');
                    return;
                  }

                  setExportandoBackup(true);
                  try {
                    const response = await base44.functions.invoke('exportarBackupClinica', {
                      clinica_id: user.clinica_id
                    });

                    if (response.data.success) {
                      toast.success('✅ Backup gerado!', {
                        description: `${response.data.tamanho_mb}MB • ${response.data.total_registros} registros • Email enviado`
                      });
                    } else {
                      toast.error('Erro: ' + (response.data.error || 'Desconhecido'));
                    }
                  } catch (error) {
                    toast.error('Erro ao exportar: ' + error.message);
                  } finally {
                    setExportandoBackup(false);
                  }
                }}
                disabled={exportandoBackup}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                {exportandoBackup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando... (10-30s)
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Gerar Backup Agora
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Arquivos Pesados */}
      {documentos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#7E57FF]" />
            Top 10 Arquivos Mais Pesados
          </h3>
          <div className="space-y-2">
            {documentos.slice(0, 10).map((doc, idx) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.titulo}</p>
                  <p className="text-xs text-gray-500 uppercase">{doc.tipo_arquivo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {(doc.tamanho_bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500">
                    {((doc.tamanho_bytes / (usageData?.used_bytes || 1)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}