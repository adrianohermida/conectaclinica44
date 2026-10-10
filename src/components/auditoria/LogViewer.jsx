import React, { useMemo } from "react";
import { Shield, User, Calendar, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LogViewer({ logs }) {
  const logsPorTipo = useMemo(() => {
    const tipos = {};
    logs.forEach(log => {
      if (!tipos[log.acao]) tipos[log.acao] = 0;
      tipos[log.acao]++;
    });
    return tipos;
  }, [logs]);

  const logsPorUsuario = useMemo(() => {
    const usuarios = {};
    logs.forEach(log => {
      if (!usuarios[log.usuario_email]) usuarios[log.usuario_email] = 0;
      usuarios[log.usuario_email]++;
    });
    return Object.entries(usuarios).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Shield className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-xs text-gray-600">Total de Eventos</p>
          <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <User className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-xs text-gray-600">Usuários Únicos</p>
          <p className="text-2xl font-bold text-gray-800">{logsPorUsuario.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <FileText className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-xs text-gray-600">Criações</p>
          <p className="text-2xl font-bold text-gray-800">{logsPorTipo.criar || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Eye className="w-6 h-6 text-orange-600 mb-2" />
          <p className="text-xs text-gray-600">Visualizações</p>
          <p className="text-2xl font-bold text-gray-800">{logsPorTipo.visualizar || 0}</p>
        </div>
      </div>

      {/* Top Usuários */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Top 5 Usuários Mais Ativos</h3>
        <div className="space-y-2">
          {logsPorUsuario.map(([email, count], idx) => (
            <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                <span className="text-sm text-gray-700">{email}</span>
              </div>
              <span className="text-sm font-bold text-[#0B7A9E]">{count} ações</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Recentes */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Últimas Atividades</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {logs.slice(0, 50).map((log, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.acao === "criar" ? "bg-green-100 text-green-700" :
                      log.acao === "atualizar" ? "bg-blue-100 text-blue-700" :
                      log.acao === "deletar" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {log.acao}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{log.entidade}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {log.usuario_email} • {format(new Date(log.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                  {log.dados_alterados && (
                    <p className="text-xs text-gray-500 mt-1">
                      Campos: {Object.keys(log.dados_alterados).join(", ")}
                    </p>
                  )}
                </div>
                {log.ip_origem && (
                  <span className="text-xs text-gray-400">{log.ip_origem}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}