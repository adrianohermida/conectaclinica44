import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, Copy, ExternalLink, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/**
 * WIZARD PROFISSIONAL: Setup SendGrid em 3 etapas
 * 
 * 1. ✅ Compliance LGPD (Webhook + Unsubscribe Groups)
 * 2. ✅ Domínio Verificado (conectaclinica.com.br)
 * 3. ✅ Templates Criados (Auth + Tickets)
 * 
 * MIGRAÇÃO-READY: Detecta status atual e permite re-executar
 */
export default function WizardSetupSendGrid() {
  const [modalAberto, setModalAberto] = useState(false);
  const [etapaAtiva, setEtapaAtiva] = useState(1);
  const queryClient = useQueryClient();

  // Buscar status do SendGrid
  const { data: status, isLoading } = useQuery({
    queryKey: ['sendgrid-setup-status'],
    queryFn: async () => {
      const [lgpdRes, domainsRes, templatesRes] = await Promise.all([
        base44.functions.invoke('getSendGridStatus', {}).catch(() => ({ data: {} })),
        base44.functions.invoke('getSendGridDomains', {}).catch(() => ({ data: { domains: [] } })),
        base44.functions.invoke('getSendGridTemplates', {}).catch(() => ({ data: { templates: [] } }))
      ]);

      const domains = domainsRes.data.domains || [];
      const templates = templatesRes.data.templates || [];
      const conectaClinicaDomain = domains.find(d => d.domain === 'conectaclinica.com.br');

      return {
        lgpd_ok: lgpdRes.data.webhooks_active > 0,
        dominio_ok: conectaClinicaDomain?.valid || false,
        dominio_pendente: !!conectaClinicaDomain && !conectaClinicaDomain.valid,
        templates_count: templates.length,
        templates_ok: templates.length >= 8, // Mínimo Sprint 1
        dns_records: conectaClinicaDomain?.dns || null
      };
    },
    enabled: modalAberto
  });

  // Mutations - SEMPRE chamar hooks antes de qualquer return
  const configurarLGPDMutation = useMutation({
    mutationFn: async () => {
      const webhookRes = await base44.functions.invoke('autoConfigurarWebhookSendGrid', {});
      const groupsRes = await base44.functions.invoke('criarUnsubscribeGroups', {});
      return { webhook: webhookRes.data, groups: groupsRes.data };
    },
    onSuccess: () => {
      toast.success('✅ LGPD configurado');
      queryClient.invalidateQueries(['sendgrid-setup-status']);
      setEtapaAtiva(2);
    }
  });

  const adicionarDominioMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('addSendGridDomain', { domain: 'conectaclinica.com.br' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('✅ Domínio adicionado - configure DNS');
      queryClient.invalidateQueries(['sendgrid-setup-status']);
    }
  });

  const verificarDominioMutation = useMutation({
    mutationFn: async (domain_id) => {
      const res = await base44.functions.invoke('verifySendGridDomain', { domain_id });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.validation?.valid) {
        toast.success('✅ Domínio verificado!');
        queryClient.invalidateQueries(['sendgrid-setup-status']);
        setEtapaAtiva(3);
      } else {
        toast.error('❌ DNS ainda não propagou - aguarde até 48h');
      }
    }
  });

  const popularTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('popularTemplatesSendGrid', {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.templates_criados} templates criados`);
      queryClient.invalidateQueries(['sendgrid-setup-status']);
    }
  });

  // Calcular setup completo APÓS todos os hooks
  const setupCompleto = status?.lgpd_ok && status?.dominio_ok && status?.templates_ok;
  
  // Se completo e modal fechado, não renderizar nada
  if (setupCompleto && !modalAberto) {
    return null;
  }

  if (!modalAberto) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setModalAberto(true)}
          className="w-full p-4 rounded-xl border-2 hover:border-[#7E57FF] transition-all text-left"
          style={{ 
            borderColor: setupCompleto ? '#34a853' : '#fbbc04',
            backgroundColor: setupCompleto ? '#e6f7ed' : '#fef9e5'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {setupCompleto ? (
                <CheckCircle className="w-6 h-6" style={{ color: '#34a853' }} />
              ) : (
                <AlertCircle className="w-6 h-6" style={{ color: '#fbbc04' }} />
              )}
              <div>
                <p className="font-bold text-sm" style={{ color: setupCompleto ? '#137333' : '#92400e' }}>
                  {setupCompleto ? '✅ SendGrid 100% Configurado' : '⚙️ Configurar SendGrid'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: setupCompleto ? '#34a853' : '#b45309' }}>
                  {setupCompleto 
                    ? 'LGPD, Domínio e Templates prontos'
                    : 'Setup profissional em 3 etapas - clique para iniciar'}
                </p>
              </div>
            </div>
            <Zap className="w-5 h-5" style={{ color: '#7E57FF' }} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: '#e8eaed' }}>
          <h2 className="text-2xl font-bold" style={{ color: '#202124' }}>
            SendGrid Setup Profissional
          </h2>
          <p className="text-sm mt-1" style={{ color: '#5f6368' }}>
            3 etapas para SendGrid pronto em produção - migração-safe
          </p>
        </div>

        {/* Progress */}
        <div className="p-6 border-b" style={{ borderColor: '#f1f3f4' }}>
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3].map(num => {
              const concluido = 
                (num === 1 && status?.lgpd_ok) ||
                (num === 2 && status?.dominio_ok) ||
                (num === 3 && status?.templates_ok);
              
              return (
                <div key={num} className="flex-1 flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      concluido ? 'bg-green-500 text-white' : 
                      etapaAtiva === num ? 'bg-[#7E57FF] text-white' : 
                      'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {concluido ? '✓' : num}
                  </div>
                  {num < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${concluido ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs mt-2" style={{ color: '#5f6368' }}>
            <span>LGPD</span>
            <span>Domínio</span>
            <span>Templates</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} />
            </div>
          ) : (
            <>
              {/* ETAPA 1: LGPD */}
              <div className={`mb-6 p-4 rounded-xl border-2 ${etapaAtiva === 1 ? 'border-[#7E57FF]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">1️⃣</span>
                    <h3 className="font-bold">Compliance LGPD</h3>
                  </div>
                  {status?.lgpd_ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: '#5f6368' }}>
                  Webhook events + Unsubscribe Groups (obrigatório LGPD Art. 18)
                </p>
                {!status?.lgpd_ok && (
                  <Button
                    onClick={() => configurarLGPDMutation.mutate()}
                    disabled={configurarLGPDMutation.isPending}
                    className="w-full"
                  >
                    {configurarLGPDMutation.isPending ? 'Configurando...' : 'Configurar LGPD'}
                  </Button>
                )}
                {status?.lgpd_ok && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#e6f7ed' }}>
                    <p className="text-sm font-medium" style={{ color: '#137333' }}>
                      ✅ Webhook + Unsubscribe configurados
                    </p>
                  </div>
                )}
              </div>

              {/* ETAPA 2: Domínio */}
              <div className={`mb-6 p-4 rounded-xl border-2 ${etapaAtiva === 2 ? 'border-[#7E57FF]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">2️⃣</span>
                    <h3 className="font-bold">Domínio Verificado</h3>
                  </div>
                  {status?.dominio_ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : status?.dominio_pendente ? (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: '#5f6368' }}>
                  conectaclinica.com.br com DKIM/SPF
                </p>

                {!status?.dominio_ok && !status?.dominio_pendente && (
                  <Button
                    onClick={() => adicionarDominioMutation.mutate()}
                    disabled={adicionarDominioMutation.isPending}
                    className="w-full"
                  >
                    {adicionarDominioMutation.isPending ? 'Adicionando...' : 'Adicionar Domínio'}
                  </Button>
                )}

                {status?.dominio_pendente && status?.dns_records && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#fef9e5', border: '1px solid #fbbc04' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: '#92400e' }}>
                        ⚠️ Configure estes registros DNS:
                      </p>
                      {status.dns_records.dkim_records?.map((rec, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[10px] bg-white px-2 py-1 rounded flex-1 break-all">
                              {rec.host}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rec.host);
                                toast.success('Host copiado');
                              }}
                              className="p-1 hover:bg-yellow-100 rounded"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <code className="text-[10px] bg-white px-2 py-1 rounded block break-all">
                            {rec.data}
                          </code>
                        </div>
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        const domains = status.dns_records;
                        verificarDominioMutation.mutate(domains.domain_id);
                      }}
                      disabled={verificarDominioMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {verificarDominioMutation.isPending ? 'Verificando...' : 'Já configurei - Verificar agora'}
                    </Button>
                  </div>
                )}

                {status?.dominio_ok && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#e6f7ed' }}>
                    <p className="text-sm font-medium" style={{ color: '#137333' }}>
                      ✅ Domínio verificado - DKIM/SPF OK
                    </p>
                  </div>
                )}
              </div>

              {/* ETAPA 3: Templates */}
              <div className={`p-4 rounded-xl border-2 ${etapaAtiva === 3 ? 'border-[#7E57FF]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">3️⃣</span>
                    <h3 className="font-bold">Templates Essenciais</h3>
                  </div>
                  {status?.templates_ok ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: '#5f6368' }}>
                  {status?.templates_count || 0} template(s) criado(s) • Mínimo: 8
                </p>

                {!status?.templates_ok && (
                  <Button
                    onClick={() => popularTemplatesMutation.mutate()}
                    disabled={popularTemplatesMutation.isPending}
                    className="w-full"
                  >
                    {popularTemplatesMutation.isPending ? 'Criando templates...' : 'Criar Templates Essenciais'}
                  </Button>
                )}

                {status?.templates_ok && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#e6f7ed' }}>
                    <p className="text-sm font-medium" style={{ color: '#137333' }}>
                      ✅ {status.templates_count} templates criados
                    </p>
                  </div>
                )}
              </div>

              {/* Status Final */}
              {setupCompleto && (
                <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#e6f7ed', border: '2px solid #34a853' }}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8" style={{ color: '#34a853' }} />
                    <div>
                      <p className="font-bold text-lg" style={{ color: '#137333' }}>
                        🎉 SendGrid 100% Configurado
                      </p>
                      <p className="text-sm" style={{ color: '#34a853' }}>
                        Pronto para produção - LGPD compliant
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between" style={{ borderColor: '#e8eaed' }}>
          <Button variant="outline" onClick={() => setModalAberto(false)}>
            {setupCompleto ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            onClick={() => queryClient.invalidateQueries(['sendgrid-setup-status'])}
            variant="outline"
            icon={<Zap className="w-4 h-4" />}
          >
            Atualizar Status
          </Button>
        </div>
      </div>
    </div>
  );
}