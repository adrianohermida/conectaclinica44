import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, Filter, Download, Shield, AlertTriangle, Info, CheckCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../components/hooks/useAuth";

export default function LogsAuditoria() {
  const { isAdmin } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [pageLoading, setPageLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 90);
    return () => clearTimeout(timer);
  }, []);

  // CRITICAL P0: LogAuditoria + LogAcessoDado (compliance CFM + LGPD)
  const { data: logsAuditoria = [], isLoading: loadingAuditoria } = useQuery({
    queryKey: ["logs-auditoria"],
    queryFn: () => base44.entities.LogAuditoria.list("-timestamp", 500),
    staleTime: 30 * 1000,
    enabled: isAdmin
  });

  const { data: logsAcesso = [], isLoading: loadingAcesso } = useQuery({
    queryKey: ["logs-acesso"],
    queryFn: () => base44.entities.LogAcessoDado.list("-created_date", 500),
    staleTime: 30 * 1000,
    enabled: isAdmin
  });

  const logs = [...logsAuditoria, ...logsAcesso];
  const isLoading = loadingAuditoria || loadingAcesso;

  const logsFiltrados = useMemo(() => {
    return logs.filter(log => {
      const matchBusca = !busca || 
        log.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        log.usuario?.toLowerCase().includes(busca.toLowerCase()) ||
        log.usuario_email?.toLowerCase().includes(busca.toLowerCase()) ||
        log.entidade?.toLowerCase().includes(busca.toLowerCase());
      
      const matchTipo = filtroTipo === "todos" || 
        log.tipo_acao === filtroTipo || 
        log.tipo_acesso === filtroTipo;
      
      const matchNivel = filtroNivel === "todos" || log.nivel_criticidade === filtroNivel;
      
      return matchBusca && matchTipo && matchNivel;
    });
  }, [logs, busca, filtroTipo, filtroNivel]);

  const exportarLogs = () => {
    const csv = [
      "Data/Hora,Usuário,Ação,Entidade,Descrição,Base Legal,Nível,IP",
      ...logsFiltrados.map(log => 
        `"${format(new Date(log.timestamp || log.created_date), "dd/MM/yyyy HH:mm:ss")}","${log.usuario || log.usuario_email}","${log.tipo_acao || log.tipo_acesso}","${log.entidade}","${log.descricao || log.finalidade || log.contexto}","${log.base_legal || 'N/A'}","${log.nivel_criticidade || (log.sucesso ? 'info' : 'alerta')}","${log.ip_origem}"`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_auditoria_completo_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getNivelIcon = (nivel) => {
    switch (nivel) {
      case "critico": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "alerta": return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "info": return <Info className="w-4 h-4 text-blue-600" />;
      default: return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  if (pageLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
          <div className="h-8 bg-gray-200 rounded w-56 mb-3" />
          <div className="h-5 bg-gray-200 rounded w-80" />
        </div>
        <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto overflow-x-hidden">
        <PageHeader title="Logs de Auditoria" description="Acesso restrito" />
        <div className="bg-yellow-50 rounded-2xl p-8 text-center border overflow-hidden" style={{ borderColor: '#fdedb3' }}>
          <Shield className="w-16 h-16 text-yellow-600 mx-auto mb-4 flex-shrink-0" />
          <p className="font-bold break-words" style={{ color: '#e37400', fontSize: '16px' }}>Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">:::
      <PageHeader
        title="Logs de Auditoria"
        description="Conformidade LGPD - Rastreabilidade completa"
        breadcrumbs={[{ label: "Logs de Auditoria" }]}
        action={
          <button
            onClick={exportarLogs}
            aria-label="Exportar logs para CSV"
            className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] flex items-center justify-center gap-2 px-5"
            style={{ backgroundColor: '#34a853', color: '#ffffff', fontSize: '14px' }}
          >
            <Download className="w-5 h-5 flex-shrink-0" />
            Exportar Logs
          </button>
        }
      />

      {/* Info LGPD + CFM */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">✅ Conformidade LGPD Art. 37º/48º + CFM 1.821/07 Art. 16</p>
            <p className="text-xs">
              Acessos manuais (LogAuditoria) + acessos a dados sensíveis (LogAcessoDado CFM/LGPD).
              Rastreabilidade completa - Retenção: 6 anos (obrigatório por lei).
            </p>
            <p className="text-xs mt-2 font-semibold">
              📁 Total logs unificados: {logs.length} ({logsAuditoria.length} auditoria + {logsAcesso.length} acesso dados)
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Activity className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-xs text-gray-600">Total Logs</p>
          <p className="text-2xl font-bold text-gray-800">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-xs text-gray-600">Críticos</p>
          <p className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.nivel_criticidade === "critico").length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <AlertTriangle className="w-8 h-8 text-orange-600 mb-2" />
          <p className="text-xs text-gray-600">Alertas</p>
          <p className="text-2xl font-bold text-orange-600">
            {logs.filter(l => l.nivel_criticidade === "alerta").length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Info className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-xs text-gray-600">Info</p>
          <p className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.nivel_criticidade === "info").length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border p-4 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
            <Input
              placeholder="Buscar logs..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-12 border border-gray-300 rounded-xl min-h-[48px]"
              style={{ fontSize: '16px' }}
              aria-label="Buscar logs"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="border border-gray-300 rounded-xl min-h-[48px]" style={{ fontSize: '16px' }}>
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas ações</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="criar_prontuario">Criar Prontuário</SelectItem>
              <SelectItem value="editar_prontuario">Editar Prontuário</SelectItem>
              <SelectItem value="compartilhar_dados">Compartilhar Dados</SelectItem>
              <SelectItem value="acesso_dados_sensiveis">Acesso Dados Sensíveis</SelectItem>
              <SelectItem value="backup_sistema">Backup Sistema</SelectItem>
              <SelectItem value="leitura_manual">Leitura Manual (LGPD)</SelectItem>
              <SelectItem value="edicao">Edição (LGPD)</SelectItem>
              <SelectItem value="exportacao">Exportação (LGPD)</SelectItem>
              <SelectItem value="consulta_ia">Consulta IA (CFM)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroNivel} onValueChange={setFiltroNivel}>
            <SelectTrigger>
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos níveis</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="alerta">Alerta</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50" style={{ borderBottom: '1px solid #e8eaed' }}>
              <tr>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Data/Hora</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Usuário</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Ação</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Entidade</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Descrição</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Nível</th>
              </tr>
            </thead>
            <tbody>
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center" style={{ color: '#5f6368', fontSize: '16px' }}>
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logsFiltrados.slice(0, 100).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #f1f3f4' }}>
                    <td className="p-4 whitespace-nowrap" style={{ color: '#202124', fontSize: '14px' }}>
                      {format(new Date(log.timestamp || log.created_date), "dd/MM/yy HH:mm:ss")}
                    </td>
                    <td className="p-4" style={{ color: '#202124', fontSize: '14px' }}>
                      {log.usuario || log.usuario_email}
                    </td>
                    <td className="p-4 capitalize" style={{ color: '#202124', fontSize: '14px' }}>
                      {(log.tipo_acao || log.tipo_acesso)?.replace(/_/g, " ")}
                    </td>
                    <td className="p-4" style={{ color: '#202124', fontSize: '14px' }}>{log.entidade}</td>
                    <td className="p-4 max-w-md truncate" style={{ color: '#5f6368', fontSize: '14px' }}>
                      {log.descricao || log.finalidade || log.contexto}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getNivelIcon(log.nivel_criticidade || 'info')}
                        <span className="capitalize" style={{ fontSize: '14px' }}>
                          {log.nivel_criticidade || (log.sucesso ? 'info' : 'alerta')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center" style={{ borderTop: '1px solid #e8eaed' }}>
          <p style={{ color: '#80868b', fontSize: '14px' }}>
            Mostrando {Math.min(logsFiltrados.length, 100)} de {logsFiltrados.length} registros
          </p>
        </div>
      </div>
    </div>
  );
}