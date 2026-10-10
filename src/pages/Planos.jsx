import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Check, DollarSign, Users as UsersIcon, X } from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

const MODULOS_DISPONIVEIS = [
  { id: "dashboard", nome: "Dashboard", categoria: "essencial" },
  { id: "agenda", nome: "Agenda", categoria: "essencial" },
  { id: "pacientes", nome: "Pacientes", categoria: "essencial" },
  { id: "prontuarios", nome: "Prontuários", categoria: "essencial" },
  { id: "produtos", nome: "Produtos", categoria: "essencial" },
  { id: "administracao", nome: "Administração", categoria: "essencial" },
  { id: "relatorios", nome: "Relatórios", categoria: "admin" },
  { id: "financeiro", nome: "Financeiro", categoria: "admin" },
  { id: "estoque", nome: "Estoque", categoria: "admin" },
  { id: "jornada", nome: "Jornada do Paciente", categoria: "avancado" },
  { id: "planos_tratamento", nome: "Planos de Tratamento", categoria: "avancado" },
  { id: "analise_ia", nome: "Análise IA", categoria: "avancado" },
  { id: "colaboracao", nome: "Colaboração Médica", categoria: "avancado" },
  { id: "telemedicina", nome: "Telemedicina", categoria: "avancado" }
];

