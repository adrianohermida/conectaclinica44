import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Eye, Edit3, Trash2, Download, Share2, X, Clock, User, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * AUDIT LOG PANEL - LGPD Art. 37
 * Rastreabilidade completa de acessos e modificações
 */
export default function AuditLogPanel({ item, onClose }) {
  const isPasta = !item.arquivo_url;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', item.id],
    queryFn: async () => {
      const logs = await base44.entities.LogAuditoria.filter({
        recurso_id: item.id,
        recurso_tipo: isPasta ? 'pasta' : 'documento'
      }, '-created_date', 100);
      return logs;
    },
    staleTime: 30 * 1000
  });

  const getActionIcon = (acao) => {
    const icons = {
      'view': Eye,
      'visualizar': Eye,
      'edit': Edit3,
      'editar': Edit3,
      'delete': Trash2,
      'excluir': Trash2,
      'download': Download,
      'compartilhar': Share2
    };
    return icons[acao] || Shield;
  };

  const getActionColor = (acao) => {
    const colors = {
      'view': 'text-blue-600 bg-blue-50',
      'visualizar': 'text-blue-600 bg-blue-50',
      'edit': 'text-yellow-600 bg-yellow-50',
      'editar': 'text-yellow-600 bg-yellow-50',
      'delete': 'text-red-600 bg-red-50',
      'excluir': 'text-red-600 bg-red-50',
      'download': 'text-green-600 bg-green-50',
      'compartilhar': 'text-purple-600 bg-purple-50'
    };
    return colors[acao] || 'text-gray-600 bg-gray-50';
  };

  const formatarData = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Logs de Auditoria</h3>
                <p className="text-sm text-gray-600">{item.nome || item.titulo}</p>
              </div>
            </div>
            <Button size="sm" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* LGPD Badge */}
          <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">
              <strong>Conformidade LGPD Art. 37:</strong> Todos os acessos e modificações são registrados automaticamente com timestamp, usuário, IP e ação executada.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Nenhum log de acesso registrado</p>
              <p className="text-sm text-gray-500 mt-2">Os logs aparecerão aqui conforme o documento for acessado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const Icon = getActionIcon(log.acao);
                const colorClass = getActionColor(log.acao);

                return (
                  <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{log.usuario_nome || log.usuario_email}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                              {log.acao}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{log.usuario_email}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatarData(log.created_date)}
                            </span>
                            {log.ip_address && (
                              <span className="flex items-center gap-1">
                                <Monitor className="w-3 h-3" />
                                IP: {log.ip_address}
                              </span>
                            )}
                          </div>
                          {log.user_agent && (
                            <p className="text-xs text-gray-400 mt-1 truncate" title={log.user_agent}>
                              {log.user_agent}
                            </p>
                          )}
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              log.resultado === 'permitido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.resultado === 'permitido' ? '✓ Permitido' : '✗ Bloqueado'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              <p className="text-xs text-gray-600">Total de Acessos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.resultado === 'permitido').length}
              </p>
              <p className="text-xs text-gray-600">Permitidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.resultado === 'bloqueado' || l.resultado === 'negado').length}
              </p>
              <p className="text-xs text-gray-600">Bloqueados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}