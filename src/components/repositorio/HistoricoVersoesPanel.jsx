import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, X, Download, RotateCcw, User, FileText, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * HISTÓRICO DE VERSÕES - Compliance & Rollback
 * Salva snapshot de cada edição/substituição
 */
export default function HistoricoVersoesPanel({ documento, onClose }) {
  const queryClient = useQueryClient();
  const [comparing, setComparing] = useState(null);

  const { data: versoes = [], isLoading } = useQuery({
    queryKey: ['historico-versoes', documento.id],
    queryFn: async () => {
      return await base44.entities.HistoricoVersaoDocumento.filter(
        { documento_id: documento.id },
        '-numero_versao',
        50
      );
    }
  });

  const restaurarVersaoMutation = useMutation({
    mutationFn: async (versao) => {
      // Salvar versão atual ANTES de restaurar
      await base44.entities.HistoricoVersaoDocumento.create({
        documento_id: documento.id,
        numero_versao: (documento.versao || 1) + 1,
        titulo: documento.titulo,
        arquivo_url: documento.arquivo_url,
        tipo_arquivo: documento.tipo_arquivo,
        tamanho_bytes: documento.tamanho_bytes,
        hash_sha256: documento.hash_sha256,
        tipo_alteracao: 'substituicao_arquivo',
        alterado_por: (await base44.auth.me()).email,
        alterado_por_nome: (await base44.auth.me()).full_name,
        observacao: `Backup antes de restaurar v${versao.numero_versao}`
      });

      // Restaurar versão anterior
      await base44.entities.DocumentoCompliance.update(documento.id, {
        arquivo_url: versao.arquivo_url,
        titulo: versao.titulo,
        tipo_arquivo: versao.tipo_arquivo,
        tamanho_bytes: versao.tamanho_bytes,
        hash_sha256: versao.hash_sha256,
        versao: (documento.versao || 1) + 1
      });
    },
    onSuccess: (_, versao) => {
      queryClient.invalidateQueries(['compliance-docs']);
      queryClient.invalidateQueries(['historico-versoes', documento.id]);
      toast.success(`✅ Versão ${versao.numero_versao} restaurada`);
      onClose();
    }
  });

  const formatarData = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoAlteracaoLabel = (tipo) => {
    const labels = {
      'criacao': 'Criação inicial',
      'edicao_conteudo': 'Edição de conteúdo',
      'edicao_metadata': 'Edição de metadados',
      'substituicao_arquivo': 'Substituição de arquivo'
    };
    return labels[tipo] || tipo;
  };

  const getTipoAlteracaoColor = (tipo) => {
    const colors = {
      'criacao': 'bg-green-100 text-green-700',
      'edicao_conteudo': 'bg-blue-100 text-blue-700',
      'edicao_metadata': 'bg-yellow-100 text-yellow-700',
      'substituicao_arquivo': 'bg-purple-100 text-purple-700'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Histórico de Versões</h3>
                <p className="text-sm text-gray-600">{documento.titulo}</p>
              </div>
            </div>
            <Button size="sm" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Info Badge */}
          <div className="mt-4 bg-purple-100 border border-purple-300 rounded-lg p-3 flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-900">
              <strong>Versão atual: {documento.versao || 1}</strong> • Todas as edições e substituições são salvas automaticamente. Você pode restaurar qualquer versão anterior.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando histórico...</p>
            </div>
          ) : versoes.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Nenhuma versão anterior salva</p>
              <p className="text-sm text-gray-500 mt-2">O histórico aparecerá aqui após editar o documento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Versão ATUAL (não está no histórico ainda) */}
              <div className="border-2 border-purple-400 rounded-lg p-4 bg-purple-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                      {documento.versao || 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-purple-900">{documento.titulo}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-600 text-white">
                          ATUAL
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Última modificação: {formatarData(documento.updated_date)}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{documento.tipo_arquivo?.toUpperCase()}</span>
                        <span>•</span>
                        <span>{(documento.tamanho_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(documento.arquivo_url, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Versões anteriores */}
              {versoes.map((versao) => (
                <div key={versao.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-bold">
                        {versao.numero_versao}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900">{versao.titulo}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTipoAlteracaoColor(versao.tipo_alteracao)}`}>
                            {getTipoAlteracaoLabel(versao.tipo_alteracao)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <User className="w-3 h-3" />
                          <span>{versao.alterado_por_nome || versao.alterado_por}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatarData(versao.created_date)}
                        </div>
                        {versao.observacao && (
                          <p className="text-xs text-gray-500 mt-2 italic">"{versao.observacao}"</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{versao.tipo_arquivo?.toUpperCase()}</span>
                          <span>•</span>
                          <span>{(versao.tamanho_bytes / 1024).toFixed(1)} KB</span>
                          {versao.hash_sha256 && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{versao.hash_sha256.substring(0, 8)}...</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(versao.arquivo_url, '_blank')}
                        title="Visualizar esta versão"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Restaurar para a versão ${versao.numero_versao}?\n\nA versão atual será salva no histórico.`)) {
                            restaurarVersaoMutation.mutate(versao);
                          }
                        }}
                        disabled={restaurarVersaoMutation.isPending}
                        title="Restaurar esta versão"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{(versoes.length || 0) + 1}</p>
              <p className="text-xs text-gray-600">Total de Versões</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{documento.versao || 1}</p>
              <p className="text-xs text-gray-600">Versão Atual</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{versoes.length || 0}</p>
              <p className="text-xs text-gray-600">Versões Anteriores</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}