// CRÍTICO: Sincronizar PlanoModulo → AssinaturaClinica (beta_clinicas)
async function sincronizarModulosAssinaturas(plano) {
  try {
    // 1. Sincronizar clínicas normais (plano_slug)
    const assinaturasPorSlug = await base44.entities.AssinaturaClinica.filter({ 
      plano_slug: plano.nome.toLowerCase() 
    });
    
    for (const ass of assinaturasPorSlug) {
      await base44.entities.AssinaturaClinica.update(ass.id, {
        modulos_inclusos: plano.modulos_inclusos
      });
    }

    // 2. CRÍTICO: Sincronizar beta_clinicas (acesso gratuito)
    if (plano.beta_clinicas && plano.beta_clinicas.length > 0) {
      const todasAssinaturas = await base44.entities.AssinaturaClinica.list();
      
      for (const clinicaId of plano.beta_clinicas) {
        const assClinica = todasAssinaturas.find(a => a.clinica_id === clinicaId);
        
        if (assClinica) {
          await base44.entities.AssinaturaClinica.update(assClinica.id, {
            plano_slug: plano.nome.toLowerCase(),
            modulos_inclusos: plano.modulos_inclusos,
            limites: {
              max_usuarios: plano.nome.toLowerCase() === 'enterprise' ? 999 : plano.nome.toLowerCase() === 'profissional' ? 10 : 3,
              max_pacientes: plano.nome.toLowerCase() === 'enterprise' ? 999999 : plano.nome.toLowerCase() === 'profissional' ? 5000 : 100,
              max_agendamentos_mes: plano.nome.toLowerCase() === 'enterprise' ? 999999 : plano.nome.toLowerCase() === 'profissional' ? 10000 : 1000,
              storage_gb: plano.nome.toLowerCase() === 'enterprise' ? 1000 : plano.nome.toLowerCase() === 'profissional' ? 50 : 5
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro sincronizar módulos:', error);
  }
}

export default function Planos() {
  usePerformanceTracker('/Planos');
  const queryClient = useQueryClient();
  const [panelAberto, setPanelAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco_mensal: 0,
    preco_anual: 0,
    modulos_inclusos: [],
    stripe_price_id_mensal: "",
    stripe_price_id_anual: "",
    ativo: true,
    ordem: 1,
    destaque: false,
    beta_clinicas: []
  });
  const [buscaClinica, setBuscaClinica] = useState("");
  const [mostrarBuscaClinicas, setMostrarBuscaClinicas] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const { data: planos = [], isLoading } = useOptimizedQuery({
    queryKey: ["planos_modulo"],
    queryFn: () => base44.entities.PlanoModulo.list()
  });

  const { data: clinicas = [] } = useOptimizedQuery({
    queryKey: ["clinicas"],
    queryFn: () => base44.entities.Clinica.list(),
    enabled: mostrarBuscaClinicas
  });

  const criarPlanoMutation = useMutation({
    mutationFn: async (data) => {
      const plano = await base44.entities.PlanoModulo.create(data);
      // Sincronizar modulos_inclusos para AssinaturaClinica
      await sincronizarModulosAssinaturas(plano);
      return plano;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["planos_modulo"]);
      setPanelAberto(false);
      resetForm();
    }
  });

  const atualizarPlanoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const plano = await base44.entities.PlanoModulo.update(id, data);
      // Sincronizar modulos_inclusos para AssinaturaClinica
      await sincronizarModulosAssinaturas(plano);
      return plano;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["planos_modulo"]);
      setPanelAberto(false);
      resetForm();
    }
  });

  const deletarPlanoMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanoModulo.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["planos_modulo"])
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      preco_mensal: 0,
      preco_anual: 0,
      modulos_inclusos: [],
      stripe_price_id_mensal: "",
      stripe_price_id_anual: "",
      ativo: true,
      ordem: 1,
      destaque: false,
      beta_clinicas: []
    });
    setPlanoEditando(null);
    setBuscaClinica("");
    setMostrarBuscaClinicas(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (planoEditando) {
      atualizarPlanoMutation.mutate({ id: planoEditando.id, data: formData });
    } else {
      criarPlanoMutation.mutate(formData);
    }
  };

  const handleEditar = (plano) => {
    setPlanoEditando(plano);
    setFormData({
      nome: plano.nome,
      descricao: plano.descricao || "",
      preco_mensal: plano.preco_mensal,
      preco_anual: plano.preco_anual,
      modulos_inclusos: plano.modulos_inclusos || [],
      stripe_price_id_mensal: plano.stripe_price_id_mensal || "",
      stripe_price_id_anual: plano.stripe_price_id_anual || "",
      ativo: plano.ativo !== undefined ? plano.ativo : true,
      ordem: plano.ordem || 1,
      destaque: plano.destaque !== undefined ? plano.destaque : false,
      beta_clinicas: plano.beta_clinicas || []
    });
    setPanelAberto(true);
  };

  const toggleModulo = (moduloId) => {
    setFormData(prev => ({
      ...prev,
      modulos_inclusos: prev.modulos_inclusos.includes(moduloId)
        ? prev.modulos_inclusos.filter(m => m !== moduloId)
        : [...prev.modulos_inclusos, moduloId]
    }));
  };

  const adicionarClinicaBeta = (clinicaId) => {
    if (!formData.beta_clinicas.includes(clinicaId)) {
      setFormData(prev => ({
        ...prev,
        beta_clinicas: [...prev.beta_clinicas, clinicaId]
      }));
    }
    setBuscaClinica("");
  };

  const removerClinicaBeta = (clinicaId) => {
    setFormData(prev => ({
      ...prev,
      beta_clinicas: prev.beta_clinicas.filter(id => id !== clinicaId)
    }));
  };

  const clinicasFiltradas = clinicas.filter(c => 
    c.nome.toLowerCase().includes(buscaClinica.toLowerCase()) ||
    c.email.toLowerCase().includes(buscaClinica.toLowerCase())
  );

  const criarPlanoEssencial = () => {
    criarPlanoMutation.mutate({
      nome: "Essencial",
      descricao: "Plano com módulos essenciais para gestão da clínica",
      preco_mensal: 297,
      preco_anual: 2970,
      modulos_inclusos: [
        "dashboard",
        "agenda",
        "pacientes",
        "prontuarios",
        "produtos",
        "administracao",
        "relatorios",
        "financeiro",
        "estoque"
      ],
      ativo: true,
      ordem: 1,
      destaque: true
    });
  };

  if (pageLoading || isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-24" />
                    <div className="h-8 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Planos"
        description="Módulos e preços"
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={criarPlanoEssencial} aria-label="Criar plano essencial" className="font-bold rounded-full hover:bg-gray-50 border min-h-[48px] px-5" style={{ borderColor: '#e8eaed', color: '#5f6368', fontSize: '14px' }}>
              Criar Plano Essencial
            </button>
            <button onClick={() => {
              resetForm();
              setPanelAberto(true);
            }} aria-label="Criar novo plano" className="font-bold rounded-full hover:opacity-90 min-h-[48px] px-6 flex items-center gap-2" style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '15px' }}>
              <Plus className="w-4 h-4 flex-shrink-0" />
              Novo Plano
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 overflow-hidden">:::
        {planos.map(plano => (
          <div key={plano.id} className="bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4 overflow-hidden">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 overflow-hidden">
                  <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '20px' }}>{plano.nome}</h3>
                  {plano.destaque && (
                    <span className="pc-badge pc-badge-primary">Destaque</span>
                  )}
                  {!plano.ativo && (
                    <span className="pc-badge pc-badge-neutral">Inativo</span>
                  )}
                </div>
                <p className="pc-body-sm text-[var(--pc-text-secondary)] mb-3">
                  {plano.descricao}
                </p>
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2 bg-[var(--pc-success-50)] px-3 py-1.5 rounded-full">
                    <DollarSign className="w-4 h-4 text-[var(--pc-success)]" />
                    <span className="pc-body-sm font-medium text-[var(--pc-success-700)]">
                      R$ {plano.preco_mensal}/mês
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[var(--pc-success-50)] px-3 py-1.5 rounded-full">
                    <DollarSign className="w-4 h-4 text-[var(--pc-success)]" />
                    <span className="pc-body-sm font-medium text-[var(--pc-success-700)]">
                      R$ {plano.preco_anual}/ano
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditar(plano)}
                  aria-label="Editar plano"
                  className="rounded-xl hover:bg-gray-100 border transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
                  style={{ borderColor: '#e8eaed' }}
                >
                  <Edit className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Deseja deletar este plano?")) {
                      deletarPlanoMutation.mutate(plano.id);
                    }
                  }}
                  aria-label="Deletar plano"
                  className="rounded-xl hover:bg-red-50 border transition-all min-h-[48px] min-w-[48px] flex items-center justify-center"
                  style={{ borderColor: '#f9b8b6' }}
                >
                  <Trash2 className="w-5 h-5 flex-shrink-0" style={{ color: '#ea4335' }} />
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--pc-border-secondary)] pt-4">
              <p className="pc-body-sm font-medium mb-3 text-[var(--pc-text-secondary)]">
                Módulos Inclusos ({plano.modulos_inclusos?.length || 0})
              </p>
              <div className="flex flex-wrap gap-2">
                {plano.modulos_inclusos?.map(moduloId => {
                  const modulo = MODULOS_DISPONIVEIS.find(m => m.id === moduloId);
                  return (
                    <span key={moduloId} className="pc-badge pc-badge-success">
                      {modulo?.nome || moduloId}
                    </span>
                  );
                })}
              </div>

              {plano.beta_clinicas?.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-yellow-800 mb-2">
                    🎁 {plano.beta_clinicas.length} clínica(s) com acesso gratuito (Beta)
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {planos.length === 0 && (
          <div className="bg-white rounded-xl p-12 border border-[var(--pc-border-primary)] shadow-sm text-center">
            <p className="pc-body text-[var(--pc-text-secondary)] mb-4">
              Nenhum plano cadastrado
            </p>
            <Button onClick={criarPlanoEssencial}>
              Criar Plano Essencial
            </Button>
          </div>
        )}
      </div>

      <SlideInPanel
        open={panelAberto}
        onClose={() => {
          setPanelAberto(false);
          resetForm();
        }}
        title={planoEditando ? "Editar Plano" : "Novo Plano"}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="pc-body-sm font-medium mb-2 block text-[var(--pc-text-secondary)]">Nome do Plano</label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="pc-body-sm font-medium mb-2 block text-[var(--pc-text-secondary)]">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="pc-input w-full h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="pc-body-sm font-medium mb-2 block text-[var(--pc-text-secondary)]">Preço Mensal (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_mensal}
                onChange={(e) => setFormData({ ...formData, preco_mensal: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="pc-body-sm font-medium mb-2 block text-[var(--pc-text-secondary)]">Preço Anual (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_anual}
                onChange={(e) => setFormData({ ...formData, preco_anual: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>

          <div>
            <label className="pc-body-sm font-medium mb-3 block text-[var(--pc-text-secondary)]">Módulos Inclusos</label>
            <div className="space-y-4">
              {["essencial", "admin", "avancado"].map(categoria => {
                const modulosCategoria = MODULOS_DISPONIVEIS.filter(m => m.categoria === categoria);
                return (
                  <div key={categoria}>
                    <p className="pc-caption uppercase text-[var(--pc-text-tertiary)] mb-2 font-semibold">
                      {categoria === "essencial" ? "Essenciais" : categoria === "admin" ? "Administrativos" : "Avançados"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {modulosCategoria.map(modulo => (
                        <button
                          key={modulo.id}
                          type="button"
                          onClick={() => toggleModulo(modulo.id)}
                          className={`bg-white border-2 rounded-lg p-3 text-left pc-transition-fast ${
                            formData.modulos_inclusos.includes(modulo.id)
                              ? "border-[#7E57FF] bg-[#f5f3ff] shadow-sm"
                              : "border-[#e8eaed] hover:border-[#7E57FF] hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              formData.modulos_inclusos.includes(modulo.id)
                                ? "border-[#7E57FF] bg-[#7E57FF]"
                                : "border-[#bdc1c6] bg-white"
                            }`}>
                              {formData.modulos_inclusos.includes(modulo.id) && (
                                <Check className="w-3.5 h-3.5" style={{ color: 'white' }} />
                              )}
                            </div>
                            <span className="text-sm font-medium" style={{ color: '#202124' }}>{modulo.nome}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--pc-surface-variant)] rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.ativo}
                onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                className="w-5 h-5 rounded border-2 border-[var(--pc-gray-400)] text-[var(--pc-primary)]"
              />
              <span className="pc-body-sm font-medium">Plano Ativo</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.destaque}
                onChange={(e) => setFormData(prev => ({ ...prev, destaque: e.target.checked }))}
                className="w-5 h-5 rounded border-2 border-[var(--pc-gray-400)] text-[var(--pc-primary)]"
              />
              <span className="pc-body-sm font-medium">Plano em Destaque</span>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)]">
                Clínicas Beta ({formData.beta_clinicas.length})
              </label>
              <Button 
                type="button"
                variant="secondary" 
                size="sm"
                onClick={() => setMostrarBuscaClinicas(!mostrarBuscaClinicas)}
              >
                <UsersIcon className="w-4 h-4 mr-2" />
                {mostrarBuscaClinicas ? "Fechar" : "Adicionar Clínicas"}
              </Button>
            </div>

            {mostrarBuscaClinicas && (
              <div className="mb-3 space-y-2">
                <Input
                  value={buscaClinica}
                  onChange={(e) => setBuscaClinica(e.target.value)}
                  placeholder="Buscar clínica por nome ou email..."
                  className="rounded-xl"
                />
                {buscaClinica.length >= 2 && clinicasFiltradas.length > 0 && (
                  <div className="bg-white border rounded-xl max-h-56 overflow-y-auto" style={{ borderColor: '#e8eaed' }}>
                    {clinicasFiltradas.map(clinica => (
                      <button
                        key={clinica.id}
                        type="button"
                        onClick={() => adicionarClinicaBeta(clinica.id)}
                        disabled={formData.beta_clinicas.includes(clinica.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed border-b last:border-0"
                        style={{ borderColor: '#f1f3f4' }}
                      >
                        <div className="text-sm font-semibold" style={{ color: '#202124' }}>{clinica.nome}</div>
                        <div className="text-xs" style={{ color: '#5f6368' }}>{clinica.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {buscaClinica.length >= 2 && clinicasFiltradas.length === 0 && (
                  <p className="text-xs text-center py-3" style={{ color: '#9aa0a6' }}>Nenhuma clínica encontrada</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {formData.beta_clinicas.map(clinicaId => {
                const clinica = clinicas.find(c => c.id === clinicaId);
                return (
                  <span 
                    key={clinicaId} 
                    className="pc-badge pc-badge-info flex items-center gap-2"
                  >
                    {clinica?.nome || clinicaId}
                    <button
                      type="button"
                      onClick={() => removerClinicaBeta(clinicaId)}
                      className="hover:text-[var(--pc-error)] pc-transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {formData.beta_clinicas.length === 0 && (
                <p className="pc-caption text-[var(--pc-text-tertiary)]">
                  Nenhuma clínica com acesso beta
                </p>
              )}
            </div>

            {formData.beta_clinicas.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-3">
                <p className="text-sm font-bold text-yellow-800 mb-2">
                  🎁 Acesso Beta Gratuito
                </p>
                <p className="text-xs text-yellow-700">
                  Estas clínicas terão acesso GRATUITO a este plano (sem cobrança Stripe). 
                  Recargas de créditos continuam pagas normalmente.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--pc-border-secondary)]">
            <Button type="submit" className="flex-1">
              {planoEditando ? "Atualizar" : "Criar"} Plano
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPanelAberto(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}