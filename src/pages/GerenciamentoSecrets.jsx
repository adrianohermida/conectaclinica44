import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { createPageUrl } from "@/utils";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Key,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function GerenciamentoSecrets() {
  usePerformanceTracker('/GerenciamentoSecrets');
  const [showPanel, setShowPanel] = useState(false);
  const [editingSecret, setEditingSecret] = useState(null);
  const [revelarValores, setRevelarValores] = useState({});
  const queryClient = useQueryClient();

  const { data: secrets = [], isLoading: loadingSecrets } = useOptimizedQuery({
    queryKey: ["secrets"],
    queryFn: () => base44.entities.SecretConector.list("-created_date"),
    initialData: []
  });

  const { data: conectores = [], isLoading: loadingConectores } = useOptimizedQuery({
    queryKey: ["conectores"],
    queryFn: () => base44.entities.Conector.list(),
    initialData: []
  });

  const isLoading = loadingSecrets || loadingConectores;

  const [formData, setFormData] = useState({
    conector_id: "",
    conector_nome: "",
    chave: "",
    valor_criptografado: "",
    descricao: "",
    data_expiracao: "",
    ativo: true,
    ambiente: "production"
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SecretConector.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["secrets"]);
      setShowPanel(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SecretConector.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["secrets"]);
      setShowPanel(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SecretConector.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["secrets"]);
    }
  });

  const resetForm = () => {
    setFormData({
      conector_id: "",
      conector_nome: "",
      chave: "",
      valor_criptografado: "",
      descricao: "",
      data_expiracao: "",
      ativo: true,
      ambiente: "production"
    });
    setEditingSecret(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simples "criptografia" base64 - em produção usar crypto real
    const dadosComValor = {
      ...formData,
      valor_criptografado: btoa(formData.valor_criptografado)
    };

    if (editingSecret) {
      updateMutation.mutate({ id: editingSecret.id, data: dadosComValor });
    } else {
      createMutation.mutate(dadosComValor);
    }
  };

  const handleEdit = (secret) => {
    setEditingSecret(secret);
    setFormData({
      ...secret,
      valor_criptografado: "" // Não mostrar valor ao editar
    });
    setShowPanel(true);
  };

  const handleDelete = (id) => {
    if (confirm("Deseja excluir este secret? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleRevelar = (secretId) => {
    setRevelarValores({
      ...revelarValores,
      [secretId]: !revelarValores[secretId]
    });
  };

  const getValorDecodificado = (valorCriptografado) => {
    try {
      return atob(valorCriptografado);
    } catch {
      return "***";
    }
  };

  const secretsAtivos = (secrets || []).filter(s => s.ativo).length;
  const secretsExpirando = (secrets || []).filter(s => {
    if (!s.data_expiracao) return false;
    const dias = differenceInDays(new Date(s.data_expiracao), new Date());
    return dias <= 30 && dias >= 0;
  }).length;

  const rotarSecret = async (secret) => {
    const novaDataExpiracao = new Date();
    novaDataExpiracao.setFullYear(novaDataExpiracao.getFullYear() + 1);
    
    await updateMutation.mutateAsync({
      id: secret.id,
      data: {
        ...secret,
        ultima_rotacao: format(new Date(), "yyyy-MM-dd"),
        data_expiracao: format(novaDataExpiracao, "yyyy-MM-dd")
      }
    });
  };

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-64" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="h-10 bg-gray-200 rounded w-10 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            ))}
          </div>

          {/* Cards Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-16 bg-gray-200 rounded-xl mb-4" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-10 bg-gray-200 rounded-xl w-24" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Secrets"
        description="Credenciais e chaves API"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Configuração APIs", href: createPageUrl("ConfiguracaoIntegracoes") },
          { label: "Secrets" }
        ]}
        action={
          <button
            onClick={() => {
              resetForm();
              setShowPanel(true);
            }}
            aria-label="Criar novo secret"
            className="font-bold py-3 px-6 rounded-full text-white hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Novo Secret</span>
          </button>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
              <Key className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#7E57FF' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Total Secrets</p>
              <p className="font-bold truncate" style={{ color: '#202124', fontSize: '28px' }}>{secrets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7ed' }}>
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#34a853' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Ativos</p>
              <p className="font-bold truncate" style={{ color: '#34a853', fontSize: '28px' }}>{secretsAtivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef9e5' }}>
              <Clock className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#f59e0b' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Expirando (30d)</p>
              <p className="font-bold truncate" style={{ color: '#f59e0b', fontSize: '28px' }}>{secretsExpirando}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fde7e7' }}>
              <Shield className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#ea4335' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Conectores</p>
              <p className="font-bold truncate" style={{ color: '#ea4335', fontSize: '28px' }}>{conectores.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {secretsExpirando > 0 && (
        <div className="rounded-2xl p-4 md:p-5 border overflow-hidden" style={{ backgroundColor: '#fef9e5', borderColor: '#fbd54f' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div className="min-w-0">
              <h3 className="font-bold mb-1" style={{ color: '#956802', fontSize: '18px' }}>Secrets Expirando</h3>
              <p className="break-words" style={{ color: '#956802', fontSize: '16px', lineHeight: '1.5' }}>
                {secretsExpirando} secret(s) expirarão nos próximos 30 dias. 
                Renove-os para evitar interrupções.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Secrets */}
      <div className="space-y-3">
        {secrets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-12 md:p-16 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <Key className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" style={{ color: '#dadce0' }} />
            <p className="font-medium mb-6" style={{ color: '#80868b', fontSize: '18px' }}>Nenhum secret configurado</p>
            <button
              onClick={() => {
                resetForm();
                setShowPanel(true);
              }}
              aria-label="Criar primeiro secret"
              className="font-bold py-3 px-6 rounded-full text-white hover:opacity-90 transition-all inline-flex items-center gap-2 min-h-[48px]"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Criar Primeiro Secret</span>
            </button>
          </div>
        ) : (
          secrets.map((secret) => {
            const conector = conectores.find(c => c.id === secret.conector_id);
            const diasParaExpirar = secret.data_expiracao 
              ? differenceInDays(new Date(secret.data_expiracao), new Date())
              : null;
            const expirando = diasParaExpirar !== null && diasParaExpirar <= 30 && diasParaExpirar >= 0;
            const expirado = diasParaExpirar !== null && diasParaExpirar < 0;

            const borderColor = expirado ? '#f9b8b6' : expirando ? '#fbd54f' : '#e8eaed';

            return (
              <div
                key={secret.id}
                className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden"
                style={{ borderColor }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Key className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
                      <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{secret.chave}</h3>
                      <span className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap" style={{ 
                        backgroundColor: secret.ativo ? '#e6f7ed' : '#f8f9fa',
                        color: secret.ativo ? '#1f6332' : '#5f6368',
                        fontSize: '14px'
                      }}>
                        {secret.ativo ? "Ativo" : "Inativo"}
                      </span>
                      {secret.ambiente === "development" && (
                        <span className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap" style={{ 
                          backgroundColor: '#fef9e5',
                          color: '#956802',
                          fontSize: '14px'
                        }}>
                          DEV
                        </span>
                      )}
                    </div>
                    <p className="mb-2 truncate" style={{ color: '#80868b', fontSize: '16px' }}>
                      {conector?.nome || secret.conector_nome}
                    </p>
                    {secret.descricao && (
                      <p className="break-words" style={{ color: '#80868b', fontSize: '16px', lineHeight: '1.5' }}>{secret.descricao}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl p-4 mb-4 overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 font-mono break-all min-w-0" style={{ color: '#5f6368', fontSize: '14px', lineHeight: '1.5' }}>
                      {revelarValores[secret.id]
                        ? getValorDecodificado(secret.valor_criptografado)
                        : "•".repeat(24)}
                    </div>
                    <button
                      onClick={() => toggleRevelar(secret.id)}
                      aria-label={revelarValores[secret.id] ? "Ocultar secret" : "Revelar secret"}
                      className="p-2.5 hover:opacity-80 rounded-xl transition-all flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      style={{ backgroundColor: '#e8eaed' }}
                    >
                      {revelarValores[secret.id] ? (
                        <EyeOff className="w-4 h-4" style={{ color: '#5f6368' }} />
                      ) : (
                        <Eye className="w-4 h-4" style={{ color: '#5f6368' }} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div style={{ fontSize: '16px' }}>
                    {secret.data_expiracao ? (
                      <span className="font-medium break-words" style={{
                        color: expirado ? '#ea4335' : expirando ? '#f59e0b' : '#5f6368'
                      }}>
                        {expirado ? "⚠️ Expirado" : expirando ? `⚠️ Expira em ${diasParaExpirar} dias` : `Expira em ${format(new Date(secret.data_expiracao), "dd/MM/yyyy")}`}
                      </span>
                    ) : (
                      <span className="font-medium" style={{ color: '#5f6368' }}>Sem expiração</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(expirando || expirado) && (
                      <button
                        onClick={() => rotarSecret(secret)}
                        aria-label="Renovar secret por mais um ano"
                        className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                        style={{ backgroundColor: '#e6f7ed', color: '#1f6332', fontSize: '14px' }}
                      >
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>Renovar +1 ano</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(secret)}
                      aria-label="Editar secret"
                      className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                      style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}
                    >
                      <Edit className="w-4 h-4 flex-shrink-0" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(secret.id)}
                      aria-label="Excluir secret"
                      className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                      style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px' }}
                    >
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SlideInPanel - Formulário */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingSecret ? "Editar Secret" : "Novo Secret"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-900 mb-1">Segurança</h4>
                <p className="text-sm text-yellow-800">
                  Os valores são criptografados antes de serem salvos. 
                  Nunca compartilhe secrets em texto simples.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conector *
            </label>
            <select
              value={formData.conector_id}
              onChange={(e) => {
                const conector = conectores.find(c => c.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  conector_id: e.target.value,
                  conector_nome: conector?.nome || ""
                });
              }}
              className="w-full border border-gray-300 rounded-lg p-3"
              required
            >
              <option value="">Selecione um conector</option>
              {conectores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Chave *
            </label>
            <Input
              value={formData.chave}
              onChange={(e) => setFormData({ ...formData, chave: e.target.value.toUpperCase() })}
              placeholder="Ex: API_KEY, API_SECRET"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor {editingSecret && "(deixe vazio para manter o atual)"}
            </label>
            <Input
              type="password"
              value={formData.valor_criptografado}
              onChange={(e) => setFormData({ ...formData, valor_criptografado: e.target.value })}
              placeholder="Valor do secret"
              required={!editingSecret}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Chave de API principal"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Expiração
              </label>
              <Input
                type="date"
                value={formData.data_expiracao}
                onChange={(e) => setFormData({ ...formData, data_expiracao: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambiente
              </label>
              <select
                value={formData.ambiente}
                onChange={(e) => setFormData({ ...formData, ambiente: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3"
              >
                <option value="production">Production</option>
                <option value="development">Development</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Secret Ativo</label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPanel(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              aria-label={editingSecret ? "Atualizar secret" : "Salvar novo secret"}
              className="flex-1 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 min-h-[48px]"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingSecret ? "Atualizar" : "Salvar Secret"}
            </button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}