import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Building2, Phone, UsersRound, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useAuth } from "@/components/hooks/useAuth";

export default function ConfiguracaoClinica() {
  return (
    <RouteGuard requireAuth requireClinica>
      <ConfiguracaoClinicaContent />
    </RouteGuard>
  );
}

function ConfiguracaoClinicaContent() {
  usePerformanceTracker('/ConfiguracaoClinica');
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const { user } = useAuth();

  const { data: clinica, isLoading } = useQuery({
    queryKey: ["clinicaConfig", user?.clinica_id],
    queryFn: async () => {
      if (!user?.clinica_id) return null;
      const clinicas = await base44.entities.Clinica.filter({ id: user.clinica_id });
      return clinicas[0];
    },
    enabled: !!user?.clinica_id
  });

  const updateClinicaMutation = useMutation({
    mutationFn: (data) => base44.entities.Clinica.update(clinica.id, data),
    onSuccess: () => {
      toast.success("Dados da clínica atualizados com sucesso!");
      setEditMode(false);
      queryClient.invalidateQueries(["clinicaConfig"]);
    },
    onError: () => {
      toast.error("Erro ao atualizar dados da clínica");
    }
  });

  const handleEdit = () => {
    setFormData(clinica);
    setEditMode(true);
  };

  const handleSave = () => {
    updateClinicaMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center gap-4 pb-4 mb-4 border-b" style={{ borderColor: '#e8eaed' }}>
              <div className="w-16 h-16 rounded-xl bg-gray-200" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-5 bg-gray-200 rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (!clinica) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader 
          title="Dados da Clínica" 
          description="Você não está associado a nenhuma clínica. Complete o onboarding primeiro."
          breadcrumbs={[
            { label: "Administração", link: createPageUrl("Administracao") },
            { label: "Dados da Clínica" }
          ]}
        />
      </div>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-4xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
        <PageHeader
          title="Dados da Clínica"
          description="Visualize e edite as informações gerais da sua clínica"
          breadcrumbs={[
            { label: "Administração", href: createPageUrl("Administracao") },
            { label: "Dados da Clínica" }
          ]}
          action={
            !editMode ? (
              <button 
                onClick={handleEdit}
                aria-label="Editar informações da clínica"
                className="inline-flex items-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-6 whitespace-nowrap"
                style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
              >
                Editar Informações
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setEditMode(false)}
                  aria-label="Cancelar edição"
                  className="font-bold rounded-full hover:bg-gray-100 transition-all min-h-[48px] px-6 whitespace-nowrap"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #e8eaed', color: '#5f6368', fontSize: '14px' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  aria-label="Salvar alterações"
                  disabled={updateClinicaMutation.isPending}
                  className="inline-flex items-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-6 disabled:opacity-50 whitespace-nowrap"
                  style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
                >
                  {updateClinicaMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )
          }
        />

        <div className="bg-white rounded-2xl p-5 md:p-6 space-y-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-4 pb-5 overflow-hidden" style={{ borderBottom: '1px solid #e8eaed' }}>
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
              <Building2 className="w-8 h-8" style={{ color: '#7E57FF' }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold truncate" style={{ color: '#202124', fontSize: '20px' }}>{clinica.nome}</h2>
              <p className="truncate" style={{ color: '#5f6368', fontSize: '14px' }}>
                {clinica.id_visual} • {clinica.slug}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden">
            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Nome da Clínica</label>
              {editMode ? (
                <Input
                  value={formData.nome || ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.nome}</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>CNPJ</label>
              {editMode ? (
                <Input
                  value={formData.cnpj || ""}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.cnpj || "Não informado"}</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Email</label>
              {editMode ? (
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.email}</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Telefone</label>
              {editMode ? (
                <Input
                  value={formData.telefone || ""}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.telefone || "Não informado"}</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Cidade</label>
              {editMode ? (
                <Input
                  value={formData.cidade || ""}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.cidade || "Não informado"}</p>
              )}
            </div>

            <div className="min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Estado</label>
              {editMode ? (
                <Input
                  value={formData.estado || ""}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                  className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                />
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>{clinica.estado || "Não informado"}</p>
              )}
            </div>

            <div className="md:col-span-2 min-w-0">
              <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>
                Subdomínio / Domínio Institucional
              </label>
              {editMode ? (
                <>
                  <Input
                    value={formData.subdomain || `${formData.slug || clinica.slug}.conectaclinica.com.br`}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    placeholder="clinica-abc.conectaclinica.com.br"
                    className="border-0 rounded-xl min-h-[48px] w-full" 
                    style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#80868b' }}>
                    Usado em convites, emails e acesso à plataforma
                  </p>
                </>
              ) : (
                <p className="break-words" style={{ color: '#202124', fontSize: '16px' }}>
                  {clinica.subdomain || `${clinica.slug}.conectaclinica.com.br`}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Endereço Completo</label>
            {editMode ? (
              <Input
                value={formData.endereco_completo || ""}
                onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
                className="border-0 rounded-xl min-h-[48px] w-full" style={{ backgroundColor: '#F4F7FA', fontSize: '14px' }}
              />
            ) : (
              <p className="break-words" style={{ color: '#202124', fontSize: '16px', lineHeight: '1.5' }}>{clinica.endereco_completo || "Não informado"}</p>
            )}
          </div>
        </div>

        {/* CARD ACESSO RÁPIDO - Gestão Societária */}
        <Link to={createPageUrl("GestaoSocietaria")}>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-5 md:p-6 shadow-sm border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#7E57FF' }}>
                  <UsersRound className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold mb-1" style={{ color: '#202124', fontSize: '18px' }}>Gestão Societária</h3>
                  <p className="text-sm" style={{ color: '#5f6368' }}>
                    Quadro de sócios, participação e administração
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-purple-600 flex-shrink-0" />
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <h3 className="font-bold mb-5" style={{ color: '#202124', fontSize: '20px' }}>Status da Assinatura</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
            <div className="rounded-xl p-4 min-h-[88px] overflow-hidden" style={{ backgroundColor: '#f5f3ff' }}>
              <p className="mb-2 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>Plano Atual</p>
              <p className="font-bold truncate" style={{ color: '#7E57FF', fontSize: '20px' }}>{clinica.plano_assinatura || "Trial"}</p>
            </div>
            <div className="rounded-xl p-4 min-h-[88px] overflow-hidden" style={{ backgroundColor: '#e6f7ed' }}>
              <p className="mb-2 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>Status</p>
              <p className="font-bold capitalize truncate" style={{ color: '#34a853', fontSize: '20px' }}>{clinica.status_assinatura || "trial"}</p>
            </div>
            <div className="rounded-xl p-4 min-h-[88px] overflow-hidden" style={{ backgroundColor: '#fef9e5' }}>
              <p className="mb-2 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>Vencimento</p>
              <p className="font-bold break-words" style={{ color: '#fbbc04', fontSize: '20px', lineHeight: '1.2' }}>
                {clinica.data_vencimento_plano || "Não definido"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5" style={{ color: '#25D366' }} />
            <h3 className="font-bold" style={{ color: '#202124', fontSize: '20px' }}>WhatsApp Business (Twilio)</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: '#80868b' }}>
            Configure sua própria conta Twilio para enviar mensagens WhatsApp. Deixe vazio para usar a conta padrão da plataforma.
          </p>
          
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Twilio Account SID</label>
                <Input
                  value={formData.twilio_account_sid || ""}
                  onChange={(e) => setFormData({ ...formData, twilio_account_sid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="border-0 rounded-xl min-h-[48px] w-full font-mono"
                  style={{ backgroundColor: '#F4F7FA', fontSize: '13px' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>Twilio Auth Token</label>
                <Input
                  type="password"
                  value={formData.twilio_auth_token || ""}
                  onChange={(e) => setFormData({ ...formData, twilio_auth_token: e.target.value })}
                  placeholder="********************************"
                  className="border-0 rounded-xl min-h-[48px] w-full font-mono"
                  style={{ backgroundColor: '#F4F7FA', fontSize: '13px' }}
                />
              </div>
              <div>
                <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>WhatsApp Number</label>
                <Input
                  value={formData.twilio_whatsapp_number || ""}
                  onChange={(e) => setFormData({ ...formData, twilio_whatsapp_number: e.target.value })}
                  placeholder="whatsapp:+5511999999999"
                  className="border-0 rounded-xl min-h-[48px] w-full font-mono"
                  style={{ backgroundColor: '#F4F7FA', fontSize: '13px' }}
                />
                <p className="text-xs mt-1" style={{ color: '#80868b' }}>
                  Formato: whatsapp:+[código país][número]
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <span className="text-sm">Account SID</span>
                <span className="text-sm font-mono" style={{ color: '#5f6368' }}>
                  {clinica.twilio_account_sid ? `${clinica.twilio_account_sid.substring(0, 8)}...` : 'Usando padrão'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <span className="text-sm">Auth Token</span>
                <span className="text-sm" style={{ color: '#5f6368' }}>
                  {clinica.twilio_auth_token ? '••••••••••••••••' : 'Usando padrão'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <span className="text-sm">WhatsApp Number</span>
                <span className="text-sm font-mono" style={{ color: '#5f6368' }}>
                  {clinica.twilio_whatsapp_number || 'Usando padrão'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}