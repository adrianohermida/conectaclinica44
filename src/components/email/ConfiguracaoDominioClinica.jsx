import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Loader2, AlertCircle, Info, X, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracaoDominioClinica({ clinica }) {
  const queryClient = useQueryClient();
  const [adicionandoDominio, setAdicionandoDominio] = useState(false);
  const [novoDominio, setNovoDominio] = useState('');
  const [copiedFields, setCopiedFields] = useState({});
  const [mostrarMenu, setMostrarMenu] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // CRITICAL: Buscar APENAS configs DESTA clínica, garantir isolamento total
  const { data: authData = { domains: [] }, isLoading } = useQuery({
    queryKey: ['dominio-clinica', clinica?.id],
    queryFn: async () => {
      // 1. Buscar configs APENAS desta clínica
      const configs = await base44.entities.ConfiguracaoEmail.filter({
        clinica_id: clinica.id,
        provedor: 'dominio_proprio'
      });
      
      // 2. CRITICAL: Se não tem configs, retornar vazio IMEDIATAMENTE (evita leak)
      if (!configs || configs.length === 0) {
        return { domains: [] };
      }
      
      const domainConfigs = configs.filter(c => c.dkim_domain_id);
      
      // 3. Buscar domains do SendGrid (já filtrado por clinica_id no backend)
      const domainsRes = await base44.functions.invoke('getSendGridDomains', {});
      const allDomains = domainsRes.data.domains || [];
      
      // 4. CRITICAL: Mapear APENAS domains que existem no SendGrid E pertencem a ESTA clínica
      const domainsValidos = [];
      const configsOrfas = [];
      
      domainConfigs.forEach(config => {
        const domain = allDomains.find(d => String(d.id) === String(config.dkim_domain_id));
        
        if (!domain) {
          // Config órfã - domain não existe mais no SendGrid
          configsOrfas.push({
            config_id: config.id,
            domain_name: config.dkim_domain,
            domain_id_morto: config.dkim_domain_id
          });
        } else if (config.clinica_id === clinica.id) {
          // Domain válido E pertence a esta clínica
          domainsValidos.push(domain);
        }
      });
      
      // CRITICAL: Se detectou configs órfãs, remover silenciosamente
      if (configsOrfas.length > 0) {
        console.warn('[ConfigDomain] 🗑️ Configs órfãs detectadas:', configsOrfas.length);
        // Defer cleanup (não bloquear UI)
        setTimeout(async () => {
          for (const orfa of configsOrfas) {
            try {
              await base44.entities.ConfiguracaoEmail.delete(orfa.config_id);
              console.log('[ConfigDomain] ✅ Órfã removida:', orfa.domain_name);
            } catch (e) {
              console.error('[ConfigDomain] ❌ Falha ao remover órfã:', e);
            }
          }
        }, 1000);
      }
      
      return { domains: domainsValidos };
    },
    enabled: !!clinica?.id,
    refetchInterval: 30000,
    staleTime: 10000
  });

  const adicionarDominioMutation = useMutation({
    mutationFn: async (domain) => {
      // Validar formato do domínio no frontend
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain)) {
        throw new Error('Formato de domínio inválido. Use apenas letras, números e pontos (ex: suaclinica.com.br)');
      }

      // CRITICAL: Validar que user tem clinica_id (security)
      if (!user?.clinica_id) {
        throw new Error('User deve pertencer a uma clínica');
      }

      const res = await base44.functions.invoke('adicionarDominioClinica', {
        domain: domain.toLowerCase().trim(),
        clinica_id: clinica.id
      });
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Erro ao adicionar domínio');
      }
      
      return res.data;
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error('❌ ' + (data.error || 'Falha ao adicionar'));
        return;
      }
      
      // Aguardar 2s para SendGrid propagar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // CRÍTICO: Refetch completo
      await queryClient.invalidateQueries(['dominio-clinica']);
      await queryClient.invalidateQueries(['sendgrid-domains']);
      await queryClient.invalidateQueries(['config-email']);
      await queryClient.refetchQueries(['dominio-clinica'], { active: true });
      
      setAdicionandoDominio(false);
      setNovoDominio('');
      
      if (data.already_exists && data.verified) {
        toast.success('✅ Domínio já verificado e ativo!');
      } else if (data.already_exists) {
        toast.info('ℹ️ Domínio já cadastrado. Configure o DNS abaixo.');
      } else {
        toast.success('✅ Domínio adicionado! Configure os registros DNS abaixo.');
      }
    },
    onError: (error) => {
      toast.error('❌ Erro ao adicionar domínio', { 
        description: error.message,
        duration: 5000
      });
    }
  });

  const verificarDNSMutation = useMutation({
    mutationFn: async (domain) => {
      const res = await base44.functions.invoke('verificarDNSDominio', {
        domain
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['dominio-clinica']);
      if (data.valid) {
        toast.success('✅ DNS configurado corretamente!');
      } else {
        toast.warning('⚠️ DNS ainda não propagado', {
          description: 'Aguarde até 48h para propagação'
        });
      }
    }
  });

  const sincronizarMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('sincronizarSendGrid', {
        clinica_id: clinica.id
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast.error('❌ ' + (data.error || 'Falha ao sincronizar'));
        return;
      }
      
      queryClient.invalidateQueries(['dominio-clinica']);
      queryClient.invalidateQueries(['config-email']);
      
      const total = (data.configs_atualizadas || 0) + (data.configs_criadas || 0);
      
      if (total > 0) {
        toast.success('✅ Sincronizado com SendGrid', {
          description: data.mensagem,
          duration: 5000
        });
      } else {
        toast.info('ℹ️ Nenhum domain órfão encontrado', {
          description: 'Todos os domains já estão vinculados'
        });
      }
    }
  });

  const removerDominioMutation = useMutation({
    mutationFn: async (domainId) => {
      const res = await base44.functions.invoke('removerDominioSendGrid', {
        domain_id: domainId,
        clinica_id: clinica.id
      });
      
      if (!res.data.success) {
        throw new Error(res.data.error || 'Falha ao remover');
      }
      
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dominio-clinica']);
      queryClient.invalidateQueries(['config-email']);
      queryClient.invalidateQueries(['sendgrid-domains']);
      toast.success('✅ Domínio removido do SendGrid');
    },
    onError: (error) => {
      toast.error('❌ Erro ao remover', { description: error.message });
    }
  });

  const copyToClipboard = async (text, field) => {
    await navigator.clipboard.writeText(text);
    setCopiedFields({ ...copiedFields, [field]: true });
    setTimeout(() => {
      setCopiedFields({ ...copiedFields, [field]: false });
    }, 2000);
    toast.success('Copiado!');
  };

  if (isLoading) {
    return (
      <div className="pc-card p-6">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: '#7E57FF' }} />
      </div>
    );
  }

  // Sem domínio - mostrar opção de adicionar
  if (authData.domains.length === 0 && !adicionandoDominio) {
    return (
      <div className="pc-card p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
            <Info className="w-6 h-6" style={{ color: '#7E57FF' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium mb-2" style={{ color: '#202124' }}>
              Configure seu domínio de email
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#5f6368' }}>
              Use seu próprio domínio (ex: @prevenclin.com.br) para enviar emails profissionais e melhorar a entrega.
            </p>
            <button
              onClick={() => setAdicionandoDominio(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm"
              style={{ backgroundColor: '#7E57FF', color: 'white' }}
            >
              Adicionar Domínio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de adicionar domínio
  if (adicionandoDominio) {
    return (
      <div className="pc-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium" style={{ color: '#202124' }}>
            Adicionar Domínio
          </h3>
          <button
            onClick={() => {
              setAdicionandoDominio(false);
              setNovoDominio('');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#5f6368' }}>
              Seu domínio (ex: prevenclin.com.br)
            </label>
            <input
              type="text"
              value={novoDominio}
              onChange={(e) => setNovoDominio(e.target.value)}
              placeholder="exemplo.com.br"
              className="w-full border rounded-lg px-4 py-2.5 text-sm"
              style={{ borderColor: '#e8eaed' }}
            />
          </div>
          
          <button
            onClick={() => adicionarDominioMutation.mutate(novoDominio)}
            disabled={!novoDominio || adicionarDominioMutation.isPending}
            className="w-full px-4 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            {adicionarDominioMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Adicionando...
              </span>
            ) : 'Adicionar'}
          </button>
          
          {adicionarDominioMutation.error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-xs" style={{ color: '#dc2626' }}>
                ❌ {adicionarDominioMutation.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Renderizar domains + senders
  return (
    <div className="space-y-6">
      {/* DOMAIN AUTHENTICATION */}
      {authData.domains.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: '#5f6368' }}>
            Domain Authentication ({authData.domains.length})
          </h3>
          {authData.domains.map(dominioClinica => {
        const dnsRecords = [];
        
        if (dominioClinica.dns?.mail_server) {
          dnsRecords.push(dominioClinica.dns.mail_server);
        }
        
        if (dominioClinica.dns?.subdomain_spf) {
          dnsRecords.push(dominioClinica.dns.subdomain_spf);
        }
        
        if (dominioClinica.dns?.dkim) {
          dnsRecords.push(dominioClinica.dns.dkim);
        }
        
        // DMARC (sempre adicionar recomendação)
        dnsRecords.push({
          type: 'txt',
          host: `_dmarc.${dominioClinica.domain}`,
          data: 'v=DMARC1; p=none;',
          valid: false
        });
        
        const isVerified = dominioClinica.valid;

        return (
          <div key={dominioClinica.id} className="pc-card p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: isVerified ? '#e6f7ed' : '#fef9e5' }}>
                  {isVerified ? (
                    <Check className="w-6 h-6" style={{ color: '#34a853' }} />
                  ) : (
                    <AlertCircle className="w-6 h-6" style={{ color: '#fbbc04' }} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-1" style={{ color: '#202124' }}>
                    {dominioClinica.domain}
                  </h3>
                  <p className="text-sm" style={{ color: isVerified ? '#34a853' : '#956802' }}>
                    {isVerified ? '✓ Verificado e ativo' : '⚠ Aguardando configuração DNS'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sincronizarMutation.mutate()}
                  disabled={sincronizarMutation.isPending}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Sincronizar"
                >
                  <Loader2 className={`w-5 h-5 ${sincronizarMutation.isPending ? 'animate-spin' : ''}`} style={{ color: '#5f6368' }} />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setMostrarMenu(mostrarMenu === dominioClinica.id ? null : dominioClinica.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" style={{ color: '#5f6368' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  
                  {mostrarMenu === dominioClinica.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMostrarMenu(null)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20" style={{ borderColor: '#e8eaed' }}>
                        {!isVerified && (
                          <button
                            onClick={() => {
                              setMostrarMenu(null);
                              verificarDNSMutation.mutate(dominioClinica.domain);
                            }}
                            disabled={verificarDNSMutation.isPending}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" style={{ color: '#34a853' }} />
                            Verificar DNS
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMostrarMenu(null);
                            if (confirm(`Remover ${dominioClinica.domain}? Você precisará reconfigurar.`)) {
                              removerDominioMutation.mutate(dominioClinica.id);
                            }
                          }}
                          disabled={removerDominioMutation.isPending}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                          style={{ color: '#ea4335' }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover domínio
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

      {/* Instruções */}
      {!isVerified && (
        <>
          <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#075985' }}>
              📋 Instruções
            </p>
            <ol className="text-xs space-y-1 ml-4 list-decimal" style={{ color: '#0c4a6e' }}>
              <li>Acesse o painel DNS do seu provedor (Registro.br, Cloudflare, etc)</li>
              <li>Adicione os registros abaixo exatamente como mostrado</li>
              <li>Aguarde até 48h para propagação do DNS</li>
              <li>Clique em "Verificar DNS" para validar</li>
            </ol>
          </div>

          {/* Tabela DNS */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-xs uppercase" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed', color: '#5f6368' }}>
              <div className="col-span-2">TIPO</div>
              <div className="col-span-4">NOME</div>
              <div className="col-span-6">VALOR</div>
            </div>

            {/* Registros DNS */}
            {dnsRecords.map((record, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center" style={{ borderColor: '#f1f3f4' }}>
                <div className="col-span-2">
                  <span className="px-2 py-1 rounded text-xs font-medium" style={{ 
                    backgroundColor: record.type === 'txt' ? '#fef3c7' : record.type === 'mx' ? '#e0f2fe' : '#f3e8ff',
                    color: record.type === 'txt' ? '#713f12' : record.type === 'mx' ? '#075985' : '#581c87'
                  }}>
                    {record.type.toUpperCase()}
                  </span>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono break-all" style={{ color: '#202124' }}>
                      {record.host}
                    </code>
                    <button
                      onClick={() => copyToClipboard(record.host, `host-${idx}`)}
                      className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                    >
                      {copiedFields[`host-${idx}`] ? (
                        <Check className="w-4 h-4" style={{ color: '#34a853' }} />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: '#5f6368' }} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono flex-1 break-all" style={{ color: '#202124' }}>
                      {record.data}
                    </code>
                    <button
                      onClick={() => copyToClipboard(record.data, `data-${idx}`)}
                      className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                    >
                      {copiedFields[`data-${idx}`] ? (
                        <Check className="w-4 h-4" style={{ color: '#34a853' }} />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: '#5f6368' }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

            {/* Verificado - mostrar sucesso */}
            {isVerified && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#e6f7ed', border: '1px solid #34a853' }}>
                <p className="text-sm font-medium" style={{ color: '#1f6332' }}>
                  ✓ Domínio autenticado e pronto para envio de emails
                </p>
              </div>
            )}
          </div>
        );
      })}</div>
      )}
      
      {/* Botão adicionar outro domínio */}
      {!adicionandoDominio && (
        <button
          onClick={() => setAdicionandoDominio(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed hover:border-[#7E57FF] hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          style={{ borderColor: '#e8eaed' }}
        >
          <Plus className="w-5 h-5" style={{ color: '#7E57FF' }} />
          <span className="font-medium" style={{ color: '#7E57FF' }}>Adicionar outro domínio</span>
        </button>
      )}
    </div>
  );
}