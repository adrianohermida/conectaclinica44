import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { 
  Mail, Send, Shield, CheckCircle, XCircle, AlertCircle, 
  Globe, Plus, RefreshCw, ExternalLink, Copy, Settings,
  Users, BarChart3, Zap, Eye, Database, Key, Info, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BotaoPopularTemplates from "@/components/sendgrid/BotaoPopularTemplates";
import BotaoPopularSprint2 from "@/components/sendgrid/BotaoPopularSprint2";
import BotaoPopularSprint3 from "@/components/sendgrid/BotaoPopularSprint3";
import BotaoPopularSprint4 from "@/components/sendgrid/BotaoPopularSprint4";
import BotaoConfigurarLGPD from "@/components/sendgrid/BotaoConfigurarLGPD";
import EmailDebugPanel from "@/components/sendgrid/EmailDebugPanel";
import WizardSetupSendGrid from "@/components/sendgrid/WizardSetupSendGrid";

function SendGridContent() {
  const [activeTab, setActiveTab] = useState('domains');
  const [testEmail, setTestEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: sendgridStatus, isLoading } = useQuery({
    queryKey: ['sendgrid-status'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridStatus', {});
      return response.data;
    },
    staleTime: 30000
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email) => {
      const response = await base44.functions.invoke('testSendGridEmail', { email });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Email de teste enviado!');
      setTestEmail('');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const tabs = [
    { id: 'domains', label: 'Domínios', icon: Globe },
    { id: 'senders', label: 'Remetentes', icon: Users },
    { id: 'templates', label: 'Templates', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'bounces', label: 'Bounces/Spam', icon: AlertCircle },
    { id: 'webhooks', label: 'Webhooks', icon: Zap },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <WizardSetupSendGrid />

      <div className="pc-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${sendgridStatus?.api_connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold">
              {sendgridStatus?.api_connected ? 'SendGrid Conectado' : 'SendGrid Desconectado'}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{sendgridStatus?.emails_sent_today || 0} enviados hoje</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>{sendgridStatus?.domains_verified || 0} domínios verificados</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="pc-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Send className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <h3 className="font-semibold">Teste Rápido</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <Button
              size="sm"
              onClick={() => testEmailMutation.mutate(testEmail)}
              disabled={!testEmail || testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>

        <div className="pc-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Key className="w-5 h-5" style={{ color: '#7E57FF' }} />
            <h3 className="font-semibold">API Key</h3>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded truncate">
              {sendgridStatus?.api_key_masked || 'Não configurada'}
            </code>
            <Button size="sm" variant="ghost" icon={<Eye className="w-4 h-4" />} />
          </div>
        </div>

        <div className="pc-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5" style={{ color: sendgridStatus?.webhooks_active > 0 ? '#34a853' : '#ea4335' }} />
            <h3 className="font-semibold">Webhooks</h3>
          </div>
          <div className={`px-3 py-2 rounded-lg text-sm font-semibold mb-2 ${
            sendgridStatus?.webhooks_active > 0 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {sendgridStatus?.webhooks_active > 0 ? '✅ Ativo' : '❌ Não configurado'}
          </div>
          {sendgridStatus?.webhook_url && (
            <p className="text-xs text-gray-600 truncate" title={sendgridStatus.webhook_url}>
              {sendgridStatus.webhook_url}
            </p>
          )}
        </div>
      </div>

      <div className="pc-card mb-6">
        <div className="border-b" style={{ borderColor: '#e8eaed' }}>
          <div className="flex gap-1 p-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#f5f3ff] text-[#7E57FF]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'domains' && <DomainsTab />}
          {activeTab === 'senders' && <SendersTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <AnalyticsTab />
              <EmailDebugPanel />
            </div>
          )}
          {activeTab === 'bounces' && <BouncesTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DomainVerifyButton({ domainId, configId }) {
  const queryClient = useQueryClient();
  const [verificando, setVerificando] = useState(false);

  return (
    <button
      onClick={async () => {
        setVerificando(true);
        try {
          const res = await base44.functions.invoke('verificarDNSDominio', { 
            domain_id: domainId,
            config_id: configId
          });
          
          if (res.data.valid) {
            toast.success('✅ DNS verificado!', {
              description: res.data.message
            });
            queryClient.invalidateQueries(['sendgrid-domains']);
            queryClient.invalidateQueries(['config-email']);
          } else {
            toast.warning('⏳ DNS ainda não propagado', {
              description: res.data.message
            });
          }
        } catch (error) {
          toast.error('❌ Erro ao verificar', { description: error.message });
        } finally {
          setVerificando(false);
        }
      }}
      disabled={verificando}
      className="mt-3 w-full px-4 py-2 rounded-lg border-2 font-bold text-sm hover:opacity-90 disabled:opacity-50"
      style={{ 
        borderColor: '#7E57FF',
        backgroundColor: verificando ? '#f5f3ff' : '#7E57FF',
        color: verificando ? '#7E57FF' : 'white'
      }}
    >
      {verificando ? '⏳ Verificando...' : '🔍 Verificar DNS Agora'}
    </button>
  );
}

function DomainsTab() {
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

  const { data: domains = [] } = useQuery({
    queryKey: ['sendgrid-domains'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridDomains', {});
      return response.data.domains || [];
    }
  });

  const adicionarMutation = useMutation({
    mutationFn: async ({ domain, clinica_id }) => {
      const res = await base44.functions.invoke('adicionarDominioClinica', { domain, clinica_id });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('✅ Domínio adicionado!', {
        description: 'Configure os registros DNS no seu provedor'
      });
      queryClient.invalidateQueries(['sendgrid-domains']);
      queryClient.invalidateQueries(['config-email']);
      setAdicionandoDominio(false);
      setNovoDominio('');
    },
    onError: (error) => {
      toast.error('❌ Erro ao adicionar', { description: error.message });
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Domínios Autenticados</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => setAdicionandoDominio(!adicionandoDominio)}
            icon={<Plus className="w-4 h-4" />}
          >
            Adicionar Domínio Clínica
          </Button>
          <Button size="sm" variant="outline" icon={<ExternalLink className="w-4 h-4" />}
            onClick={() => window.open('https://app.sendgrid.com/settings/sender_auth', '_blank')}
          >
            Ver no SendGrid
          </Button>
        </div>
      </div>

      {adicionandoDominio && (
        <div className="mb-6 p-4 rounded-xl border-2" style={{ borderColor: '#7E57FF', backgroundColor: '#f5f3ff' }}>
          <h4 className="font-bold mb-3">➕ Adicionar Domínio Próprio da Clínica</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1">Clínica</label>
              <select
                value={clinicaEscolhida}
                onChange={(e) => setClinicaEscolhida(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Selecione...</option>
                {clinicas.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Domínio</label>
              <input
                type="text"
                value={novoDominio}
                onChange={(e) => setNovoDominio(e.target.value)}
                placeholder="prevenclin.med.br"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => adicionarMutation.mutate({ domain: novoDominio, clinica_id: clinicaEscolhida })}
              disabled={!novoDominio || !clinicaEscolhida || adicionarMutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
            >
              {adicionarMutation.isPending ? '⏳ Adicionando...' : '✅ Adicionar'}
            </button>
            <button
              onClick={() => setAdicionandoDominio(false)}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {domains.map(domain => (
          <div key={domain.id} className="border rounded-lg p-4" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{domain.domain}</h4>
                  {domain.valid && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {!domain.valid && <XCircle className="w-4 h-4 text-red-600" />}
                </div>
                <p className="text-xs text-gray-500 mt-1">ID: {domain.id}</p>
              </div>
              <Button size="sm" variant="ghost" icon={<Settings className="w-4 h-4" />} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-gray-600 mb-1">DKIM</p>
                <div className="flex items-center gap-2">
                  {domain.dkim?.valid ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>{domain.dkim?.valid ? 'Verificado' : 'Pendente'}</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-600 mb-1">SPF</p>
                <div className="flex items-center gap-2">
                  {domain.spf?.valid ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  )}
                  <span>{domain.spf?.valid ? 'Verificado' : 'Pendente'}</span>
                </div>
              </div>
            </div>

            {!domain.valid && domain.dns?.dkim_records && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Registros DNS Pendentes:</p>
                <div className="space-y-2">
                  {domain.dns.dkim_records.map((record, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-white px-2 py-1 rounded flex-1 font-mono">
                          {record.host}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(record.host);
                            toast.success('Host copiado!');
                          }}
                          className="p-1 hover:bg-yellow-100 rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <code className="text-[10px] bg-white px-2 py-1 rounded block break-all font-mono">
                        {record.data}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(record.data);
                          toast.success('Valor copiado!');
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Copiar valor
                      </button>
                    </div>
                  ))}
                </div>
                
                <DomainVerifyButton domainId={domain.id} configId={domain.config_id} />
              </div>
            )}
          </div>
        ))}

        {domains.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum domínio configurado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SendersTab() {
  const { data: senders = [], isLoading } = useQuery({
    queryKey: ['sendgrid-senders'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridSenders', {});
      return response.data.senders || [];
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Remetentes Verificados</h3>
      </div>

      <div className="space-y-3">
        {senders.map(sender => (
          <div key={sender.id} className="border rounded-lg p-4" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{sender.from_name || sender.from_email}</h4>
                <p className="text-sm text-gray-600">{sender.from_email}</p>
              </div>
              <div className="flex items-center gap-2">
                {sender.verified ? (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: '#e6f7ed' }}>
                    <CheckCircle className="w-4 h-4" style={{ color: '#34a853' }} />
                    <span className="text-xs font-semibold" style={{ color: '#137333' }}>Verificado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: '#fef9e5' }}>
                    <AlertCircle className="w-4 h-4" style={{ color: '#fbbc04' }} />
                    <span className="text-xs font-semibold" style={{ color: '#956802' }}>Pendente</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {senders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum remetente configurado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const queryClient = useQueryClient();
  const [novoTemplate, setNovoTemplate] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['sendgrid-templates'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridTemplates', {});
      return response.data;
    }
  });

  const templates = templatesData?.templates || [];

  const createTemplateMutation = useMutation({
    mutationFn: async (name) => {
      const response = await base44.functions.invoke('createSendGridTemplate', { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sendgrid-templates']);
      setNovoTemplate('');
      setShowNewForm(false);
      toast.success('✅ Template criado');
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async ({ template_id, new_name }) => {
      const response = await base44.functions.invoke('duplicateSendGridTemplate', { template_id, new_name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sendgrid-templates']);
      toast.success('✅ Template duplicado');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (template_id) => {
      const response = await base44.functions.invoke('deleteSendGridTemplate', { template_id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sendgrid-templates']);
      toast.success('🗑️ Template excluído');
    }
  });

  if (isLoading) {
    return <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Dynamic Templates</h3>
          <p className="text-sm text-gray-600">{templates.length} template(s) • Design visual profissional</p>
        </div>
        <Button
          onClick={() => setShowNewForm(!showNewForm)}
          icon={<Plus className="w-4 h-4" />}
        >
          Novo Template
        </Button>
      </div>

      {showNewForm && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50" style={{ borderColor: '#e8eaed' }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            createTemplateMutation.mutate(novoTemplate);
          }} className="flex gap-2">
            <Input
              placeholder="Nome do template..."
              value={novoTemplate}
              onChange={(e) => setNovoTemplate(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={createTemplateMutation.isPending}>
              {createTemplateMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
              Cancelar
            </Button>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(template => (
          <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all" style={{ borderColor: '#e8eaed' }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{template.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  template.generation === 'dynamic' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.generation === 'dynamic' ? '🎨 Dynamic' : '📄 Legacy'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>ID: <code className="px-1 bg-gray-100 rounded">{template.id}</code></span>
                <span>• {template.versions?.length || 0} versão(ões)</span>
                {template.updated_at && (
                  <span>• Atualizado: {new Date(template.updated_at).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://mc.sendgrid.com/dynamic-templates/${template.id}`, '_blank')}
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const name = prompt('Nome da cópia:', `${template.name} (cópia)`);
                  if (name) duplicateTemplateMutation.mutate({ template_id: template.id, new_name: name });
                }}
                disabled={duplicateTemplateMutation.isPending}
                icon={<Copy className="w-4 h-4" />}
              >
                Duplicar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm(`Excluir template "${template.name}"?`)) {
                    deleteTemplateMutation.mutate(template.id);
                  }
                }}
                disabled={deleteTemplateMutation.isPending}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum template criado</p>
            <p className="text-xs mt-1">Crie templates visuais profissionais para emails transacionais</p>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">💡 Dynamic Templates</p>
            <p>Templates visuais com editor drag-and-drop no SendGrid. Use para emails transacionais profissionais.</p>
            <p className="mt-1"><strong>Editar:</strong> Clique em "Editar" para acessar o editor visual no SendGrid.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BouncesTab() {
  const queryClient = useQueryClient();
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const { data: bouncesData, isLoading } = useQuery({
    queryKey: ['sendgrid-bounces'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridBounces', {});
      return response.data;
    }
  });

  const bounces = bouncesData?.bounces || [];
  const stats = bouncesData?.stats || { total: 0, bounces: 0, spam_reports: 0 };

  const removeMutation = useMutation({
    mutationFn: async ({ email, type }) => {
      const response = await base44.functions.invoke('removeSendGridSuppression', { email, type });
      if (!response.data.success) throw new Error(response.data.error);
      return email;
    },
    onSuccess: (email) => {
      toast.success(`✅ ${email} removido da lista`);
      queryClient.invalidateQueries(['sendgrid-bounces']);
      setSelectedEmails(prev => prev.filter(e => e !== email));
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: async (items) => {
      const response = await base44.functions.invoke('bulkRemoveSendGridSuppressions', { items });
      if (!response.data.success) throw new Error(response.data.error);
    },
    onSuccess: () => {
      toast.success(`✅ ${selectedEmails.length} emails removidos`);
      queryClient.invalidateQueries(['sendgrid-bounces']);
      setSelectedEmails([]);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const bouncesFiltrados = bounces.filter(b => 
    filtroTipo === 'todos' || b.suppression_type === filtroTipo
  );

  if (isLoading) {
    return <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-semibold text-red-600 mb-1">Bounces</p>
          <p className="text-2xl font-bold text-red-800">{stats.bounces}</p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-600 mb-1">Spam Reports</p>
          <p className="text-2xl font-bold text-yellow-800">{stats.spam_reports}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-1">Total Bloqueados</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Lista de Supressões</h3>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos ({stats.total})</SelectItem>
              <SelectItem value="bounce">Bounces ({stats.bounces})</SelectItem>
              <SelectItem value="spam_report">Spam Reports ({stats.spam_reports})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedEmails.length > 0 && (
          <Button
            onClick={() => {
              const items = selectedEmails.map(email => {
                const item = bounces.find(b => b.email === email);
                return { email, type: item?.suppression_type || 'bounce' };
              });
              bulkRemoveMutation.mutate(items);
            }}
            disabled={bulkRemoveMutation.isPending}
            variant="danger"
          >
            Remover {selectedEmails.length} selecionados
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {bouncesFiltrados.map(item => {
          const isBounce = item.suppression_type === 'bounce';
          
          return (
            <div key={item.email} className="flex items-center justify-between p-3 border rounded-lg" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(item.email)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmails([...selectedEmails, item.email]);
                    } else {
                      setSelectedEmails(selectedEmails.filter(email => email !== item.email));
                    }
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: '#7E57FF' }}
                />
                <div className="flex-1">
                  <p className="font-medium">{item.email}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      isBounce ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {isBounce ? '🔴 Bounce' : '⚠️ Spam Report'}
                    </span>
                    {item.reason && <span>• {item.reason}</span>}
                    <span>• {new Date(item.created * 1000).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeMutation.mutate({ email: item.email, type: item.suppression_type })}
                disabled={removeMutation.isPending}
              >
                Remover
              </Button>
            </div>
          );
        })}

        {bouncesFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-600" />
            <p>Nenhum {filtroTipo === 'bounce' ? 'bounce' : filtroTipo === 'spam_report' ? 'spam report' : 'resultado'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [emailBusca, setEmailBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['sendgrid-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSendGridStats', {});
      return response.data;
    }
  });

  const buscarAtividade = async () => {
    if (!emailBusca) {
      toast.error('Digite um email');
      return;
    }

    setBuscando(true);
    try {
      const res = await base44.functions.invoke('getSendGridEmailActivity', {
        email_address: emailBusca
      });
      setResultados(res.data.messages || []);
      toast.success(`📬 ${res.data.messages?.length || 0} emails encontrados`);
    } catch (error) {
      toast.error('❌ Erro ao buscar', { description: error.message });
    } finally {
      setBuscando(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      <div className="pc-card p-4 mb-6">
        <h4 className="font-semibold mb-3">📬 Buscar Email Específico</h4>
        <p className="text-sm text-gray-600 mb-4">
          Busque detalhes completos de emails enviados/recebidos
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailBusca}
            onChange={(e) => setEmailBusca(e.target.value)}
            placeholder="email@paciente.com"
            className="flex-1 px-4 py-2 border rounded-lg font-mono text-sm"
            onKeyDown={(e) => e.key === 'Enter' && buscarAtividade()}
          />
          <button
            onClick={buscarAtividade}
            disabled={buscando}
            className="px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            {buscando ? '🔍 Buscando...' : '🔍 Buscar'}
          </button>
        </div>

        {resultados.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold">📊 {resultados.length} emails encontrados:</p>
            {resultados.map((msg, idx) => (
              <details key={idx} className="border rounded-lg p-3 text-xs" style={{ borderColor: '#e8eaed' }}>
                <summary className="cursor-pointer font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      msg.status === 'delivered' ? 'bg-green-500' :
                      msg.status === 'bounce' ? 'bg-red-500' :
                      msg.status === 'deferred' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    {msg.subject || '(sem assunto)'}
                  </span>
                  <span className="text-gray-500">{new Date(msg.last_event_time).toLocaleString('pt-BR')}</span>
                </summary>
                <div className="mt-3 space-y-2 text-xs">
                  <p><strong>De:</strong> {msg.from_email}</p>
                  <p><strong>Para:</strong> {msg.to_email}</p>
                  <p><strong>Status:</strong> <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    msg.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    msg.status === 'bounce' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{msg.status}</span></p>
                  <p><strong>Aberturas:</strong> {msg.opens_count}</p>
                  <p><strong>Cliques:</strong> {msg.clicks_count}</p>
                  <p><strong>ID Mensagem:</strong> <code className="bg-gray-100 px-1">{msg.msg_id}</code></p>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WebhooksTab() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const queryClient = useQueryClient();

  const configureWebhookMutation = useMutation({
    mutationFn: async (url) => {
      const response = await base44.functions.invoke('configureSendGridWebhook', {
        webhook_url: url,
        events: ['delivered', 'open', 'click', 'bounce', 'dropped', 'spam_report']
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Webhook configurado!');
      queryClient.invalidateQueries(['sendgrid-status']);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Event Webhook</h3>
      
      <div className="pc-card p-4 mb-4">
        <h4 className="font-semibold mb-3">Configurar Webhook</h4>
        <p className="text-sm text-gray-600 mb-4">
          Configure o webhook do SendGrid para receber eventos de entrega, abertura, cliques, etc.
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-2">URL do Webhook</label>
            <input
              type="url"
              placeholder="https://sua-app.com/functions/sendgridWebhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <Button
            onClick={() => configureWebhookMutation.mutate(webhookUrl)}
            disabled={!webhookUrl || configureWebhookMutation.isPending}
            icon={<Zap className="w-4 h-4" />}
          >
            {configureWebhookMutation.isPending ? 'Configurando...' : 'Configurar Webhook'}
          </Button>
        </div>
      </div>

      <div className="pc-card p-4">
        <h4 className="font-semibold mb-3">Eventos Monitorados</h4>
        <div className="grid grid-cols-2 gap-2">
          {['delivered', 'open', 'click', 'bounce', 'dropped', 'spam_report', 'deferred', 'processed'].map(event => (
            <div key={event} className="flex items-center gap-2 p-2 rounded border" style={{ borderColor: '#e8eaed' }}>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm capitalize">{event.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncSendGridDomains', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ Sincronizado: ${data.domains_synced} domínios, ${data.configs_updated} configs atualizadas`);
      queryClient.invalidateQueries(['sendgrid-domains']);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
      
      <div className="space-y-4">
        <div className="pc-card p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-2">API Key SendGrid</h4>
              <p className="text-sm text-gray-600 mb-3">
                Configure sua API Key nas variáveis de ambiente do app
              </p>
              <code className="text-xs bg-gray-100 px-3 py-2 rounded block">
                SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
              </code>
            </div>
          </div>
        </div>

        <div className="pc-card p-4">
          <h4 className="font-semibold mb-3">Sincronização</h4>
          <p className="text-sm text-gray-600 mb-4">
            Sincronize domínios SendGrid com ConfiguracaoEmail das clínicas
          </p>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminSendGrid() {
  return <SendGridContent />;
}