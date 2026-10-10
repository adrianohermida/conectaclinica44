import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import ModuloGuard from "@/components/auth/ModuloGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Trash2, Edit, Shield, Mail, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { usePlano } from "@/components/providers/PlanoProvider";

export default function GestaoEquipe() {
  usePerformanceTracker('/GestaoEquipe');
  const queryClient = useQueryClient();
  const { clinicaId } = useClinicaContext();
  const { planoAtivo } = usePlano();
  const [panelAberto, setPanelAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    cargo: "assistente",
    crm: "",
    especialidade: ""
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me()
  });

  // CRITICAL: Qualquer usuário autenticado da clínica pode VER equipe (somente admin pode convidar/remover)
  const isAdminClinica = user?.role === 'admin';

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["equipe", clinicaId],
    queryFn: async () => {
      // CRITICAL: Listar via backend function (User entity não tem multi-tenant isolado)
      const response = await base44.functions.invoke('listarEquipeClinica', { clinica_id: clinicaId });
      return response.data.usuarios || [];
    },
    enabled: !!clinicaId
  });

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos", clinicaId],
    queryFn: () => base44.entities.Medico.filter({ clinica_id: clinicaId }),
    enabled: !!clinicaId
  });

  // CRÍTICO: Listar convites com tracking SendGrid (auto-refresh 30s)
  const { data: convites = [] } = useQuery({
    queryKey: ["convites", clinicaId],
    queryFn: async () => {
      const all = await base44.entities.ConviteUsuario.filter({ clinica_id: clinicaId });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!clinicaId,
    refetchInterval: 30000 // Refetch a cada 30s para status SendGrid
  });

  const [linkPublicoConviteEnviado, setLinkPublicoConviteEnviado] = useState(null);

  const convidarMutation = useMutation({
    mutationFn: async (dados) => {
      const response = await base44.functions.invoke('enviarConviteUsuario', {
        email_convidado: dados.email,
        perfil_atribuido: dados.cargo,
        full_name: dados.full_name
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["equipe"]);
      queryClient.invalidateQueries(["convites"]);
      
      // Mostrar link público para caso email não seja entregue
      if (data.link_publico) {
        setLinkPublicoConviteEnviado(data.link_publico);
        toast.success("✅ Convite enviado! Link público gerado para backup.");
      } else {
        setPanelAberto(false);
        resetForm();
        toast.success("✅ Convite enviado!");
      }
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      toast.error(`❌ ${msg}`);
    }
  });

  // CRÍTICO: Reenviar = novo convite + cancelar antigo
  const reenviarConviteMutation = useMutation({
    mutationFn: async (convite) => {
      // Criar novo convite com tracking fresco
      const response = await base44.functions.invoke('enviarConviteUsuario', {
        email_convidado: convite.email_convidado,
        perfil_atribuido: convite.perfil_atribuido,
        full_name: convite.nome_convidado
      });
      
      // Cancelar convite antigo
      await base44.functions.invoke('cancelarConvite', { convite_id: convite.id });
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["convites"]);
      toast.success("✅ Convite reenviado com tracking atualizado!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erro ao reenviar');
    }
  });

  // CRÍTICO: Cancelar convite via function (validação server-side)
  const cancelarConviteMutation = useMutation({
    mutationFn: async (conviteId) => {
      const response = await base44.functions.invoke('cancelarConvite', { convite_id: conviteId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["convites"]);
      toast.success("✅ Convite cancelado");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erro ao cancelar');
    }
  });

  // CRÍTICO: Excluir convite (delete permanente)
  const excluirConviteMutation = useMutation({
    mutationFn: async (conviteId) => {
      await base44.entities.ConviteUsuario.delete(conviteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["convites"]);
      toast.success("✅ Convite excluído");
    },
    onError: (error) => {
      toast.error("Erro ao excluir convite");
    }
  });

  // CRÍTICO: Remover usuário (admin da clínica pode)
  const removerUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      // VALIDAÇÃO: Não pode remover a si mesmo
      if (userId === user.id) {
        throw new Error("Você não pode remover seu próprio acesso");
      }

      // VALIDAÇÃO CFM: Verificar se usuário tem prontuários assinados
      const prontuarios = await base44.entities.Prontuario.filter({ 
        clinica_id: clinicaId,
        created_by: usuarios.find(u => u.id === userId)?.email
      });

      if (prontuarios.some(p => p.status_prontuario === 'assinado')) {
        throw new Error("Usuário tem prontuários assinados - não pode ser removido (CFM 1.821/07)");
      }

      // Remover vinculação da clínica (não deletar User)
      await base44.entities.User.update(userId, {
        clinica_id: null,
        cargo: null
      });

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["equipe"]);
      toast.success("✅ Usuário removido da equipe");
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      cargo: "assistente",
      crm: "",
      especialidade: ""
    });
    setEditando(null);
    setLinkPublicoConviteEnviado(null);
  };

  // CRÍTICO: Atualizar permissões de usuário (RBAC granular)
  const atualizarPermissoesMutation = useMutation({
    mutationFn: async ({ userId, novasCargos }) => {
      await base44.entities.User.update(userId, { cargo: novasCargos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["equipe"]);
      toast.success("✅ Permissões atualizadas");
    }
  });

  const [linkPublicoGerado, setLinkPublicoGerado] = useState(null);

  const gerarLinkPublicoMutation = useMutation({
    mutationFn: async (perfil) => {
      const response = await base44.functions.invoke('gerarLinkConvitePublico', {
        perfil_atribuido: perfil
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLinkPublicoGerado(data);
      toast.success("Link público gerado!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erro ao gerar link');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    convidarMutation.mutate({
      clinica_id: clinicaId,
      email: formData.email,
      full_name: formData.full_name,
      cargo: formData.cargo,
      crm: formData.crm,
      especialidade: formData.especialidade
    });
  };



  return (
    <RouteGuard requireAuth requireClinica>
      <div className="space-y-6 overflow-x-hidden">
        <PageHeader
          title="Gestão de Equipe"
          description={`${usuarios.length} usuário(s) na clínica`}
          action={isAdminClinica && (
            <div className="flex flex-col items-end gap-2">
              {planoAtivo && usuarios.length >= (planoAtivo.limite_usuarios || 3) && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Limite atingido ({usuarios.length}/{planoAtivo.limite_usuarios || 3}) - Upgrade necessário
                </p>
              )}
              <Button 
                onClick={() => {
                  if (planoAtivo && usuarios.length >= (planoAtivo.limite_usuarios || 3)) {
                    toast.error('Limite de usuários atingido. Faça upgrade do plano.');
                    return;
                  }
                  resetForm();
                  setPanelAberto(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Usuário
              </Button>
            </div>
          )}
        />

        {/* CONVITES COM TRACKING SENDGRID */}
        {convites.filter(c => c.status === 'pendente').length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6" style={{ borderColor: '#e8eaed' }}>
            <div className="px-6 py-4 border-b" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
              <h3 className="font-bold text-lg" style={{ color: '#202124' }}>
                📧 Convites Pendentes ({convites.filter(c => c.status === 'pendente').length})
              </h3>
              <p className="text-sm mt-1" style={{ color: '#5f6368' }}>
                Status de entrega atualizado automaticamente
              </p>
            </div>
            <div className="divide-y">
              {convites.filter(c => c.status === 'pendente').map(convite => {
                // Config status visual
                const statusMap = {
                  enviando: { icon: '⏳', label: 'Enviando...', color: '#9aa0a6', bg: '#f8f9fa' },
                  enviado: { icon: '✉️', label: 'Enviado', color: '#1a73e8', bg: '#e8f0fe' },
                  entregue: { icon: '📬', label: 'Entregue', color: '#1a73e8', bg: '#e8f0fe' },
                  aberto: { icon: '👁️', label: 'Aberto', color: '#7E57FF', bg: '#f5f3ff' },
                  clicado: { icon: '🔗', label: 'Clicou no link!', color: '#34a853', bg: '#e6f4ea' },
                  bounce: { icon: '❌', label: 'Email rejeitado', color: '#ea4335', bg: '#fce8e6' },
                  spam: { icon: '⚠️', label: 'Marcado spam', color: '#ea4335', bg: '#fce8e6' },
                  erro: { icon: '⚠️', label: 'Erro envio', color: '#ea4335', bg: '#fce8e6' }
                };
                const status = statusMap[convite.status_email] || statusMap.enviando;

                return (
                  <div key={convite.id} className="p-5 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold truncate" style={{ color: '#202124' }}>
                            {convite.email_convidado}
                          </h4>
                          <span 
                            className="text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap"
                            style={{ backgroundColor: status.bg, color: status.color }}
                          >
                            {status.icon} {status.label}
                          </span>
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            {convite.perfil_atribuido}
                          </span>
                        </div>

                        <p className="text-xs" style={{ color: '#9aa0a6' }}>
                          Enviado {new Date(convite.data_envio || convite.created_date).toLocaleDateString('pt-BR')}
                          {convite.data_leitura && ` • Aberto ${new Date(convite.data_leitura).toLocaleDateString('pt-BR')}`}
                          {convite.tentativas_envio > 1 && ` • ${convite.tentativas_envio} tentativas`}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => reenviarConviteMutation.mutate(convite)}
                          disabled={reenviarConviteMutation.isPending}
                          title="Reenviar com novo tracking"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-medium hover:bg-blue-50 transition-all min-h-[44px] disabled:opacity-50"
                          style={{ borderColor: '#7E57FF', color: '#7E57FF', fontSize: '14px' }}
                        >
                          {reenviarConviteMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Reenviar
                            </>
                          )}
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Cancelar convite para ${convite.email_convidado}?`)) {
                              cancelarConviteMutation.mutate(convite.id);
                            }
                          }}
                          loading={cancelarConviteMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`⚠️ EXCLUIR permanentemente convite para ${convite.email_convidado}?\n\nEsta ação não pode ser desfeita.`)) {
                              excluirConviteMutation.mutate(convite.id);
                            }
                          }}
                          loading={excluirConviteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de Usuários */}
        <div className="bg-white rounded-2xl shadow-sm border divide-y overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
              <p style={{ color: '#5f6368' }}>Carregando equipe...</p>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
              <p className="font-medium mb-2" style={{ color: '#5f6368' }}>Nenhum usuário cadastrado</p>
              <Button onClick={() => setPanelAberto(true)} variant="secondary">
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Primeiro Usuário
              </Button>
            </div>
          ) : (
            usuarios.map(usuario => {
              const medicoVinculado = medicos.find(m => m.email === usuario.email);
              const podeRemover = usuario.id !== user.id; // Não pode remover a si mesmo

              return (
                <div key={usuario.id} className="p-5 hover:bg-gray-50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                        <Users className="w-6 h-6" style={{ color: '#7E57FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold mb-1 truncate" style={{ color: '#202124', fontSize: '16px' }}>
                          {usuario.full_name}
                        </h3>
                        <div className="flex flex-col gap-1 mb-2">
                          <span className="text-sm flex items-center gap-2 truncate" style={{ color: '#5f6368' }}>
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            {usuario.email}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            usuario.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {usuario.role === 'admin' ? 'SuperAdmin' : usuario.cargo || 'Usuário'}
                          </span>
                          {medicoVinculado && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                              Médico - CRM {medicoVinculado.crm}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* GESTÃO DE PERMISSÕES */}
                      <button
                        onClick={() => {
                          setEditando(usuario);
                          setFormData({ 
                            ...formData, 
                            cargo: usuario.cargo || 'assistente',
                            full_name: usuario.full_name,
                            email: usuario.email
                          });
                          setPanelAberto(true);
                        }}
                        className="rounded-xl hover:bg-blue-50 border transition-all min-h-[48px] min-w-[48px] flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: '#7E57FF' }}
                        aria-label="Editar permissões"
                      >
                        <Edit className="w-5 h-5" style={{ color: '#7E57FF' }} />
                      </button>

                      {podeRemover && (
                        <button
                          onClick={() => {
                            if (confirm(`❌ Remover ${usuario.full_name} da equipe?\n\nEsta ação remove o acesso à clínica mas não deleta a conta do usuário.`)) {
                              removerUsuarioMutation.mutate(usuario.id);
                            }
                          }}
                          disabled={removerUsuarioMutation.isPending}
                          aria-label="Remover da equipe"
                          className="rounded-xl hover:bg-red-50 border transition-all min-h-[48px] min-w-[48px] flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                          style={{ borderColor: '#f9b8b6' }}
                        >
                          <Trash2 className="w-5 h-5" style={{ color: '#ea4335' }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Convite */}
        <SlideInPanel
          open={panelAberto}
          onClose={() => {
            setPanelAberto(false);
            resetForm();
          }}
          title={editando ? "Editar Permissões" : "Convidar Novo Membro"}
          maxWidth="600px"
        >
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editando) {
              // Atualizar permissões
              atualizarPermissoesMutation.mutate({ userId: editando.id, novasCargos: formData.cargo });
              setPanelAberto(false);
              resetForm();
            } else {
              handleSubmit(e);
            }
          }} className="space-y-5">
            {!editando && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  📧 Um email de convite será enviado com link de acesso
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
                Nome Completo *
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Ex: Dr. João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!editando}
                placeholder="joao@clinica.com.br"
                className={editando ? 'bg-gray-100' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
                Cargo *
              </label>
              <Select 
                value={formData.cargo} 
                onValueChange={(v) => setFormData({ ...formData, cargo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="recepcionista">Recepcionista</SelectItem>
                  <SelectItem value="assistente">Assistente</SelectItem>
                  <SelectItem value="enfermeiro">Enfermeiro(a)</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos extras para médicos */}
            {formData.cargo === 'medico' && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
                    CRM (Opcional)
                  </label>
                  <Input
                    value={formData.crm}
                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                    placeholder="Ex: 12345-AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
                    Especialidade (Opcional)
                  </label>
                  <Input
                    value={formData.especialidade}
                    onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                    placeholder="Ex: Clínica Médica"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#e8eaed' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPanelAberto(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={convidarMutation.isPending || atualizarPermissoesMutation.isPending}
                disabled={!!linkPublicoConviteEnviado}
              >
                {editando ? 'Salvar Alterações' : 'Enviar Convite'}
              </Button>
            </div>

            {/* LINK PÚBLICO GERADO APÓS ENVIO */}
            {linkPublicoConviteEnviado && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: '#e8eaed' }}>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-green-900 mb-2">✅ Convite enviado com sucesso!</p>
                  <p className="text-xs text-green-800 mb-3">
                    Email enviado para <strong>{formData.email}</strong>. Se o email não for entregue, use o link público abaixo:
                  </p>
                  <div className="bg-white border rounded-lg p-3 mb-3">
                    <code className="text-xs text-gray-700 break-all">
                      {linkPublicoConviteEnviado}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(linkPublicoConviteEnviado);
                        toast.success("📋 Link copiado!");
                      }}
                      className="flex-1"
                    >
                      📋 Copiar Link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const msg = `Olá! Você foi convidado para fazer parte da nossa equipe.\n\nClique aqui para aceitar: ${linkPublicoConviteEnviado}`;
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                        window.open(whatsappUrl, '_blank');
                      }}
                      className="flex-1"
                    >
                      💬 WhatsApp
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPanelAberto(false);
                      resetForm();
                    }}
                    className="w-full mt-3"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}

            {/* ALTERNATIVA: Link Público */}
            {!editando && !linkPublicoConviteEnviado && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: '#e8eaed' }}>
                <p className="text-sm font-bold mb-3" style={{ color: '#202124' }}>
                  🔗 Alternativa: Link Público
                </p>
                <p className="text-xs mb-3" style={{ color: '#5f6368' }}>
                  Gere um link que pode ser compartilhado por WhatsApp, Telegram ou outro canal
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => gerarLinkPublicoMutation.mutate(formData.cargo)}
                  loading={gerarLinkPublicoMutation.isPending}
                  className="w-full"
                >
                  Gerar Link Público (válido 7 dias)
                </Button>

                {linkPublicoGerado && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-green-900 mb-2">✅ Link gerado!</p>
                    <div className="bg-white border rounded-lg p-3 mb-3">
                      <code className="text-xs text-gray-700 break-all">
                        {linkPublicoGerado.link_publico}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(linkPublicoGerado.link_publico);
                          toast.success("Link copiado!");
                        }}
                        className="flex-1"
                      >
                        📋 Copiar Link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const msg = `Olá! Você foi convidado para nossa clínica.\n\nClique aqui: ${linkPublicoGerado.link_publico}`;
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="flex-1"
                      >
                        💬 WhatsApp
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Válido até {new Date(linkPublicoGerado.validade_ate).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>
        </SlideInPanel>
      </div>
    </RouteGuard>
  );
}