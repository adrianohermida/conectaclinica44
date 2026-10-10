import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, Edit, Trash2, Download, Mail, FileSpreadsheet, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICONES_ACAO = {
  criar: { icon: Edit, cor: "bg-green-100 text-green-600" },
  editar: { icon: Edit, cor: "bg-blue-100 text-blue-600" },
  excluir: { icon: Trash2, cor: "bg-red-100 text-red-600" },
  visualizar: { icon: Eye, cor: "bg-gray-100 text-gray-600" },
  download: { icon: Download, cor: "bg-purple-100 text-purple-600" },
  enviar_email: { icon: Mail, cor: "bg-orange-100 text-orange-600" },
  exportar: { icon: FileSpreadsheet, cor: "bg-cyan-100 text-cyan-600" }
};

export default function LogsAuditoria({ modulo = "compliance" }) {
  const [busca, setBusca] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("todos");
  const [expandido, setExpandido] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logsAuditoria", modulo],
    queryFn: () => base44.entities.LogAuditoria.filter({ modulo }, "-created_date", 100)
  });

  const logsFiltrados = logs.filter(log => {
    const matchBusca = log.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
                      log.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
                      log.usuario_email?.toLowerCase().includes(busca.toLowerCase());
    const matchAcao = filtroAcao === "todos" || log.acao === filtroAcao;
    return matchBusca && matchAcao;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar nos logs..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 border-gray-300"
            />
          </div>
          <Select value={filtroAcao} onValueChange={setFiltroAcao}>
            <SelectTrigger className="w-40 border-gray-300">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="criar">Criar</SelectItem>
              <SelectItem value="editar">Editar</SelectItem>
              <SelectItem value="excluir">Excluir</SelectItem>
              <SelectItem value="visualizar">Visualizar</SelectItem>
              <SelectItem value="download">Download</SelectItem>
              <SelectItem value="enviar_email">E-mail</SelectItem>
              <SelectItem value="exportar">Exportar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : logsFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro de auditoria encontrado</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logsFiltrados.map(log => {
              const iconeConfig = ICONES_ACAO[log.acao] || ICONES_ACAO.visualizar;
              const IconeAcao = iconeConfig.icon;
              const isExpandido = expandido === log.id;

              return (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div 
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandido(isExpandido ? null : log.id)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconeConfig.cor}`}>
                      <IconeAcao className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{log.descricao}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {log.usuario_nome || log.usuario_email || "Sistema"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${iconeConfig.cor}`}>
                          {log.acao}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {isExpandido && (
                    <div className="mt-4 ml-13 p-4 bg-gray-50 rounded-lg text-sm">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Entidade</p>
                          <p className="text-gray-800">{log.entidade || "-"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">ID do Registro</p>
                          <p className="text-gray-800 font-mono text-xs">{log.entidade_id || "-"}</p>
                        </div>
                        {log.ip_address && (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">IP</p>
                            <p className="text-gray-800">{log.ip_address}</p>
                          </div>
                        )}
                        {log.user_agent && (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Navegador</p>
                            <p className="text-gray-800 truncate">{log.user_agent}</p>
                          </div>
                        )}
                      </div>
                      {log.dados_anteriores && (
                        <div className="mt-3">
                          <p className="text-gray-500 text-xs mb-1">Dados Anteriores</p>
                          <pre className="bg-white p-2 rounded border border-gray-200 text-xs overflow-auto max-h-32">
                            {log.dados_anteriores}
                          </pre>
                        </div>
                      )}
                      {log.dados_novos && (
                        <div className="mt-3">
                          <p className="text-gray-500 text-xs mb-1">Dados Novos</p>
                          <pre className="bg-white p-2 rounded border border-gray-200 text-xs overflow-auto max-h-32">
                            {log.dados_novos}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}