import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Mail, TrendingUp, Users, Target, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";

export default function MarketingOutbound() {
  return (
    <RouteGuard requireAuth>
      <MarketingContent />
    </RouteGuard>
  );
}

function MarketingContent() {
  const queryClient = useQueryClient();
  const [painelNova, setPainelNova] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    tipo: "email",
    segmento_alvo: "todos_leads",
    assunto: "",
    corpo: "",
    cta_texto: "Saiba Mais",
    cta_url: "",
    agendada_para: ""
  });

  const { data: campanhas = [] } = useQuery({
    queryKey: ["campanhas"],
    queryFn: () => base44.entities.CampanhaMarketing.list('-created_date')
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads-site"],
    queryFn: () => base44.entities.LeadSite.list()
  });

  const criarCampanhaMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CampanhaMarketing.create({
        ...data,
        status: data.agendada_para ? 'agendada' : 'rascunho'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["campanhas"]);
      toast.success("✅ Campanha criada");
      setPainelNova(false);
      setForm({
        nome: "",
        tipo: "email",
        segmento_alvo: "todos_leads",
        assunto: "",
        corpo: "",
        cta_texto: "Saiba Mais",
        cta_url: "",
        agendada_para: ""
      });
    }
  });

  const stats = {
    total_leads: leads.length,
    hot: leads.filter(l => l.qualificacao === 'hot').length,
    warm: leads.filter(l => l.qualificacao === 'warm').length,
    campanhas_ativas: campanhas.filter(c => c.status === 'agendada' || c.status === 'enviando').length
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing Outbound"
        description="Campanhas de email marketing e nurture de leads"
        breadcrumbs={[
          { label: "Gestão & Marketing", url: "/GestaoPublico" },
          { label: "Marketing" }
        ]}
        action={
          <button
            onClick={() => setPainelNova(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.total_leads, icon: Users, color: '#7E57FF', bg: '#f5f3ff' },
          { label: 'Hot Leads', value: stats.hot, icon: Target, color: '#ea4335', bg: '#fde7e7' },
          { label: 'Warm Leads', value: stats.warm, icon: TrendingUp, color: '#fbbc04', bg: '#fef9e5' },
          { label: 'Campanhas Ativas', value: stats.campanhas_ativas, icon: Send, color: '#34a853', bg: '#e6f7ed' }
        ].map((stat, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#5f6368' }}>{stat.label}</p>
                <p className="text-3xl font-bold" style={{ color: '#202124' }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista Campanhas */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="p-4 border-b" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
          <h3 className="font-bold" style={{ color: '#202124' }}>Campanhas</h3>
        </div>
        <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
          {campanhas.map(camp => (
            <div key={camp.id} className="p-5 hover:bg-gray-50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1" style={{ color: '#202124' }}>{camp.nome}</h4>
                  <p className="text-xs mb-2" style={{ color: '#5f6368' }}>Segmento: {camp.segmento_alvo}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#9aa0a6' }}>
                    <span>📧 {camp.enviados || 0} enviados</span>
                    <span>👁️ {camp.aberturas || 0} aberturas</span>
                    <span>🔗 {camp.cliques || 0} cliques</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{
                  backgroundColor: camp.status === 'concluida' ? '#e6f7ed' : '#fef9e5',
                  color: camp.status === 'concluida' ? '#1f6332' : '#956802'
                }}>
                  {camp.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SlideInPanel: Nova Campanha */}
      <SlideInPanel
        open={painelNova}
        onClose={() => setPainelNova(false)}
        title="Nova Campanha de Marketing"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          criarCampanhaMutation.mutate(form);
        }} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Nome da Campanha *</label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Campanha Trial Gratuito"
              required
              className="rounded-xl min-h-[48px] border-gray-200"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Tipo</label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Segmento</label>
              <Select value={form.segmento_alvo} onValueChange={(v) => setForm({ ...form, segmento_alvo: v })}>
                <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos_leads">Todos Leads</SelectItem>
                  <SelectItem value="hot">🔥 Hot Leads</SelectItem>
                  <SelectItem value="warm">💧 Warm Leads</SelectItem>
                  <SelectItem value="cold">❄️ Cold Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Assunto *</label>
            <Input
              value={form.assunto}
              onChange={(e) => setForm({ ...form, assunto: e.target.value })}
              placeholder="Ex: Transforme sua clínica com IA"
              required
              className="rounded-xl min-h-[48px] border-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Mensagem *</label>
            <Textarea
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
              placeholder="Escreva a mensagem da campanha..."
              required
              className="rounded-xl resize-none border-gray-200"
              rows={6}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Texto CTA</label>
              <Input
                value={form.cta_texto}
                onChange={(e) => setForm({ ...form, cta_texto: e.target.value })}
                className="rounded-xl min-h-[48px] border-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>URL CTA</label>
              <Input
                value={form.cta_url}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                placeholder="https://..."
                className="rounded-xl min-h-[48px] border-gray-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={() => setPainelNova(false)} 
              className="flex-1 min-h-[48px] rounded-xl font-medium transition-all border"
              style={{ borderColor: '#e8eaed', color: '#5f6368' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={criarCampanhaMutation.isPending} 
              className="flex-1 min-h-[48px] rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
            >
              Criar Campanha
            </button>
          </div>
        </form>
      </SlideInPanel>
    </div>
  );
}