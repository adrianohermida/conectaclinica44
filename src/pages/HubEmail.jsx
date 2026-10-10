import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { 
  Mail, Inbox, Shield, Zap, Globe, Send, CheckCircle, XCircle, AlertCircle, Activity,
  Plus, RefreshCw, ExternalLink, Copy, Settings, Users, BarChart3, Eye, 
  Info, Trash2, Loader2, Filter, Building2, Lock, Search, FileText,
  Palette, TrendingUp, MapPin, Monitor, Ban, UserX, Megaphone, Box
} from "lucide-react";
import { toast } from "sonner";

/**
 * HUB EMAIL - SENDGRID COMPLETO
 * Estrutura idêntica ao SendGrid com implementação gradativa
 */
export default function HubEmail() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState(null);

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Mail,
      implementado: true
    },
    { 
      id: 'templates', 
      label: 'Templates', 
      icon: FileText,
      implementado: false
    },
    { 
      id: 'marketing', 
      label: 'Marketing', 
      icon: Megaphone,
      implementado: false,
      subtabs: [
        { id: 'automations', label: 'Automations' },
        { id: 'single_sends', label: 'Single Sends' },
        { id: 'contacts', label: 'Contacts' },
        { id: 'custom_fields', label: 'Custom Fields' },
        { id: 'signup_forms', label: 'Signup Forms' },
        { id: 'senders', label: 'Senders' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'unsubscribe_groups', label: 'Unsubscribe Groups' },
        { id: 'integrations', label: 'Integrations' }
      ]
    },
    { 
      id: 'design_library', 
      label: 'Design Library', 
      icon: Palette,
      implementado: false
    },
    { 
      id: 'stats', 
      label: 'Stats', 
      icon: BarChart3,
      implementado: false,
      subtabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'expert_insights', label: 'Expert Insights' },
        { id: 'deliverability', label: 'Deliverability Insights' },
        { id: 'global_stats', label: 'Global Stats' },
        { id: 'category_stats', label: 'Category Stats' },
        { id: 'category_comparison', label: 'Category Comparison' },
        { id: 'subuser_stats', label: 'Subuser Stats' },
        { id: 'subuser_comparison', label: 'Subuser Comparison' },
        { id: 'geographical', label: 'Geographical' },
        { id: 'email_clients', label: 'Email Clients & Devices' },
        { id: 'mailbox_provider', label: 'Mailbox Provider Stats' },
        { id: 'mailbox_comparison', label: 'Mailbox Provider Comparison' },
        { id: 'browser_stats', label: 'Browser Stats' },
        { id: 'browser_comparison', label: 'Browser Comparison' },
        { id: 'parse_webhook', label: 'Parse Webhook' }
      ]
    },
    { 
      id: 'activity', 
      label: 'Activity', 
      icon: Activity,
      implementado: true,
      subtabs: [
        { id: 'email_logs', label: 'Email Logs' },
        { id: 'activity_feed', label: 'Activity Feed' }
      ]
    },
    { 
      id: 'validations', 
      label: 'Validations', 
      icon: CheckCircle,
      implementado: false
    },
    { 
      id: 'suppressions', 
      label: 'Suppressions', 
      icon: Ban,
      implementado: false,
      subtabs: [
        { id: 'global_unsubscribes', label: 'Global Unsubscribes' },
        { id: 'group_unsubscribes', label: 'Group Unsubscribes' },
        { id: 'bounces', label: 'Bounces' },
        { id: 'spam_reports', label: 'Spam Reports' },
        { id: 'blocks', label: 'Blocks' },
        { id: 'invalid', label: 'Invalid' }
      ]
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      implementado: true,
      subtabs: [
        { id: 'account_details', label: 'Account Details' },
        { id: 'alert_settings', label: 'Alert Settings' },
        { id: 'api_keys', label: 'API Keys' },
        { id: 'inbound_parse', label: 'Inbound Parse' },
        { id: 'sender_auth', label: 'Sender Authentication' },
        { id: 'mail_settings', label: 'Mail Settings' },
        { id: 'tracking', label: 'Tracking' }
      ]
    }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Hub Email (SendGrid)"
          description="Plataforma completa de email com isolamento multi-tenant"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "Email" }]}
        />

        {/* Main Tabs */}
        <div className="pc-card">
          <div className="border-b px-2 py-2" style={{ borderColor: '#e8eaed' }}>
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setActiveSubTab(tab.subtabs?.[0]?.id || null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-[#f5f3ff] text-[#7E57FF]'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {!tab.implementado && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        Dev
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Tabs */}
          {currentTab?.subtabs && (
            <div className="border-b px-6 py-3 bg-gray-50">
              <div className="flex gap-2 overflow-x-auto">
                {currentTab.subtabs.map(subtab => (
                  <button
                    key={subtab.id}
                    onClick={() => setActiveSubTab(subtab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                      activeSubTab === subtab.id
                        ? 'bg-white text-[#7E57FF] border border-[#7E57FF]'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    {subtab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'templates' && <MockupTab nome="Templates" />}
            {activeTab === 'marketing' && <MarketingTab activeSubTab={activeSubTab} />}
            {activeTab === 'design_library' && <MockupTab nome="Design Library" />}
            {activeTab === 'stats' && <StatsTab activeSubTab={activeSubTab} />}
            {activeTab === 'activity' && <ActivityTab activeSubTab={activeSubTab} />}
            {activeTab === 'validations' && <MockupTab nome="Validations" />}
            {activeTab === 'suppressions' && <SuppressionsTab activeSubTab={activeSubTab} />}
            {activeTab === 'settings' && <SettingsTab activeSubTab={activeSubTab} />}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

// ==================== MOCKUP GENÉRICO ====================
function MockupTab({ nome }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Box className="w-20 h-20 text-gray-300 mb-6" />
      <h3 className="text-2xl font-bold text-gray-400 mb-2">🚧 {nome}</h3>
      <p className="text-gray-500 mb-4">Em desenvolvimento - aguardando validação de ROI</p>
      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 max-w-md">
        <p className="text-sm text-yellow-800">
          <strong>Status:</strong> Estrutura preparada para integração gradativa conforme demanda e retorno financeiro aumentarem.
        </p>
      </div>
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab() {
  const [testEmail, setTestEmail] = useState('');
  const [testandoHealth, setTestandoHealth] = useState(false);
  const [healthResult, setHealthResult] = useState(null);

  const { data: sendgridStatus, isLoading } = useQuery({
    queryKey: ['sendgrid-status'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridStatus', {});
      return response.data;
    },
    staleTime: 30000
  });

  const { data: stats } = useQuery({
    queryKey: ['sendgrid-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridStats', {});
      return response.data;
    }
  });

  const { data: auditoria = [] } = useQuery({
    queryKey: ['sendgrid-auditoria-recent'],
    queryFn: async () => {
      return await base44.entities.SendGridAuditoria.list('-created_date', 50);
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email) => {
      const response = await base44.functions.invoke('testSendGridEmail', { email });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Email de teste enviado!');
      setTestEmail('');
    }
  });

  const executarHealthCheck = async () => {
    setTestandoHealth(true);
    try {
      const res = await base44.functions.invoke('healthChecks/testarSendGrid', {});
      setHealthResult(res.data);
    } catch (error) {
      setHealthResult({ status: 'error', error: error.message, tests: [] });
    }
    setTestandoHealth(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Connection + Quick Actions */}
      <div className="pc-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${sendgridStatus?.api_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <span className="font-semibold">
                {sendgridStatus?.api_connected ? 'SendGrid Conectado' : 'SendGrid Desconectado'}
              </span>
              {sendgridStatus?.account_email && (
                <p className="text-xs text-gray-500">Conta: {sendgridStatus.account_email}</p>
              )}
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{sendgridStatus?.emails_sent_today || 0} hoje</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{sendgridStatus?.domains_verified || 0} domínios</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{sendgridStatus?.senders_verified || 0} senders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Check REAL */}
      <div className="pc-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Health Check SendGrid</h3>
          <button onClick={executarHealthCheck} disabled={testandoHealth} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
            {testandoHealth ? <><Loader2 className="w-4 h-4 animate-spin" />Testando...</> : <><Zap className="w-4 h-4" />Testar Agora</>}
          </button>
        </div>
        {healthResult && (
          <div className={`p-4 rounded-lg border-2 ${healthResult.status === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-3">
              {healthResult.status === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              <span className="font-bold">{healthResult.status === 'success' ? 'TODOS OS TESTES PASSARAM' : 'TESTES FALHARAM'}</span>
              <span className="text-xs text-gray-500 ml-auto">{healthResult.latencia_total_ms}ms</span>
            </div>
            <div className="space-y-2">
              {healthResult.tests?.map((test, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white border">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{test.nome}</p>
                      {test.detalhes && <p className="text-xs text-gray-600 mt-1">{test.detalhes}</p>}
                      {test.erro && <pre className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded overflow-auto max-h-32">{test.erro}</pre>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auditoria Recente */}
      <div className="pc-card p-6">
        <h3 className="font-semibold mb-4">Auditoria SendGrid (Últimos 50)</h3>
        {auditoria.length > 0 ? (
          <div className="space-y-2">
            {auditoria.slice(0, 10).map(email => (
              <div key={email.id} className="p-3 rounded-lg border flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{email.assunto}</p>
                  <p className="text-xs text-gray-500">{email.destinatario}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ml-3 ${
                  email.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  email.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {email.status}
                </span>
              </div>
            ))}
            <button 
              onClick={() => window.location.href = '/HubEmail?tab=activity'}
              className="w-full py-2 text-sm text-blue-600 hover:underline"
            >
              Ver todos →
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-sm text-yellow-800">Nenhum email auditado ainda</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="pc-card p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Enviados</p>
          <p className="text-2xl font-bold">{stats?.summary?.requests || 0}</p>
        </div>
        <div className="pc-card p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Entregues</p>
          <p className="text-2xl font-bold text-green-600">{stats?.summary?.delivered || 0}</p>
          <p className="text-xs text-gray-500">{stats?.summary?.delivery_rate}%</p>
        </div>
        <div className="pc-card p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Aberturas</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.summary?.opens || 0}</p>
          <p className="text-xs text-gray-500">{stats?.summary?.open_rate}%</p>
        </div>
        <div className="pc-card p-4">
          <p className="text-xs font-semibold text-gray-600 mb-1">Cliques</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.summary?.clicks || 0}</p>
          <p className="text-xs text-gray-500">{stats?.summary?.click_rate}%</p>
        </div>
      </div>
    </div>
  );
}

// ==================== MARKETING TAB ====================
function MarketingTab({ activeSubTab }) {
  if (activeSubTab === 'senders') {
    return <SendersManagement />;
  }
  
  return <MockupTab nome={`Marketing > ${activeSubTab?.replace('_', ' ') || 'Overview'}`} />;
}

function SendersManagement() {
  const queryClient = useQueryClient();
  const [addingSender, setAddingSender] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderReplyTo, setSenderReplyTo] = useState('');

  const { data: senders = [], isLoading } = useQuery({
    queryKey: ['sendgrid-senders'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridSenders', {});
      return response.data.senders || [];
    }
  });

  const sincronizarMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('sincronizarSendGrid', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sendgrid-senders']);
      toast.success('✅ Sincronizado');
    }
  });

  const addSenderMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('addSendGridSender', {
        from_email: senderEmail,
        from_name: senderName,
        reply_to_email: senderReplyTo || senderEmail
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["sendgrid-senders"]);
      setAddingSender(false);
      setSenderEmail("");
      setSenderName("");
      setSenderReplyTo("");
      toast.success("✅ Sender adicionado! Verifique email", { description: `Verifique ${senderEmail}` });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar sender: " + error.message);
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Senders Verificados</h3>
        <div className="flex gap-2">
          <button onClick={() => sincronizarMutation.mutate()} disabled={sincronizarMutation.isPending} className="px-4 py-2 rounded-lg border font-medium flex items-center gap-2">
            {sincronizarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar
          </button>
          <button onClick={() => setAddingSender(true)} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
            <Plus className="w-4 h-4" />Adicionar Sender
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {senders.map(sender => (
          <div key={sender.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sender.verified ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
              <div>
                <p className="font-semibold">{sender.from_name || sender.from_email}</p>
                <p className="text-sm font-mono text-gray-600">{sender.from_email}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${sender.verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {sender.verified ? 'Verificado' : 'Pendente'}
            </span>
          </div>
        ))}
      </div>

      {addingSender && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-normal mb-4">Adicionar Sender Verificado</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email Remetente</label>
                <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="contato@clinica.com.br" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nome de Exibição</label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Clínica ABC" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Reply-To (opcional)</label>
                <Input value={senderReplyTo} onChange={(e) => setSenderReplyTo(e.target.value)} placeholder="suporte@clinica.com.br" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAddingSender(false)} className="flex-1 px-4 py-2 rounded-lg border font-medium">Cancelar</button>
              <button onClick={() => addSenderMutation.mutate()} disabled={!senderEmail || !senderName || addSenderMutation.isPending} className="flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
                {addSenderMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STATS TAB ====================
function StatsTab({ activeSubTab }) {
  if (activeSubTab === 'overview') {
    return <StatsOverview />;
  }
  return <MockupTab nome={`Stats > ${activeSubTab?.replace('_', ' ') || 'Overview'}`} />;
}

function StatsOverview() {
  const { data: stats } = useQuery({
    queryKey: ['sendgrid-stats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSendGridStats', {});
      return res.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Enviados', value: stats?.summary?.requests || 0, color: '#7E57FF' },
          { label: 'Entregues', value: stats?.summary?.delivered || 0, color: '#34a853', percent: stats?.summary?.delivery_rate },
          { label: 'Aberturas', value: stats?.summary?.opens || 0, color: '#0B7A9E', percent: stats?.summary?.open_rate },
          { label: 'Cliques', value: stats?.summary?.clicks || 0, color: '#9334e9', percent: stats?.summary?.click_rate }
        ].map((stat, idx) => (
          <div key={idx} className="pc-card p-4">
            <p className="text-xs font-semibold text-gray-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            {stat.percent && <p className="text-xs text-gray-500">{stat.percent}%</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== ACTIVITY TAB ====================
function ActivityTab({ activeSubTab }) {
  if (!activeSubTab || activeSubTab === 'email_logs') {
    return <EmailLogs />;
  }
  return <MockupTab nome="Activity Feed" />;
}

function EmailLogs() {
  const [filtro, setFiltro] = useState('todos');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['email-logs', filtro],
    queryFn: async () => {
      let query = {};
      if (filtro === 'delivered') query.status = 'delivered';
      if (filtro === 'bounced') query.status = 'bounced';
      if (filtro === 'opened') query.opened_at = { $ne: null };
      
      const result = await base44.entities.SendGridAuditoria.filter(query, '-created_date', 50);
      return result;
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5" style={{ color: '#7E57FF' }} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2 rounded-lg border">
          <option value="todos">Todos</option>
          <option value="delivered">✅ Entregues</option>
          <option value="bounced">❌ Bounced</option>
          <option value="opened">👁️ Abertos</option>
        </select>
        <div className="ml-auto text-sm text-gray-600">{logs.length} email(s)</div>
      </div>

      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="pc-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{log.assunto}</p>
                <p className="text-sm text-gray-600">{log.destinatario}</p>
                <p className="text-xs text-gray-500">{new Date(log.created_date).toLocaleString('pt-BR')}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                log.status === 'delivered' ? 'bg-green-100 text-green-700' :
                log.status === 'bounced' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {log.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SUPPRESSIONS TAB ====================
function SuppressionsTab({ activeSubTab }) {
  return <MockupTab nome={`Suppressions > ${activeSubTab?.replace('_', ' ') || 'Overview'}`} />;
}

// ==================== SETTINGS TAB ====================
function SettingsTab({ activeSubTab }) {
  if (!activeSubTab || activeSubTab === 'sender_auth') {
    return <SenderAuthentication />;
  }
  if (activeSubTab === 'inbound_parse') {
    return <InboundParse />;
  }
  if (activeSubTab === 'api_keys') {
    return <APIKeys />;
  }
  return <MockupTab nome={`Settings > ${activeSubTab?.replace('_', ' ')}`} />;
}

function SenderAuthentication() {
  const queryClient = useQueryClient();
  const [adicionandoDominio, setAdicionandoDominio] = useState(false);
  const [novoDominio, setNovoDominio] = useState('');
  const [clinicaEscolhida, setClinicaEscolhida] = useState('');

  const { data: clinicas = [] } = useQuery({
    queryKey: ['clinicas-all'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarClinicas', {});
      return res.data.clinicas || [];
    }
  });

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['sendgrid-domains'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSendGridDomains', {});
      return res.data.domains || [];
    }
  });

  const sincronizarMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('sincronizarSendGrid', {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sendgrid-domains']);
      toast.success('✅ Sincronizado');
    }
  });

  const adicionarMutation = useMutation({
    mutationFn: async ({ domain, clinica_id }) => {
      const res = await base44.functions.invoke('adicionarDominioClinica', { domain, clinica_id });
      return res.data;
    },
    onSuccess: () => {
      toast.success('✅ Domínio adicionado!');
      queryClient.invalidateQueries(['sendgrid-domains']);
      setAdicionandoDominio(false);
      setNovoDominio('');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ domainId, configId }) => {
      const res = await base44.functions.invoke('verificarDNSDominio', { domain_id: domainId, config_id: configId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['sendgrid-domains']);
      toast[data.valid ? 'success' : 'warning'](data.valid ? '✅ DNS verificado!' : '⏳ DNS propagando');
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Domínios Autenticados</h3>
          <p className="text-sm text-gray-600">DKIM/SPF por clínica (isolamento multi-tenant)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => sincronizarMutation.mutate()} disabled={sincronizarMutation.isPending} className="px-4 py-2 rounded-lg border font-medium flex items-center gap-2">
            {sincronizarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar
          </button>
          <button onClick={() => setAdicionandoDominio(true)} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
            <Plus className="w-4 h-4" />Adicionar
          </button>
        </div>
      </div>

      {adicionandoDominio && (
        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#7E57FF', backgroundColor: '#f5f3ff' }}>
          <h4 className="font-bold mb-3">Adicionar Domínio Clínica</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={clinicaEscolhida} onChange={(e) => setClinicaEscolhida(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Selecione clínica...</option>
              {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input type="text" value={novoDominio} onChange={(e) => setNovoDominio(e.target.value)} placeholder="clinica.med.br" className="px-3 py-2 border rounded-lg text-sm font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => adicionarMutation.mutate({ domain: novoDominio, clinica_id: clinicaEscolhida })} disabled={!novoDominio || !clinicaEscolhida || adicionarMutation.isPending} className="flex-1 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
              {adicionarMutation.isPending ? 'Adicionando...' : 'Adicionar'}
            </button>
            <button onClick={() => setAdicionandoDominio(false)} className="px-4 py-2 rounded-lg border text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {domains.map(domain => (
          <DomainCard key={domain.id} domain={domain} onVerify={() => verifyMutation.mutate({ domainId: domain.id, configId: domain.config_id })} isVerifying={verifyMutation.isPending} />
        ))}
      </div>
    </div>
  );
}

function DomainCard({ domain, onVerify, isVerifying }) {
  const [showDNS, setShowDNS] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 flex items-center gap-3">
          {domain.valid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <div>
            <h4 className="font-semibold">{domain.domain}</h4>
            <p className="text-xs text-gray-500">{domain.valid ? '✓ Verificado' : '⚠ Aguardando DNS'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDNS(!showDNS)} className="px-3 py-1.5 rounded-lg border text-sm">{showDNS ? 'Ocultar' : 'Ver'} DNS</button>
          {!domain.valid && <button onClick={onVerify} disabled={isVerifying} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#7E57FF', color: 'white' }}><RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} /></button>}
        </div>
      </div>

      {showDNS && domain.dns && (
        <div className="space-y-3 mt-4">
          {Object.entries(domain.dns).map(([type, record]) => (
            <div key={type} className="p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase text-gray-600">{type}</span>
                {record.valid ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Host:</span>
                  <code className="font-mono">{record.host}</code>
                  <button onClick={() => { navigator.clipboard.writeText(record.host); toast.success("Copiado"); }}><Copy className="w-3 h-3" /></button>
                </div>
                <div>
                  <span className="text-gray-600 block mb-1">Valor:</span>
                  <code className="font-mono text-[10px] block break-all bg-white p-2 rounded">{record.data}</code>
                  <button onClick={() => { navigator.clipboard.writeText(record.data); toast.success("Copiado"); }} className="text-xs text-blue-600 hover:underline mt-1">Copiar valor</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InboundParse() {
  const [filtro, setFiltro] = useState('todos');
  const queryClient = useQueryClient();

  const { data: webhooksAtivos = [], isLoading: loadingWebhooks } = useQuery({
    queryKey: ['sendgrid-webhooks-parse'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listarInboundParse', {});
      return res.data.webhooks || [];
    }
  });

  const { data: emailsEnviados = [] } = useQuery({
    queryKey: ['emails-enviados-recent'],
    queryFn: async () => {
      return await base44.entities.SendGridAuditoria.list('-created_date', 20);
    }
  });

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['emails-recebidos', filtro],
    queryFn: async () => {
      let query = {};
      if (filtro !== 'todos') query.processed = filtro === 'processados';
      return await base44.entities.EmailRecebido.filter(query, '-created_date', 50);
    },
    refetchInterval: 10000
  });

  const { data: mensagensTickets } = useQuery({
    queryKey: ['mensagens-tickets-email'],
    queryFn: async () => {
      return await base44.entities.MensagemTicket.filter({ remetente_tipo: { $in: ['cliente', 'sistema'] } }, '-created_date', 100);
    }
  });

  const reprocessarMutation = useMutation({
    mutationFn: async (email) => {
      const res = await base44.functions.invoke('testarRecebimentoEmail', { to: email.to_email, from: email.from_email, subject: email.subject, text: email.body_text, html: email.body_html });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['emails-recebidos']);
      toast.success('Email reprocessado');
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Webhooks Cadastrados */}
      <div className="pc-card p-6">
        <h3 className="font-semibold mb-4">Inbound Parse Cadastrados</h3>
        {webhooksAtivos.length > 0 ? (
          <div className="space-y-3">
            {webhooksAtivos.map((wh, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <code className="text-sm font-mono">{wh.hostname}</code>
                </div>
                <p className="text-xs text-gray-600 truncate">{wh.url}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="font-medium text-yellow-800">Nenhum webhook cadastrado</p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5" style={{ color: '#7E57FF' }} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="px-3 py-2 rounded-lg border">
          <option value="todos">Todos</option>
          <option value="processados">✅ Processados</option>
          <option value="nao_processados">❌ Falharam</option>
        </select>
        <div className="ml-auto text-sm text-gray-600">{emails.length} email(s)</div>
      </div>

      {/* Lista com THREADS COMPLETOS */}
      <div className="space-y-3">
        {emails.map(email => {
          const threadMensagens = mensagensTickets?.filter(m => m.ticket_id === email.ticket_id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) || [];

          return (
            <div key={email.id} className="pc-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {email.processed ? <CheckCircle className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{email.subject}</h4>
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">De:</span> {email.from_email} <span className="mx-2">→</span> <span className="font-medium">Para:</span> {email.to_email}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(email.created_date).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!email.processed && (
                    <button onClick={() => reprocessarMutation.mutate(email)} disabled={reprocessarMutation.isPending} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#7E57FF', color: 'white' }}>
                      <RefreshCw className={`w-4 h-4 ${reprocessarMutation.isPending ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {email.processed ? (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-green-800">✅ Processado</p>
                  {email.ticket_id && <p className="text-xs text-green-600 mt-1">Ticket: {email.ticket_id}</p>}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-800">❌ Erro</p>
                  {email.error_message && <p className="text-xs text-red-600 mt-1">{email.error_message}</p>}
                </div>
              )}

              <details className="mt-3">
                <summary className="text-sm font-medium text-gray-600 cursor-pointer">
                  <Eye className="w-4 h-4 inline mr-2" />Ver thread completo ({threadMensagens.length + 1} mensagens)
                </summary>
                <div className="mt-2 space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-blue-700 mb-1">📧 Email Original (Cliente):</p>
                    <pre className="text-xs whitespace-pre-wrap">{email.body_text}</pre>
                  </div>

                  {threadMensagens.length > 0 && (
                    <div className="space-y-2">
                      {threadMensagens.map((msg) => (
                        <div key={msg.id} className={`p-3 rounded-lg border-l-4 ${
                          msg.remetente_tipo === 'cliente' ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-400'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold">{msg.remetente_tipo === 'cliente' ? '👤 Cliente' : '🤖 Sistema'}</span>
                            <span className="text-xs text-gray-500">{new Date(msg.created_date).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-xs">{msg.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function APIKeys() {
  const [showKey, setShowKey] = useState(false);
  
  const apiKey = 'Configure via Secrets';

  return (
    <div className="space-y-6">
      <div className="pc-card p-6">
        <h3 className="font-semibold mb-4">SendGrid API Key</h3>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-3 rounded-lg bg-gray-100 font-mono text-sm">
            {showKey ? apiKey : '••••••••••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="px-4 py-3 rounded-lg border">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => { navigator.clipboard.writeText(apiKey); toast.success('Copiado'); }} className="px-4 py-3 rounded-lg border">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">Configure em: SuperAdmin → Conectores → Secrets → SENDGRID_API_KEY</p>
      </div>

      <div className="pc-card p-6">
        <h3 className="font-semibold mb-4">Webhook Validation Token</h3>
        <code className="block px-4 py-3 rounded-lg bg-gray-100 font-mono text-xs">
          {'Configure via Secrets'}
        </code>
        <p className="text-xs text-gray-500 mt-3">Configure em: SuperAdmin → Conectores → Secrets → SENDGRID_WEBHOOK_VALIDATION_TOKEN</p>
      </div>
    </div>
  );
}