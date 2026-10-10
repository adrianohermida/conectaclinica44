import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Droplet, Snowflake, Search, Mail, Phone, Building2, MessageSquare, TrendingUp, Users, Target, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function GestaoLeads() {
  return (
    <RouteGuard requireAuth>
      <LeadsContent />
    </RouteGuard>
  );
}

function LeadsContent() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroQual, setFiltroQual] = useState("todos");

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-site"],
    queryFn: () => base44.entities.LeadSite.list('-created_date'),
    refetchInterval: 30000
  });

  const converterTicketMutation = useMutation({
    mutationFn: async (lead) => {
      const ticket = await base44.entities.Ticket.create({
        clinica_id: "global",
        numero_ticket: `#LEAD-${Date.now()}`,
        assunto: `Lead: ${lead.nome} - ${lead.empresa || 'Sem empresa'}`,
        solicitante_nome: lead.nome,
        solicitante_email: lead.email,
        solicitante_telefone: lead.telefone,
        canal: "widget",
        prioridade: lead.qualificacao === 'hot' ? 'urgente' : 'media',
        categoria: "comercial",
        status: "aberto"
      });

      await base44.entities.LeadSite.update(lead.id, { transferido_vendas: true, data_transferencia: new Date().toISOString() });
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["leads-site"]);
      toast.success("✅ Ticket criado para vendas");
    }
  });

  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      const matchQual = filtroQual === "todos" || l.qualificacao === filtroQual;
      const matchBusca = !busca || 
        l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        l.email?.toLowerCase().includes(busca.toLowerCase()) ||
        l.empresa?.toLowerCase().includes(busca.toLowerCase());
      return matchQual && matchBusca;
    });
  }, [leads, filtroQual, busca]);

  const stats = {
    hot: leads.filter(l => l.qualificacao === 'hot').length,
    warm: leads.filter(l => l.qualificacao === 'warm').length,
    cold: leads.filter(l => l.qualificacao === 'cold').length,
    total: leads.length
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Leads"
        description="Leads capturados do site e widget público"
        breadcrumbs={[
          { label: "Gestão & Marketing", url: "/GestaoPublico" },
          { label: "Leads" }
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fde7e7' }}>
              <Flame className="w-6 h-6" style={{ color: '#ea4335' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#5f6368' }}>Hot</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{stats.hot}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef9e5' }}>
              <Droplet className="w-6 h-6" style={{ color: '#fbbc04' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#5f6368' }}>Warm</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{stats.warm}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e8f1fb' }}>
              <Snowflake className="w-6 h-6" style={{ color: '#1a73e8' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#5f6368' }}>Cold</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{stats.cold}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
              <Users className="w-6 h-6" style={{ color: '#7E57FF' }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: '#5f6368' }}>Total</p>
              <p className="text-3xl font-bold" style={{ color: '#202124' }}>{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="p-4 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9aa0a6' }} />
            <Input
              placeholder="Buscar leads..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-12 rounded-xl min-h-[48px] border-gray-200"
              style={{ backgroundColor: '#f8f9fa' }}
            />
          </div>
          <Select value={filtroQual} onValueChange={setFiltroQual}>
            <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Qualificações</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">💧 Warm</SelectItem>
              <SelectItem value="cold">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e8eaed' }}>
              <tr>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Lead</th>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Empresa</th>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Qualificação</th>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Origem</th>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Capturado</th>
                <th className="px-6 py-4 text-xs font-semibold" style={{ color: '#5f6368' }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f1f3f4' }}>
              {leadsFiltrados.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#202124' }}>{lead.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3" style={{ color: '#9aa0a6' }} />
                        <span className="text-xs" style={{ color: '#5f6368' }}>{lead.email}</span>
                      </div>
                      {lead.telefone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3" style={{ color: '#9aa0a6' }} />
                          <span className="text-xs" style={{ color: '#5f6368' }}>{lead.telefone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: '#5f6368' }}>{lead.empresa || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1" style={{
                      backgroundColor: lead.qualificacao === 'hot' ? '#fde7e7' : lead.qualificacao === 'warm' ? '#fef9e5' : '#e8f1fb',
                      color: lead.qualificacao === 'hot' ? '#842820' : lead.qualificacao === 'warm' ? '#956802' : '#0e4082'
                    }}>
                      {lead.qualificacao === 'hot' && <Flame className="w-3 h-3" />}
                      {lead.qualificacao === 'warm' && <Droplet className="w-3 h-3" />}
                      {lead.qualificacao === 'cold' && <Snowflake className="w-3 h-3" />}
                      {lead.qualificacao}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
                      {lead.origem}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs" style={{ color: '#9aa0a6' }}>
                      {formatDistanceToNow(new Date(lead.created_date), { addSuffix: true, locale: ptBR })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => converterTicketMutation.mutate(lead)}
                        disabled={lead.transferido_vendas}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-sm disabled:opacity-50"
                        style={{ backgroundColor: '#7E57FF', color: 'white' }}
                      >
                        {lead.transferido_vendas ? '✅ Enviado' : 'Criar Ticket'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}