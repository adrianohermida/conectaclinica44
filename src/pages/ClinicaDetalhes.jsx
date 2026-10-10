import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConviteUsuario from "@/components/workspace/ConviteUsuario";
import {
  Building2,
  Users,
  CreditCard,
  Activity,
  Mail,
  Bell,
  Edit,
  Save,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Zap,
  CheckCircle,
  AlertCircle,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";

export default function ClinicaDetalhes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clinicaId = urlParams.get("id");

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: clinica, isLoading } = useQuery({
    queryKey: ["clinica", clinicaId],
    queryFn: async () => {
      const result = await base44.entities.Clinica.filter({ id: clinicaId });
      if (result.length === 0) throw new Error("Clínica não encontrada");
      setFormData(result[0]);
      return result[0];
    },
    enabled: !!clinicaId
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-clinica", clinicaId],
    queryFn: async () => {
      const result = await base44.entities.User.filter({ clinica_id: clinicaId });
      return result;
    },
    enabled: !!clinicaId
  });

  const { data: assinatura } = useQuery({
    queryKey: ["assinatura-clinica", clinicaId],
    queryFn: async () => {
      const result = await base44.entities.AssinaturaClinica.filter({ clinica_id: clinicaId });
      return result[0];
    },
    enabled: !!clinicaId
  });

  const { data: creditosIA } = useQuery({
    queryKey: ["creditos-ia", clinicaId],
    queryFn: async () => {
      const result = await base44.entities.CreditoIA.filter({ clinica_id: clinicaId });
      return result[0];
    },
    enabled: !!clinicaId
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Clinica.update(clinicaId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["clinica", clinicaId]);
      setEditMode(false);
    }
  });

  const enviarMensagemMutation = useMutation({
    mutationFn: async ({ assunto, mensagem }) => {
      await base44.integrations.Core.SendEmail({
        to: clinica.admin_principal_email,
        subject: `[ConectaClínica] ${assunto}`,
        body: mensagem
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleUpgrade = async () => {
    // Redirecionar para checkout Stripe ou criar sessão
    const planoAtual = clinica.plano_assinatura;
    // Lógica de upgrade
  };

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true}>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </RouteGuard>
    );
  }

  if (!clinica) {
    return (
      <RouteGuard requireAuth={true}>
        <PageHeader title="Clínica não encontrada" />
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={clinica.nome}
          description={`ID: ${clinica.id_visual || clinica.id}`}
          showBack={true}
          action={
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const assunto = prompt("Assunto:");
                  const mensagem = prompt("Mensagem:");
                  if (assunto && mensagem) {
                    enviarMensagemMutation.mutate({ assunto, mensagem });
                  }
                }}
                variant="outline"
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar Mensagem
              </Button>
              {editMode ? (
                <>
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={() => setEditMode(false)} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          }
        />

        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold">{clinica.status_assinatura?.toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuários</p>
                <p className="text-lg font-bold">{clinica.uso_atual?.usuarios || 0} / {clinica.limites_plano?.max_usuarios || "∞"}</p>
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pacientes</p>
                <p className="text-lg font-bold">{clinica.uso_atual?.pacientes || 0} / {clinica.limites_plano?.max_pacientes || "∞"}</p>
              </div>
            </div>
          </div>

          <div className="pc-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Créditos IA</p>
                <p className="text-lg font-bold">{creditosIA?.saldo_atual || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="w-full grid grid-cols-5 mb-6">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="equipe">Equipe ({usuarios.length})</TabsTrigger>
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
            <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
            <TabsTrigger value="acoes">Ações</TabsTrigger>
          </TabsList>

          {/* Dados Gerais */}
          <TabsContent value="dados">
            <div className="pc-card p-6">
              <h3 className="text-lg font-bold mb-6">Informações da Clínica</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Nome da Clínica *</label>
                  <Input
                    value={formData.nome || ""}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Slug *</label>
                  <Input
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">CNPJ</label>
                  <Input
                    value={formData.cnpj || ""}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Razão Social</label>
                  <Input
                    value={formData.razao_social || ""}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email *</label>
                  <Input
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Telefone</label>
                  <Input
                    value={formData.telefone || ""}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">WhatsApp</label>
                  <Input
                    value={formData.whatsapp || ""}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">CEP</label>
                  <Input
                    value={formData.cep || ""}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2">Endereço Completo</label>
                  <Input
                    value={formData.endereco_completo || ""}
                    onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Cidade</label>
                  <Input
                    value={formData.cidade || ""}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Estado</label>
                  <Input
                    value={formData.estado || ""}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Email do Administrador *</label>
                  <Input
                    value={formData.admin_principal_email || ""}
                    onChange={(e) => setFormData({ ...formData, admin_principal_email: e.target.value })}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Plano</label>
                  <Select
                    value={formData.plano_assinatura}
                    onValueChange={(value) => setFormData({ ...formData, plano_assinatura: value })}
                    disabled={!editMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Equipe */}
          <TabsContent value="equipe">
            <div className="space-y-6">
              <ConviteUsuario />
              
              <div className="pc-card p-6">
                <h3 className="text-lg font-bold mb-4">Membros da Equipe ({usuarios.length})</h3>
                {usuarios.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum membro cadastrado</p>
                ) : (
                  <div className="space-y-3">
                    {usuarios.map(usuario => (
                      <div key={usuario.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                        <div className="flex-1">
                          <p className="font-medium">{usuario.full_name}</p>
                          <p className="text-sm text-gray-500">{usuario.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="pc-badge pc-badge-primary">{usuario.perfil || usuario.role}</span>
                          {usuario.onboarding_completo && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Recursos */}
          <TabsContent value="recursos">
            <div className="pc-card p-6">
              <h3 className="text-lg font-bold mb-6">Uso de Recursos</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Usuários</span>
                    <span className="text-sm text-gray-600">
                      {clinica.uso_atual?.usuarios || 0} / {clinica.limites_plano?.max_usuarios || "∞"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-600 h-3 rounded-full"
                      style={{ 
                        width: `${((clinica.uso_atual?.usuarios || 0) / (clinica.limites_plano?.max_usuarios || 100)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Pacientes</span>
                    <span className="text-sm text-gray-600">
                      {clinica.uso_atual?.pacientes || 0} / {clinica.limites_plano?.max_pacientes || "∞"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ 
                        width: `${((clinica.uso_atual?.pacientes || 0) / (clinica.limites_plano?.max_pacientes || 1000)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Agendamentos/Mês</span>
                    <span className="text-sm text-gray-600">
                      {clinica.uso_atual?.agendamentos_mes || 0} / {clinica.limites_plano?.max_agendamentos_mes || "∞"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full"
                      style={{ 
                        width: `${((clinica.uso_atual?.agendamentos_mes || 0) / (clinica.limites_plano?.max_agendamentos_mes || 1000)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Storage (GB)</span>
                    <span className="text-sm text-gray-600">
                      {clinica.uso_atual?.storage_usado_gb || 0} / {clinica.limites_plano?.storage_gb || "∞"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-amber-600 h-3 rounded-full"
                      style={{ 
                        width: `${((clinica.uso_atual?.storage_usado_gb || 0) / (clinica.limites_plano?.storage_gb || 100)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Assinatura */}
          <TabsContent value="assinatura">
            <div className="space-y-6">
              <div className="pc-card p-6">
                <h3 className="text-lg font-bold mb-6">Assinatura Atual</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Plano</p>
                    <p className="text-xl font-bold text-purple-600">{clinica.plano_assinatura?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`pc-badge ${
                      clinica.status_assinatura === 'ativa' ? 'pc-badge-success' :
                      clinica.status_assinatura === 'trial' ? 'pc-badge-warning' : 'pc-badge-error'
                    }`}>
                      {clinica.status_assinatura?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vencimento</p>
                    <p className="font-medium">
                      {clinica.data_vencimento_plano ? format(new Date(clinica.data_vencimento_plano), "dd/MM/yyyy") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Stripe Customer ID</p>
                    <p className="font-mono text-sm">{clinica.stripe_customer_id || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="pc-card p-6">
                <h3 className="text-lg font-bold mb-4">Créditos IA</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Saldo Atual</p>
                    <p className="text-3xl font-bold text-amber-600">{creditosIA?.saldo_atual || 0}</p>
                  </div>
                  <Button onClick={() => navigate(createPageUrl("RecargaCreditos"))}>
                    <Zap className="w-4 h-4 mr-2" />
                    Recarregar
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Ações */}
          <TabsContent value="acoes">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => alert("Upgrade via Stripe em desenvolvimento")}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <ArrowUpCircle className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-bold mb-2">Upgrade de Plano</h3>
                <p className="text-sm text-gray-600">Melhorar plano da clínica via Stripe</p>
              </button>

              <button
                onClick={() => alert("Downgrade em desenvolvimento")}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <ArrowDownCircle className="w-8 h-8 text-orange-600 mb-3" />
                <h3 className="font-bold mb-2">Downgrade de Plano</h3>
                <p className="text-sm text-gray-600">Reduzir plano da clínica</p>
              </button>

              <button
                onClick={() => navigate(createPageUrl("RecargaCreditos"))}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <Zap className="w-8 h-8 text-amber-600 mb-3" />
                <h3 className="font-bold mb-2">Recarga Manual</h3>
                <p className="text-sm text-gray-600">Adicionar créditos manualmente</p>
              </button>

              <button
                onClick={() => {
                  const msg = prompt("Enviar aviso para a clínica:");
                  if (msg) {
                    enviarMensagemMutation.mutate({ assunto: "Aviso Importante", mensagem: msg });
                  }
                }}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <Bell className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-bold mb-2">Enviar Aviso</h3>
                <p className="text-sm text-gray-600">Notificar administrador</p>
              </button>

              <button
                onClick={() => {
                  if (confirm("Suspender assinatura?")) {
                    updateMutation.mutate({ status_assinatura: "suspensa" });
                  }
                }}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                <h3 className="font-bold mb-2">Suspender Conta</h3>
                <p className="text-sm text-gray-600">Suspender acesso temporariamente</p>
              </button>

              <button
                onClick={() => {
                  if (confirm("Reativar assinatura?")) {
                    updateMutation.mutate({ status_assinatura: "ativa" });
                  }
                }}
                className="pc-card p-6 hover:shadow-lg transition-all text-left"
              >
                <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-bold mb-2">Reativar Conta</h3>
                <p className="text-sm text-gray-600">Restaurar acesso à clínica</p>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RouteGuard>
  );
}