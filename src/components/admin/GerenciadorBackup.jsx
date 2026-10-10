import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Play, Clock, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function GerenciadorBackup() {
  const [executando, setExecutando] = useState(false);
  const queryClient = useQueryClient();

  const { data: config = [], isLoading } = useQuery({
    queryKey: ["config-backup"],
    queryFn: () => base44.entities.ConfiguracaoBackup.list(),
    staleTime: 60 * 1000
  });

  const configuracao = config[0] || {};

  const executarBackup = async () => {
    setExecutando(true);
    try {
      const response = await base44.functions.invoke('backupAutomatico', { manual: true });
      
      if (response.data.success) {
        alert(`✅ Backup realizado com sucesso!\n\n${response.data.total_registros} registros salvos`);
        
        // Atualizar config
        if (configuracao.id) {
          await base44.entities.ConfiguracaoBackup.update(configuracao.id, {
            ...configuracao,
            ultimo_backup: new Date().toISOString(),
            status_ultimo: "sucesso",
            total_backups_realizados: (configuracao.total_backups_realizados || 0) + 1
          });
        }
        
        queryClient.invalidateQueries(["config-backup"]);
      }
    } catch (e) {
      alert("Erro ao executar backup");
    } finally {
      setExecutando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-bold text-gray-800">Backup Automático</h3>
              <p className="text-sm text-gray-600">Proteção de dados do sistema</p>
            </div>
          </div>
          <button
            onClick={executarBackup}
            disabled={executando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {executando ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Executar Agora
              </>
            )}
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Último Backup</p>
            <p className="text-sm font-medium text-gray-800">
              {configuracao.ultimo_backup 
                ? format(new Date(configuracao.ultimo_backup), "dd/MM/yy HH:mm")
                : "Nunca executado"
              }
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              {configuracao.status_ultimo === "sucesso" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Sucesso</span>
                </>
              ) : configuracao.status_ultimo === "erro" ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Erro</span>
                </>
              ) : (
                <span className="text-sm font-medium text-gray-600">-</span>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Executados</p>
            <p className="text-sm font-medium text-gray-800">
              {configuracao.total_backups_realizados || 0}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <p className="text-sm text-green-800">
          💡 <strong>Dica:</strong> Configure um cron job para executar esta função diariamente às 3h da manhã.
          Use o endpoint da função para automação.
        </p>
      </div>
    </div>
  );
}