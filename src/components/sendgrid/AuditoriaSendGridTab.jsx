import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Mail, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  BarChart3,
  Building2,
  Filter,
  Loader2,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AuditoriaSendGridTab() {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroClinica, setFiltroClinica] = useState("todas");

  // Fetch auditoria
  const { data: auditorias = [], isLoading } = useQuery({
    queryKey: ["sendgrid-auditoria", filtroStatus, filtroTipo, filtroClinica],
    queryFn: async () => {
      let query = {};
      
      if (filtroStatus !== "todos") {
        query.status = filtroStatus;
      }
      
      if (filtroTipo !== "todos") {
        query.tipo_email = filtroTipo;
      }

      if (filtroClinica !== "todas") {
        query.clinica_id = filtroClinica;
      }

      return base44.entities.SendGridAuditoria.filter(query, "-created_date", 500);
    },
    staleTime: 30 * 1000
  });

  // Fetch clínicas para filtro
  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-sendgrid"],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarClinicas', {});
      return res.data.clinicas || [];
    }
  });

  // MÉTRICAS CRÍTICAS
  const metricas = useMemo(() => {
    const total = auditorias.length;
    const enviados = auditorias.filter(a => a.status === 'sent').length;
    const entregues = auditorias.filter(a => a.status === 'delivered').length;
    const bounced = auditorias.filter(a => a.status === 'bounced').length;
    const opened = auditorias.filter(a => a.status === 'opened').length;
    const clicked = auditorias.filter(a => a.status === 'clicked').length;
    const usouFallback = auditorias.filter(a => a.usou_fallback).length;

    const taxaEntrega = total > 0 ? ((entregues / total) * 100).toFixed(1) : 0;
    const taxaBounce = total > 0 ? ((bounced / total) * 100).toFixed(1) : 0;
    const taxaAbertura = entregues > 0 ? ((opened / entregues) * 100).toFixed(1) : 0;
    const taxaClique = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0;
    const percentualFallback = total > 0 ? ((usouFallback / total) * 100).toFixed(1) : 0;

    const custoTotal = auditorias.reduce((acc, a) => acc + (a.custo_creditos || 0), 0) * 0.001; // R$ 0,001/email
    const latenciaMedia = auditorias.length > 0 
      ? auditorias.reduce((acc, a) => acc + (a.latencia_ms || 0), 0) / auditorias.length
      : 0;

    // Top 10 clínicas por volume
    const volumePorClinica = {};
    auditorias.forEach(a => {
      volumePorClinica[a.clinica_id] = (volumePorClinica[a.clinica_id] || 0) + 1;
    });
    
    const topClinicas = Object.entries(volumePorClinica)
      .map(([clinica_id, volume]) => {
        const clinica = clinicas.find(c => c.id === clinica_id);
        return { 
          clinica_id, 
          nome: clinica?.nome || clinica_id.substring(0, 8), 
          volume 
        };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Bounce rate por domínio
    const bouncePorDominio = {};
    auditorias.forEach(a => {
      if (!a.destinatario) return;
      const dominio = a.destinatario.split('@')[1];
      if (!bouncePorDominio[dominio]) {
        bouncePorDominio[dominio] = { total: 0, bounced: 0 };
      }
      bouncePorDominio[dominio].total++;
      if (a.status === 'bounced') {
        bouncePorDominio[dominio].bounced++;
      }
    });

    const topBounceDominios = Object.entries(bouncePorDominio)
      .map(([dominio, stats]) => ({
        dominio,
        taxa: ((stats.bounced / stats.total) * 100).toFixed(1),
        total: stats.total,
        bounced: stats.bounced
      }))
      .filter(d => parseFloat(d.taxa) > 0)
      .sort((a, b) => parseFloat(b.taxa) - parseFloat(a.taxa))
      .slice(0, 10);

    return {
      total,
      enviados,
      entregues,
      bounced,
      opened,
      clicked,
      taxaEntrega,
      taxaBounce,
      taxaAbertura,
      taxaClique,
      percentualFallback,
      custoTotal,
      latenciaMedia: latenciaMedia.toFixed(0),
      topClinicas,
      topBounceDominios
    };
  }, [auditorias, clinicas]);

  // Chart data: Emails por tipo
  const dadosPorTipo = useMemo(() => {
    const tipos = {};
    auditorias.forEach(a => {
      tipos[a.tipo_email] = (tipos[a.tipo_email] || 0) + 1;
    });
    
    return Object.entries(tipos)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);
  }, [auditorias]);

  const COLORS = ['#7E57FF', '#34a853', '#fbbc04', '#ea4335', '#0B7A9E', '#9334e9'];

  return (
    <div className="space-y-6">
      {/* KPIs Críticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <p className="text-xs text-gray-500">Total Enviados</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metricas.total}</p>
          <p className="text-xs text-gray-500 mt-1">Últimos 500 registros</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#34a853' }} />
            <p className="text-xs text-gray-500">Taxa Entrega</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{metricas.taxaEntrega}%</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.entregues} entregues</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5" style={{ color: '#ea4335' }} />
            <p className="text-xs text-gray-500">Taxa Bounce</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{metricas.taxaBounce}%</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.bounced} bounces</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5" style={{ color: '#0B7A9E' }} />
            <p className="text-xs text-gray-500">Taxa Abertura</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{metricas.taxaAbertura}%</p>
          <p className="text-xs text-gray-500 mt-1">{metricas.opened} aberturas</p>
        </div>

        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#fbbc04' }} />
            <p className="text-xs text-gray-500">Custo Estimado</p>
          </div>
          <p className="text-3xl font-bold text-yellow-600">R$ {metricas.custoTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Baseado em volume</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            <option value="todos">Todos Status</option>
            <option value="sent">Enviados</option>
            <option value="delivered">Entregues</option>
            <option value="bounced">Bounced</option>
            <option value="opened">Abertos</option>
            <option value="clicked">Clicados</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            <option value="todos">Todos Tipos</option>
            <option value="confirmacao_criacao">Confirmação</option>
            <option value="resposta_ia">Resposta IA</option>
            <option value="atualizado">Atualização</option>
            <option value="cobranca">Cobrança</option>
            <option value="notificacao">Notificação</option>
          </select>

          <select
            value={filtroClinica}
            onChange={(e) => setFiltroClinica(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
          >
            <option value="todas">Todas Clínicas</option>
            {clinicas.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <div className="ml-auto text-sm text-gray-600">
            {auditorias.length} registro(s)
          </div>
        </div>

        {/* Métricas Adicionais */}
        <div className="mt-5 pt-5 border-t grid grid-cols-1 md:grid-cols-3 gap-4" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Fallback Sender</p>
              <p className="text-lg font-bold text-gray-900">{metricas.percentualFallback}%</p>
              <p className="text-xs text-gray-500">{auditorias.filter(a => a.usou_fallback).length} emails</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Latência Média</p>
              <p className="text-lg font-bold text-gray-900">{metricas.latenciaMedia}ms</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MousePointer className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">CTR (Click-Through)</p>
              <p className="text-lg font-bold text-gray-900">{metricas.taxaClique}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Clínicas por Volume */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: '#7E57FF' }} />
          Top 10 Clínicas por Volume
        </h3>
        <div className="space-y-2">
          {metricas.topClinicas.map((item, idx) => {
            const percentual = ((item.volume / metricas.total) * 100).toFixed(1);
            return (
              <div key={item.clinica_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate">{item.nome}</span>
                    <span className="text-sm font-bold text-gray-600">{item.volume}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${percentual}%`, 
                        backgroundColor: '#7E57FF' 
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">{percentual}%</span>
              </div>
            );
          })}
          {metricas.topClinicas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum dado disponível</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Domínios com Bounce */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <XCircle className="w-5 h-5" style={{ color: '#ea4335' }} />
          Top Domínios com Bounce
        </h3>
        {metricas.topBounceDominios.length > 0 ? (
          <div className="space-y-2">
            {metricas.topBounceDominios.map((item, idx) => (
              <div key={item.dominio} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-sm font-bold text-red-600">#{idx + 1}</span>
                  <code className="font-mono text-sm text-gray-900 truncate">{item.dominio}</code>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-gray-600">{item.bounced}/{item.total}</span>
                  <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold">
                    {item.taxa}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600 opacity-50" />
            <p className="text-sm">🎉 Nenhum bounce detectado</p>
          </div>
        )}
      </div>

      {/* Chart: Emails por Tipo */}
      <div className="bg-white rounded-xl p-6 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold text-gray-900 mb-4">Distribuição por Tipo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosPorTipo}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
            <XAxis dataKey="tipo" stroke="#5f6368" />
            <YAxis stroke="#5f6368" />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e8eaed',
                borderRadius: '12px'
              }}
            />
            <Bar dataKey="count" fill="#7E57FF" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista Detalhada */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900">Últimos {auditorias.length} Emails</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : auditorias.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border" style={{ borderColor: '#e8eaed' }}>
            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600">Nenhum email registrado</p>
          </div>
        ) : (
          auditorias.slice(0, 50).map(audit => {
            const statusConfig = {
              sent: { icon: Mail, color: '#0B7A9E', bg: '#e0f2fe', label: 'Enviado' },
              delivered: { icon: CheckCircle2, color: '#34a853', bg: '#e6f7ed', label: 'Entregue' },
              bounced: { icon: XCircle, color: '#ea4335', bg: '#fef2f2', label: 'Bounced' },
              opened: { icon: Eye, color: '#fbbc04', bg: '#fef9e5', label: 'Aberto' },
              clicked: { icon: MousePointer, color: '#7E57FF', bg: '#f5f3ff', label: 'Clicado' },
              dropped: { icon: XCircle, color: '#5f6368', bg: '#f8f9fa', label: 'Descartado' }
            }[audit.status] || { icon: Mail, color: '#5f6368', bg: '#f8f9fa', label: audit.status };

            const StatusIcon = statusConfig.icon;
            const clinica = clinicas.find(c => c.id === audit.clinica_id);

            return (
              <div key={audit.id} className="bg-white rounded-xl p-4 border hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusConfig.bg }}>
                    <StatusIcon className="w-6 h-6" style={{ color: statusConfig.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{audit.assunto}</h4>
                        <p className="text-sm text-gray-600 truncate">Para: {audit.destinatario}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0" style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>🏥 {clinica?.nome || audit.clinica_id.substring(0, 12)}</span>
                      <span>📧 {audit.tipo_email}</span>
                      <span>⏱️ {audit.latencia_ms || 0}ms</span>
                      {audit.usou_fallback && (
                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
                          Fallback Sender
                        </span>
                      )}
                      <span>📅 {format(new Date(audit.created_date), "dd/MM/yy HH:mm")}</span>
                    </div>

                    {audit.erro_detalhes && (
                      <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                        <p className="text-xs text-red-700">❌ {audit.erro_detalhes}</p>
                      </div>
                    )}

                    {audit.bounce_reason && (
                      <div className="mt-2 p-2 rounded bg-orange-50 border border-orange-200">
                        <p className="text-xs text-orange-700">📛 Bounce: {audit.bounce_reason}</p>
                      </div>
                    )}
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