import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Mail, CheckCircle, AlertCircle, Copy, Zap, Server, Loader2, Trash2, Plus, X, Send, Info, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ConfiguracaoDominioClinica from "@/components/email/ConfiguracaoDominioClinica";

export default function ConfiguracaoEmail() {
  return (
    <RouteGuard requireAuth requireClinica>
      <ConfiguracaoEmailContent />
    </RouteGuard>
  );
}

function ConfiguracaoEmailContent() {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState(null);
  const [addingProvider, setAddingProvider] = useState(null);
  const [addingDomain, setAddingDomain] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: clinica } = useQuery({
    queryKey: ["clinica", user?.clinica_id],
    queryFn: async () => {
      const clinicas = await base44.entities.Clinica.list();
      return clinicas.find(c => c.id === user.clinica_id);
    },
    enabled: !!user?.clinica_id
  });

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["config-email", user?.clinica_id],
    queryFn: async () => {
      const configs = await base44.entities.ConfiguracaoEmail.filter({ clinica_id: user.clinica_id }, '-created_date');
      // CRITICAL: Filtrar apenas provedores que NÃO são dominio_proprio (domains são exibidos em ConfiguracaoDominioClinica)
      const filtered = configs.filter(c => c.provedor !== 'dominio_proprio');
      // CRITICAL: Remover duplicatas por provedor
      const unique = filtered.reduce((acc, config) => {
        const existing = acc.find(c => c.provedor === config.provedor);
        if (!existing || config.created_date > existing.created_date) {
          return [...acc.filter(c => c.provedor !== config.provedor), config];
        }
        return acc;
      }, []);
      return unique;
    },
    enabled: !!user?.clinica_id
  });

  const { data: sendgridDomains = [] } = useQuery({
    queryKey: ["sendgrid-domains"],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getSendGridDomains', {});
        return res.data.domains || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.role && user.role === 'admin'
  });

  const criarMutation = useMutation({
    mutationFn: async (data) => {
      // CRITICAL: ConectaClínica = verificar sender ANTES de criar config
      if (data.provedor === 'conectaclinica') {
        try {
          // 1. Verificar/adicionar sender (usa dados da clínica)
          const senderRes = await base44.functions.invoke('addSendGridSender', {
            from_email: data.email_remetente,
            from_name: data.nome_remetente || clinica?.nome,
            reply_to_email: data.email_remetente
          });

          // Se não verificado, avisar usuário e parar
          if (!senderRes.data.verified && !senderRes.data.already_exists) {
            throw new Error(`Verifique o email em ${data.email_remetente} para ativar o sender`);
          }
        } catch (error) {
          throw new Error(`Sender não verificado: ${error.message}`);
        }
      }

      // Criar configuração
      const created = await base44.entities.ConfiguracaoEmail.create({
        ...data,
        clinica_id: user.clinica_id
      });

      // CRITICAL: ConectaClínica = alias + inbound parse AUTOMÁTICO
      if (data.provedor === 'conectaclinica') {
        try {
          // 1. Criar alias
          const aliasRes = await base44.functions.invoke('configurarAliasRecebimento', {
            config_id: created.id,
            email_institucional: data.email_remetente
          });
          
          if (!aliasRes.data.success) {
            throw new Error(aliasRes.data.error || 'Falha ao criar alias');
          }

          // 2. Configurar Inbound Parse automaticamente
          const parseRes = await base44.functions.invoke('configurarInboundParse', {
            hostname: 'conectaclinica.com.br'
          });

          // 3. Atualizar config com tudo
          await base44.entities.ConfiguracaoEmail.update(created.id, {
            alias_recebimento: aliasRes.data.alias_recebimento,
            inbound_parse_configurado: parseRes.data.success || false
          });

          return {
            ...created,
            alias_recebimento: aliasRes.data.alias_recebimento,
            inbound_parse_configurado: parseRes.data.success || false
          };
        } catch (error) {
          console.error('[ConfigEmail] Erro ao configurar:', error);
          // Não falhar tudo, só avisar
        }
      }

      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["config-email"]);
      setAddingProvider(null);
      
      if (data.alias_recebimento && data.redirect_criado) {
        toast.success("Email configurado!", {
          description: `Alias criado: ${data.alias_recebimento}`
        });
      } else {
        toast.success("Email configurado");
      }
    },
    onError: (error) => {
      toast.error("Erro ao configurar", { description: error.message });
    }
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ConfiguracaoEmail.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["config-email"]);
      setEditingProvider(null);
      toast.success("Provedor atualizado");
    }
  });

  const removerMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ConfiguracaoEmail.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["config-email"]);
      toast.success("Provedor removido");
    }
  });

  const setPadraoMutation = useMutation({
    mutationFn: async (id) => {
      // Desativar todos
      await Promise.all(providers.map(p => 
        base44.entities.ConfiguracaoEmail.update(p.id, { provedor_padrao: false })
      ));
      // Ativar escolhido
      return await base44.entities.ConfiguracaoEmail.update(id, { provedor_padrao: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["config-email"]);
      toast.success("Provedor padrão definido");
    }
  });

  const testarMutation = useMutation({
    mutationFn: async (providerId) => {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) throw new Error('Provedor não encontrado');

      // Enviar email de teste REAL
      const res = await base44.functions.invoke('testSendGridEmail', {
        to_email: user.email,
        subject: 'Teste de Configuração - ConectaClínica',
        text: `Este é um email de teste enviado de ${provider.nome_remetente} (${provider.email_remetente}).`,
        from_email: provider.email_remetente,
        from_name: provider.nome_remetente
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["config-email"]);
      if (data.success) {
        toast.success("✅ Email de teste enviado!", { 
          description: `Verifique ${user.email}` 
        });
      } else {
        toast.error("❌ Falha no envio", { 
          description: data.error || 'Verifique as configurações' 
        });
      }
    },
    onError: (error) => {
      toast.error("❌ Erro ao testar", { description: error.message });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, field, value, provider }) => {
      // CRÍTICO: Se ativando "ativo" em ConectaClínica, SEMPRE configurar Inbound Parse se pendente
      if (field === 'ativo' && value === true && provider.provedor === 'conectaclinica') {
        try {
          // Se alias não existe, criar tudo
          if (!provider.alias_recebimento) {
            const aliasRes = await base44.functions.invoke('configurarAliasRecebimento', {
              config_id: id,
              email_institucional: provider.email_remetente
            });
            
            if (!aliasRes.data.success) {
              throw new Error(aliasRes.data.error || 'Falha ao gerar alias');
            }
            
            return await base44.entities.ConfiguracaoEmail.update(id, { 
              [field]: value,
              alias_recebimento: aliasRes.data.alias_recebimento,
              inbound_parse_configurado: aliasRes.data.redirect_criado || false
            });
          }
          
          // Se alias existe MAS Inbound Parse não configurado, configurar agora
          if (!provider.inbound_parse_configurado) {
            const parseRes = await base44.functions.invoke('configurarInboundParse', {
              hostname: 'conectaclinica.com.br'
            });
            
            if (!parseRes.data.success) {
              throw new Error(parseRes.data.error || 'Falha ao configurar Inbound Parse');
            }
            
            return await base44.entities.ConfiguracaoEmail.update(id, { 
              [field]: value,
              inbound_parse_configurado: true
            });
          }
        } catch (error) {
          // Registrar incidente
          await base44.functions.invoke('registrarIncidente', {
            modulo: 'email',
            severidade: 'critico',
            tipo_erro: 'inbound_parse_falhou',
            mensagem_erro: error.message,
            contexto: { config_id: id, alias: provider.alias_recebimento },
            clinica_id: user.clinica_id,
            usuario_email: user.email
          });
          throw error;
        }
      }
      
      return await base44.entities.ConfiguracaoEmail.update(id, { [field]: value });
    },
    onMutate: async ({ id, field, value }) => {
      // Optimistic UI
      await queryClient.cancelQueries(["config-email"]);
      const previous = queryClient.getQueryData(["config-email"]);
      
      queryClient.setQueryData(["config-email"], (old) => 
        old.map(p => p.id === id ? { ...p, [field]: value } : p)
      );
      
      return { previous };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["config-email"]);
      const fieldLabels = {
        ativo: 'Recebimento de emails',
        enviar_confirmacao_automatica: 'Confirmação automática',
        usar_nome_agente_resposta: 'Nomes de agentes',
        incluir_historico_email: 'Histórico de conversas',
        detectar_auto_reply: 'Detectar respostas automáticas'
      };
      
      if (variables.field === 'ativo' && variables.value && data.alias_recebimento) {
        toast.success(`✅ Email ativado!`, {
          description: `Alias: ${data.alias_recebimento}`
        });
      } else {
        toast.success(`✅ ${fieldLabels[variables.field]} ${variables.value ? 'ativado' : 'desativado'}`);
      }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic
      if (context?.previous) {
        queryClient.setQueryData(["config-email"], context.previous);
      }
      
      toast.error("❌ Erro ao salvar", { 
        description: error.message,
        action: {
          label: "Tentar novamente",
          onClick: () => toggleMutation.mutate(variables)
        }
      });
    }
  });

  const providerOptions = [
    { 
      value: 'conectaclinica', 
      label: 'ConectaClínica (Padrão)', 
      icon: Zap, 
      color: '#7E57FF', 
      badge: 'Recomendado',
      desc: 'Email gerenciado - funciona em 2 minutos'
    },
    { 
      value: 'smtp_custom', 
      label: 'SMTP Próprio', 
      icon: Server, 
      color: '#5f6368',
      badge: 'Avançado',
      desc: 'Use seu próprio servidor de email'
    }
  ];

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Configuração de Email" />
        <div className="pc-card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#5f6368' }} />
        </div>
      </div>
    );
  }

  const providerPadrao = providers.find(p => p.provedor_padrao);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Configuração de Email"
        description="Configure email para enviar notificações e receber tickets"
        breadcrumbs={[
          { label: "Administração", url: "/Administracao" },
          { label: "Email" }
        ]}
      />

      {/* Configuração de Domínio - Todas as clínicas */}
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2" style={{ color: '#202124' }}>
          Configurar Domínio Próprio
        </h2>
        <p className="text-sm mb-4" style={{ color: '#5f6368' }}>
          Use seu próprio domínio (ex: contato@suaclinica.com.br) para enviar emails profissionais
        </p>
        <ConfiguracaoDominioClinica clinica={clinica} />
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 rounded-xl p-4 border" style={{ borderColor: '#bae6fd' }}>
        <div className="flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#0284c7' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#075985' }}>
              Envio e Recebimento de Emails
            </p>
            <p className="text-xs mt-1" style={{ color: '#0c4a6e' }}>
              Configure como sua clínica envia emails de notificação e recebe emails que viram tickets automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Configurações de Email */}
      <div className="bg-white rounded-2xl border" style={{ borderColor: '#e8eaed' }}>
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#f1f3f4' }}>
          <div>
            <h2 className="text-lg font-normal" style={{ color: '#202124' }}>Suas configurações de email</h2>
            <p className="text-sm mt-0.5" style={{ color: '#5f6368' }}>
              {providers.length === 0 ? 'Configure seu primeiro email' : `${providers.length} configuração(ões)`}
            </p>
          </div>
          {providers.length > 0 && (
            <button
              onClick={() => setAddingProvider('escolher')}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 border hover:bg-gray-50"
              style={{ borderColor: '#e8eaed' }}
            >
              <Plus className="w-4 h-4" />
              Adicionar outro
            </button>
          )}
        </div>

        {providers.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: '#7E57FF', opacity: 0.3 }} />
            <p className="text-base font-medium mb-2" style={{ color: '#202124' }}>
              Configure seu email
            </p>
            <p className="text-sm mb-6" style={{ color: '#5f6368' }}>
              Escolha como deseja enviar e receber emails
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {providerOptions.map(({ value, label, icon: Icon, color, badge, desc }) => (
                <button
                  key={value}
                  onClick={() => setAddingProvider(value)}
                  className="p-6 rounded-xl border-2 hover:border-[#7E57FF] transition-all text-left"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium" style={{ color: '#202124' }}>{label}</p>
                    {badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#e6f7ed', color: '#1f6332' }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#5f6368' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f1f3f4' }}>
            {providers.map((provider) => {
              const option = providerOptions.find(o => o.value === provider.provedor);
              const Icon = option?.icon || Mail;
              
              return (
                <ProviderCard 
                  key={provider.id}
                  provider={provider}
                  option={option}
                  user={user}
                  onTest={() => testarMutation.mutate(provider.id)}
                  onEdit={() => setEditingProvider(provider)}
                  onRemove={() => {
                    if (confirm('Tem certeza? Esta ação não pode ser desfeita.')) {
                      removerMutation.mutate(provider.id);
                    }
                  }}
                  onToggle={(field, value, prov) => toggleMutation.mutate({ id: provider.id, field, value, provider: prov })}
                  isTestingProvider={testarMutation.isPending && testarMutation.variables === provider.id}
                  isTogglingField={toggleMutation.isPending && toggleMutation.variables?.id === provider.id ? toggleMutation.variables.field : null}
                />
              );
            })}
          </div>
        )}
      </div>





      {/* Modal: Escolher Provedor */}
      {addingProvider === 'escolher' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-normal" style={{ color: '#202124' }}>Como deseja configurar?</h3>
              <button onClick={() => setAddingProvider(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providerOptions.map(({ value, label, icon: Icon, color, badge, desc }) => (
                <button
                  key={value}
                  onClick={() => setAddingProvider(value)}
                  className="p-6 rounded-xl border-2 hover:border-[#7E57FF] transition-all text-left"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium" style={{ color: '#202124' }}>{label}</p>
                    {badge && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#e6f7ed', color: '#1f6332' }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#5f6368' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurar Provedor */}
      {(addingProvider && addingProvider !== 'escolher') && (
        <FormProvedor
          provedor={addingProvider}
          clinica={clinica}
          onSave={(data) => criarMutation.mutate(data)}
          onClose={() => setAddingProvider(null)}
          isLoading={criarMutation.isPending}
        />
      )}

      {/* Modal: Editar Provedor */}
      {editingProvider && (
        <FormProvedor
          provedor={editingProvider.provedor}
          initialData={editingProvider}
          clinica={clinica}
          onSave={(data) => atualizarMutation.mutate({ id: editingProvider.id, data })}
          onClose={() => setEditingProvider(null)}
          isLoading={atualizarMutation.isPending}
        />
      )}
    </div>
  );
}

function ProviderCard({ provider, option, user, onTest, onEdit, onRemove, onToggle, isTestingProvider, isTogglingField }) {
  const Icon = option?.icon || Mail;
  const [diagnosticando, setDiagnosticando] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [resultadoDiag, setResultadoDiag] = useState(null);
  
  return (
    <div className="border-b last:border-0" style={{ borderColor: '#f1f3f4' }}>
      <div className="p-4 sm:p-6">
        {/* Header - Mobile Optimized */}
        <div className="flex items-start gap-3 sm:gap-4 mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${option?.color || '#5f6368'}15` }}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: option?.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium text-sm sm:text-base" style={{ color: '#202124' }}>{provider.nome_remetente}</h3>
              {provider.ativo && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#e6f7ed', color: '#1f6332' }}>
                  ✓ Ativo
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-mono break-all" style={{ color: '#5f6368' }}>
              {provider.email_remetente}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">

            <button
              onClick={async () => {
                const toastId = toast.loading('🔍 Verificando sender...');

                try {
                  // 1. Verificar/adicionar sender
                  const addSenderRes = await base44.functions.invoke('addSendGridSender', {
                    from_email: provider.email_remetente,
                    from_name: provider.nome_remetente,
                    reply_to_email: provider.email_remetente
                  });

                  // Sender não verificado - parar aqui
                  if (!addSenderRes.data.already_exists || !addSenderRes.data.verified) {
                    toast.dismiss(toastId);
                    toast.warning('📧 Email de verificação enviado!', {
                      description: (
                        <div className="space-y-2">
                          <p className="font-medium">Próximos passos:</p>
                          <ol className="text-xs list-decimal ml-4 space-y-1">
                            <li>Abra o email em <strong>{provider.email_remetente}</strong></li>
                            <li>Clique no link de verificação do SendGrid</li>
                            <li>Volte aqui e teste novamente</li>
                          </ol>
                        </div>
                      ),
                      duration: 15000
                    });
                    return;
                  }

                  // 2. Sender verificado - enviar teste
                  toast.dismiss(toastId);
                  const testToast = toast.loading('📤 Enviando email de teste...');

                  const res = await base44.functions.invoke('testSendGridEmail', {
                    to_email: user.email,
                    from_email: provider.email_remetente,
                    from_name: provider.nome_remetente
                  });

                  toast.dismiss(testToast);

                  if (res.data.success) {
                    toast.success('✅ Email de teste enviado!', {
                      description: `Verifique ${user.email} (inbox ou spam)`,
                      duration: 10000
                    });
                  } else {
                    toast.error('❌ Falha no envio', { 
                      description: res.data.error
                    });
                  }
                } catch (error) {
                  toast.dismiss(toastId);
                  toast.error('❌ Erro', { description: error.message });
                }
              }}
              className="px-4 py-2 rounded-lg border-2 font-bold text-sm hover:opacity-90 flex items-center gap-2"
              style={{ 
                borderColor: '#7E57FF',
                backgroundColor: '#7E57FF',
                color: 'white',
                minHeight: '48px',
                minWidth: '120px'
              }}
            >
              <Send className="w-4 h-4" />
              <span>Enviar Teste</span>
            </button>
            <button
              onClick={onRemove}
              className="p-2 hover:bg-red-50 rounded-lg"
              style={{ color: '#ea4335' }}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" style={{ color: '#5f6368' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Receber tickets - ConectaClínica */}
        {provider.provedor === 'conectaclinica' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ backgroundColor: provider.ativo ? '#e6f7ed' : '#f8f9fa', border: `1px solid ${provider.ativo ? '#34a853' : '#e8eaed'}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium" style={{ color: '#202124' }}>
                    📬 Receber tickets por email
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#5f6368' }}>
                    {provider.ativo 
                      ? '✓ Ativo - emails viram tickets automaticamente'
                      : 'Ative para receber emails como tickets'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isTogglingField === 'ativo' && (
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7E57FF' }} />
                  )}
                  <Switch
                    checked={provider.ativo === true}
                    onCheckedChange={(v) => onToggle('ativo', v, provider)}
                    disabled={isTogglingField === 'ativo'}
                  />
                </div>
              </div>
              
              {/* Status Inbound Parse */}
              {provider.ativo && !provider.inbound_parse_configurado && (
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#fef9e5', border: '1px solid #fbbc04' }}>
                  <div className="flex items-start gap-2">
                    <Loader2 className="w-4 h-4 animate-spin mt-0.5 flex-shrink-0" style={{ color: '#fbbc04' }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: '#956802' }}>
                        ⚙️ Configurando recebimento...
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#956802' }}>
                        Recarregue em 10s para ver o status atualizado
                      </p>
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs font-medium hover:underline"
                      style={{ color: '#956802' }}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>
              )}
              
              {provider.ativo && provider.alias_recebimento && (
                <div>
                  <div className="flex items-center gap-2 p-3 rounded-lg mb-2" style={{ backgroundColor: 'white' }}>
                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#34a853' }} />
                    <span className="flex-1 text-xs font-mono break-all" style={{ color: '#1f6332' }}>
                      {provider.alias_recebimento}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(provider.alias_recebimento);
                        toast.success("Email copiado");
                      }}
                      className="p-2 hover:bg-gray-100 rounded flex-shrink-0"
                      style={{ minWidth: '36px', minHeight: '36px' }}
                    >
                      <Copy className="w-4 h-4" style={{ color: '#34a853' }} />
                    </button>
                  </div>
                  <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0284c7' }}>
                    <p className="font-medium mb-1" style={{ color: '#075985' }}>
                      📬 Como testar recebimento:
                    </p>
                    <ol className="space-y-1 ml-4 list-decimal" style={{ color: '#0c4a6e' }}>
                      <li>Envie um email do seu Gmail/Outlook para <code className="bg-white px-1 rounded">{provider.alias_recebimento}</code></li>
                      <li>Aguarde 30 segundos</li>
                      <li>Verifique se um ticket foi criado em Caixa de Entrada</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Comportamentos de ticket */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#9aa0a6' }}>
                Como os tickets funcionam
              </p>
              {[
                {
                  key: 'enviar_confirmacao_automatica',
                  label: 'Enviar confirmação automática',
                  desc: 'Cliente recebe email quando ticket é criado'
                },
                {
                  key: 'usar_nome_agente_resposta',
                  label: 'Mostrar nome do atendente',
                  desc: 'Emails mostram quem está respondendo'
                },
                {
                  key: 'incluir_historico_email',
                  label: 'Incluir conversa anterior',
                  desc: 'Emails mostram histórico do ticket'
                },
                {
                  key: 'detectar_auto_reply',
                  label: 'Ignorar respostas automáticas',
                  desc: 'Não cria ticket para "fora do escritório"'
                }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start sm:items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#f1f3f4' }}>
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium" style={{ color: '#202124' }}>{label}</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: '#5f6368' }}>{desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isTogglingField === key && (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#7E57FF' }} />
                    )}
                    <Switch
                      checked={provider[key] === true}
                      onCheckedChange={(v) => onToggle(key, v, provider)}
                      disabled={isTogglingField === key}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMOVIDO: Diagnóstico movido para SuperAdmin */}
        {false && mostrarDiagnostico && resultadoDiag && (
          <div className="mb-6 p-4 rounded-xl border-2" style={{ 
            backgroundColor: resultadoDiag.status === 'ok' ? '#e6f7ed' : resultadoDiag.status === 'erro' ? '#fef2f2' : '#fef9e5',
            borderColor: resultadoDiag.status === 'ok' ? '#34a853' : resultadoDiag.status === 'erro' ? '#ea4335' : '#fbbc04'
          }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {resultadoDiag.status === 'ok' && <CheckCircle className="w-5 h-5" style={{ color: '#34a853' }} />}
                {resultadoDiag.status === 'erro' && <AlertCircle className="w-5 h-5" style={{ color: '#ea4335' }} />}
                {resultadoDiag.status === 'warning' && <AlertCircle className="w-5 h-5" style={{ color: '#fbbc04' }} />}
                <p className="font-bold text-sm">{resultadoDiag.mensagem}</p>
              </div>
              <button onClick={() => setMostrarDiagnostico(false)} className="p-1 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Config */}
            {resultadoDiag.config && (
              <div className="mb-3 p-3 rounded-lg bg-white/50 text-xs space-y-1">
                <p className="font-bold mb-2">📋 Configuração:</p>
                <p>• Clínica: {resultadoDiag.config.clinica_nome} ({resultadoDiag.config.clinica_slug})</p>
                <p>• Alias: <code className="bg-gray-100 px-1 rounded">{resultadoDiag.config.alias_recebimento || 'NÃO GERADO'}</code></p>
                <p>• Remetente: {resultadoDiag.config.email_remetente}</p>
                <p>• Ativo: {resultadoDiag.config.ativo ? '✅ SIM' : '❌ NÃO'}</p>
                <p>• Inbound Parse: {resultadoDiag.config.inbound_parse_configurado ? '✅ SIM' : '❌ NÃO'}</p>
              </div>
            )}

            {/* SendGrid */}
            {resultadoDiag.sendgrid && (
              <div className="mb-3 p-3 rounded-lg bg-white/50 text-xs space-y-1">
                <p className="font-bold mb-2">🌐 SendGrid API:</p>
                <p>• Webhook URL: <code className="bg-gray-100 px-1 rounded text-[10px] break-all">{resultadoDiag.sendgrid.webhook_url || 'NÃO CONFIGURADO'}</code></p>
                <p>• Spam Check: {resultadoDiag.sendgrid.spam_check ? '✅ ON' : '❌ OFF'}</p>
                {resultadoDiag.sendgrid.envio_teste && (
                  <p>• Teste Envio: {resultadoDiag.sendgrid.envio_teste}</p>
                )}
              </div>
            )}

            {/* Problemas */}
            {resultadoDiag.problemas?.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 text-xs space-y-1">
                <p className="font-bold mb-2 text-red-800">❌ PROBLEMAS CRÍTICOS:</p>
                {resultadoDiag.problemas.map((p, i) => (
                  <p key={i} className="text-red-700">• {p}</p>
                ))}
              </div>
            )}

            {/* Warnings */}
            {resultadoDiag.warnings?.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-yellow-50 text-xs space-y-1">
                <p className="font-bold mb-2 text-yellow-800">⚠️ AVISOS:</p>
                {resultadoDiag.warnings.map((w, i) => (
                  <p key={i} className="text-yellow-700">• {w}</p>
                ))}
              </div>
            )}

            {/* Recomendações */}
            {resultadoDiag.recomendacoes?.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 text-xs space-y-1">
                <p className="font-bold mb-2 text-blue-800">💡 AÇÕES RECOMENDADAS:</p>
                {resultadoDiag.recomendacoes.map((r, i) => (
                  <p key={i} className="text-blue-700">→ {r}</p>
                ))}
              </div>
            )}

            {/* AUTO-FIX */}
            {resultadoDiag.status === 'erro' && (
              <button
                onClick={async () => {
                  console.log('[AUTO-FIX] ▶️ Iniciando correção para provider:', provider.id);
                  const toastId = toast.loading('🔧 Aplicando correções automáticas...');
                  
                  try {
                    console.log('[AUTO-FIX] 📡 Chamando corrigirConfigEmail...');
                    const fixRes = await base44.functions.invoke('corrigirConfigEmail', {
                      config_id: provider.id
                    });
                    
                    console.log('[AUTO-FIX] ✅ Resposta recebida:', fixRes);
                    console.log('[AUTO-FIX] Data:', fixRes.data);
                    
                    toast.dismiss(toastId);
                    
                    if (fixRes.data.success) {
                      toast.success(`✅ ${fixRes.data.fixes_aplicados} correção(ões)!`, {
                        description: fixRes.data.mensagem,
                        duration: 8000
                      });
                      
                      console.log('[AUTO-FIX] 📋 Log completo:', fixRes.data.log);
                      console.log('[AUTO-FIX] ⚙️ Config final:', fixRes.data.config_final);
                      
                      alert(`AUTO-FIX CONCLUÍDO:\n\n${fixRes.data.log.join('\n')}\n\nRecarregando página em 2s...`);
                      
                      setTimeout(() => window.location.reload(), 2000);
                    } else {
                      console.error('[AUTO-FIX] ❌ Falha:', fixRes.data.error);
                      toast.error('❌ Correção falhou', { description: fixRes.data.error });
                      alert(`ERRO NO AUTO-FIX:\n\n${fixRes.data.error}\n\nVeja console (F12) para detalhes.`);
                    }
                  } catch (error) {
                    console.error('[AUTO-FIX] ❌ Erro crítico:', error);
                    console.error('[AUTO-FIX] Stack:', error.stack);
                    toast.dismiss(toastId);
                    toast.error('❌ Erro ao corrigir', { description: error.message });
                    alert(`ERRO CRÍTICO:\n\n${error.message}\n\nVeja console (F12) para stack trace.`);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm hover:opacity-90"
                style={{ backgroundColor: '#ea4335', color: 'white' }}
              >
                <Zap className="w-5 h-5" />
                CORRIGIR TUDO AUTOMATICAMENTE
              </button>
            )}

            {/* Debug info */}
            <details className="mt-3">
              <summary className="text-xs cursor-pointer text-gray-500 hover:text-gray-700">🔧 Debug completo (JSON)</summary>
              <pre className="mt-2 text-[10px] bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                {JSON.stringify(resultadoDiag, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function FormProvedor({ provedor, initialData, clinica, onSave, onClose, isLoading }) {
  const [activeTab, setActiveTab] = useState('basico');
  const [formData, setFormData] = useState(initialData || {
    provedor,
    nome_remetente: clinica?.nome || '',
    email_remetente: clinica?.email || `contato@${clinica?.slug || 'suaclinica'}.com.br`,
    alias_recebimento: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_usuario: '',
    smtp_senha_encrypted: '',
    enviar_confirmacao_automatica: true,
    usar_nome_agente_resposta: true,
    incluir_historico_email: true,
    detectar_auto_reply: true,
    assinatura_padrao: '',
    ativo: false
  });

  const tabs = [
    { id: 'basico', label: 'Básico' },
    { id: 'comportamento', label: 'Comportamento' },
    { id: 'assinatura', label: 'Assinatura' }
  ];

  const validar = () => {
    if (!formData.nome_remetente) {
      toast.error("Nome de exibição obrigatório");
      return false;
    }
    if (!formData.email_remetente) {
      toast.error("Email remetente obrigatório");
      return false;
    }
    if (provedor === 'smtp_custom') {
      if (!formData.smtp_host || !formData.smtp_port || !formData.smtp_usuario || !formData.smtp_senha_encrypted) {
        toast.error("Preencha todos os campos SMTP");
        setActiveTab('smtp');
        return false;
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Mobile Optimized */}
        <div className="p-4 sm:p-6 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: '#f1f3f4' }}>
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg sm:text-xl font-normal truncate" style={{ color: '#202124' }}>
              {initialData ? 'Editar configuração' : 'Configurar email'}
            </h3>
            <p className="text-xs sm:text-sm mt-0.5 truncate" style={{ color: '#5f6368' }}>
              {provedor === 'conectaclinica' && 'Gerenciado por nós'}
              {provedor === 'smtp_custom' && 'Seu servidor de email'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Mobile Scrollable */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 border-b flex-shrink-0" style={{ borderColor: '#f1f3f4' }}>
          <div className="flex gap-1 overflow-x-auto hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3 sm:px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: activeTab === tab.id ? '#f5f3ff' : 'transparent',
                  color: activeTab === tab.id ? '#7E57FF' : '#5f6368',
                  minHeight: '44px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
          
          {activeTab === 'basico' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Nome de exibição *
                  </label>
                  <Input
                    value={formData.nome_remetente}
                    onChange={(e) => setFormData({ ...formData, nome_remetente: e.target.value })}
                    placeholder="Sua Clínica"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Email remetente *
                  </label>
                  <Input
                    value={formData.email_remetente}
                    onChange={(e) => setFormData({ ...formData, email_remetente: e.target.value })}
                    placeholder="clinica@conectaclinica.com.br"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {provedor === 'conectaclinica' && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0284c7' }}>
                  <div className="flex gap-2 mb-2">
                    <Info className="w-5 h-5 flex-shrink-0" style={{ color: '#0284c7' }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#075985' }}>
                        📬 Como funciona o recebimento?
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: '#0c4a6e' }}>
                        Quando você ativar, criaremos automaticamente um email especial para sua clínica (ex: suaclinica-abc123@conectaclinica.com.br). 
                        Qualquer email enviado para este endereço vira um ticket no sistema.
                      </p>
                      <p className="text-xs mt-2 font-medium" style={{ color: '#0c4a6e' }}>
                        ✓ Você não precisa configurar nada adicional
                      </p>
                    </div>
                  </div>
                </div>
              )}



              <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#f8f9fa' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#202124' }}>Ativar provedor</p>
                  <p className="text-xs" style={{ color: '#5f6368' }}>
                    {formData.ativo ? 'Provedor ativo para envio/recebimento' : 'Inativo - não enviará/receberá emails'}
                  </p>
                </div>
                <Switch
                  checked={formData.ativo === true}
                  onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                />
              </div>
            </div>
          )}

          {activeTab === 'comportamento' && (
            <div className="space-y-1">
              {[
                {
                  key: 'enviar_confirmacao_automatica',
                  label: 'Enviar confirmação ao criar ticket',
                  desc: 'Cliente recebe email automático'
                },
                {
                  key: 'usar_nome_agente_resposta',
                  label: 'Usar nomes de agentes',
                  desc: 'Mostra nome do atendente no email'
                },
                {
                  key: 'incluir_historico_email',
                  label: 'Incluir histórico de mensagens',
                  desc: 'Threading de conversas'
                },
                {
                  key: 'detectar_auto_reply',
                  label: 'Detectar respostas automáticas',
                  desc: 'Ignora out-of-office'
                }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-4 border-b last:border-0" style={{ borderColor: '#f1f3f4' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#202124' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#5f6368' }}>{desc}</p>
                  </div>
                  <Switch
                    checked={formData[key] === true}
                    onCheckedChange={(v) => setFormData({ ...formData, [key]: v })}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'assinatura' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                  Assinatura HTML (opcional)
                </label>
                <Textarea
                  placeholder="<div>Equipe {nome_clinica}</div>"
                  value={formData.assinatura_padrao || ""}
                  onChange={(e) => setFormData({ ...formData, assinatura_padrao: e.target.value })}
                  className="rounded-lg font-mono text-xs"
                  rows={6}
                />
                <p className="text-xs mt-2" style={{ color: '#9aa0a6' }}>
                  Use <code className="px-1 py-0.5 bg-gray-100 rounded">{'{{nome_clinica}}'}</code> para variáveis
                </p>
              </div>
              {formData.assinatura_padrao && (
                <div className="p-4 rounded-lg border" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#5f6368' }}>Preview:</p>
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: formData.assinatura_padrao.replace('{nome_clinica}', clinica?.nome || 'Sua Clínica')
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'smtp' && provedor === 'smtp_custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Servidor SMTP *
                  </label>
                  <Input
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Porta *
                  </label>
                  <Input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Usuário *
                  </label>
                  <Input
                    value={formData.smtp_usuario}
                    onChange={(e) => setFormData({ ...formData, smtp_usuario: e.target.value })}
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                    Senha *
                  </label>
                  <Input
                    type="password"
                    value={formData.smtp_senha_encrypted}
                    onChange={(e) => setFormData({ ...formData, smtp_senha_encrypted: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
                  Email de recebimento (opcional)
                </label>
                <Input
                  value={formData.alias_recebimento || ''}
                  onChange={(e) => setFormData({ ...formData, alias_recebimento: e.target.value })}
                  placeholder="suporte@seudominio.com"
                  className="font-mono text-sm"
                />
                <p className="text-xs mt-1" style={{ color: '#9aa0a6' }}>
                  Configure webhook manualmente no seu servidor SMTP
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Mobile Sticky */}
        <div className="p-4 sm:p-6 border-t flex gap-3 flex-shrink-0" style={{ borderColor: '#f1f3f4' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border font-medium hover:bg-gray-50"
            style={{ 
              borderColor: '#e8eaed',
              minHeight: '48px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (validar()) {
                onSave(formData);
              }
            }}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg font-medium disabled:opacity-50"
            style={{ 
              backgroundColor: '#7E57FF', 
              color: 'white',
              minHeight: '48px'
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </span>
            ) : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}