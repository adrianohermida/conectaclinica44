import React, { useState, useMemo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { validarCPF, validarEmail, validarTelefone } from "../components/utils/validacoes";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Plus, Phone, Mail, MapPin, Search, Grid3x3, List as ListIcon, Upload, MoreVertical, Edit, Trash2, Archive, GitMerge, X, Check, Loader2 } from "lucide-react";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { FixedSizeList as VirtualList } from "react-window";
import { useNavigate } from "react-router-dom";

// LAZY: Componentes pesados só após interação
const FormularioPacienteCompleto = lazy(() => import("../components/contato/FormularioPacienteCompleto"));
const ImportadorContatosAvancado = lazy(() => import("@/components/contato/ImportadorContatosAvancado"));
import PacienteCard from "@/components/paciente/PacienteCard";
import PacienteListItem from "@/components/paciente/PacienteListItem";
import PacienteSearchBar from "@/components/paciente/PacienteSearchBar";
import BulkActionsBar from "@/components/paciente/BulkActionsBar";
import EmptyState from "@/components/ui/EmptyState";

export default function Pacientes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // CRÍTICO: Auth antes de clinicaId para garantir multi-tenant
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });
  
  const [viewMode, setViewMode] = useState("cards");
  const [showForm, setShowForm] = useState(false);
  const [showImportador, setShowImportador] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editingContato, setEditingContato] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Debounce busca - evita rate limit
  React.useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(timer);
  }, [busca]);



  // AGREGADOR OTIMIZADO: busca server-side
  const { data: batchData, isLoading, error: queryError } = useQuery({
    queryKey: ["pacientes-batch", user?.clinica_id, buscaDebounced, filtro],
    queryFn: async () => {
      console.log('[Pacientes] ========== QUERY START ==========');
      console.log('[Pacientes] Params:', { clinica_id: user?.clinica_id, busca: buscaDebounced, filtro });
      
      if (!user?.clinica_id) {
        console.error('[Pacientes] ❌ BLOCKED: No clinica_id');
        return { contatos: [] };
      }
      
      const response = await base44.functions.invoke('getPacientesBatch', {
        busca: buscaDebounced,
        status: filtro
      });
      
      if (!response.data?.success) {
        console.error('[Pacientes] ❌ Batch failed:', response.data?.error);
        return { contatos: [] };
      }
      
      const contatos = response.data.data?.contatos || [];
      console.log('[Pacientes] ✅ Batch OK:', contatos.length, 'records');
      
      // VALIDAÇÃO: Todos registros DEVEM ter clinica_id
      const invalid = contatos.filter(r => r.clinica_id !== user.clinica_id);
      if (invalid.length > 0) {
        console.error('[SECURITY] ⚠️ Data leak:', invalid.length, 'records');
        return { contatos: contatos.filter(r => r.clinica_id === user.clinica_id) };
      }
      
      return { contatos };
    },
    enabled: !!user?.clinica_id,
    staleTime: 2 * 60 * 1000, // CACHE: 2min - reduzido para busca mais responsiva
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const contatos = batchData?.contatos || [];
  
  // DEBUG BRUTAL
  React.useEffect(() => {
    console.log('[Pacientes] ========== RENDER STATE ==========');
    console.log('[Pacientes] isLoading:', isLoading);
    console.log('[Pacientes] queryError:', queryError);
    console.log('[Pacientes] batchData:', batchData);
    console.log('[Pacientes] contatos FINAL:', contatos);
    console.log('[Pacientes] contatos.length:', contatos.length);
    console.log('[Pacientes] user.clinica_id:', user?.clinica_id);
    console.log('[Pacientes] ========================================');
  }, [isLoading, batchData, contatos, user?.clinica_id, queryError]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // MULTI-TENANT: Garantir clinica_id em TODAS criações
      const payload = { ...data, clinica_id: user?.clinica_id };
      console.log('[Create] Enforcing clinica_id:', payload.clinica_id);
      const response = await base44.functions.invoke('criarContato', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      setShowForm(false);
      toast.success("Paciente criado!");
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      toast.error(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}) => {
      // MULTI-TENANT: Garantir clinica_id em updates
      const payload = { ...data, clinica_id: user?.clinica_id };
      return base44.entities.Contato.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      setShowForm(false);
      toast.success("Contato atualizado!");
      setEditingContato(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // VALIDAÇÃO: Verificar ownership antes de deletar
      const record = await base44.entities.Contato.filter({ id });
      if (record[0]?.clinica_id !== user?.clinica_id) {
        throw new Error('Unauthorized delete attempt');
      }
      return base44.entities.Contato.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      toast.success("Paciente excluído!");
    }
  });

  const arquivarMutation = useMutation({
    mutationFn: async (id) => {
      // VALIDAÇÃO: Verificar ownership
      const record = await base44.entities.Contato.filter({ id });
      if (record[0]?.clinica_id !== user?.clinica_id) {
        throw new Error('Unauthorized');
      }
      return base44.entities.Contato.update(id, { status: 'baixado', clinica_id: user.clinica_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      toast.success("Paciente arquivado!");
    }
  });

  const acoesEmMassaMutation = useMutation({
    mutationFn: async ({ acao, ids }) => {
      // VALIDAÇÃO: Verificar ownership de TODOS antes de ação em massa
      const records = await Promise.all(ids.map(id => base44.entities.Contato.filter({ id })));
      const unauthorized = records.filter(([r]) => r?.clinica_id !== user?.clinica_id);
      if (unauthorized.length > 0) {
        throw new Error('Unauthorized bulk action');
      }
      
      if (acao === 'excluir') {
        await Promise.all(ids.map(id => base44.entities.Contato.delete(id)));
      } else if (acao === 'arquivar') {
        await Promise.all(ids.map(id => base44.entities.Contato.update(id, { status: 'baixado', clinica_id: user.clinica_id })));
      }
    },
    onSuccess: (_, { acao }) => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      setSelectedIds([]);
      toast.success(`${selectedIds.length} paciente(s) ${acao === 'excluir' ? 'excluído(s)' : 'arquivado(s)'}`);
    }
  });

  const mesclarMutation = useMutation({
    mutationFn: async ({ principalId, secundarioId }) => {
      const [principal, secundario] = await Promise.all([
        base44.entities.Contato.filter({ id: principalId }),
        base44.entities.Contato.filter({ id: secundarioId })
      ]);
      
      const p = principal[0];
      const s = secundario[0];
      
      // VALIDAÇÃO: Ambos devem pertencer à clínica
      if (p?.clinica_id !== user?.clinica_id || s?.clinica_id !== user?.clinica_id) {
        throw new Error('Unauthorized merge');
      }
      
      await base44.entities.Contato.update(principalId, {
        telefones: [...(p.telefones || []), ...(s.telefones || [])],
        emails: [...(p.emails || []), ...(s.emails || [])],
        observacoes: `${p.observacoes || ''}\n\n[MESCLADO de ${s.nome_completo}] ${s.observacoes || ''}`.trim(),
        clinica_id: user.clinica_id
      });
      
      await base44.entities.Contato.delete(secundarioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pacientes-batch"]);
      setSelectedIds([]);
      setShowMergeModal(false);
      toast.success("Pacientes mesclados!");
    }
  });



  // Filtro local removido - busca feita no servidor
  const filtrados = contatos;

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="pacientes">
        <div className="space-y-6">
          <PageHeader
            title="Pacientes"
            description="Gestão de pacientes da clínica"
            breadcrumbs={[{label:"Pacientes"}]}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowImportador(true)} className="hidden sm:flex" aria-label="Importar dados CSV">
                  <Upload className="w-4 h-4 mr-2" /> Importar
                </Button>
                <Button variant="secondary" onClick={() => setViewMode(viewMode==="cards"?"lista":"cards")} aria-label={viewMode==="cards"?"Alternar para visualização em lista":"Alternar para visualização em cards"} style={{ minWidth: '44px', minHeight: '44px' }}>
                  {viewMode==="cards"?<ListIcon className="w-4 h-4"/>:<Grid3x3 className="w-4 h-4"/>}
                </Button>
                <Button onClick={() => {
                  setEditingContato(null);
                  setShowForm(true);
                }} aria-label="Adicionar novo paciente" style={{ minHeight: '44px' }}>
                  <Plus className="w-4 h-4 mr-2" /> Novo
                </Button>
              </div>
            }
          />

          {showImportador && (
            <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-white" /></div>}>
              <ImportadorContatosAvancado 
                clinicaId={user?.clinica_id} 
                onSuccess={() => {
                  setShowImportador(false);
                  queryClient.invalidateQueries(["pacientes-batch"]);
                }}
                onClose={() => setShowImportador(false)}
              />
            </Suspense>
          )}

          {/* Barra Ações em Massa */}
          {selectedIds.length > 0 && (
            <div className="pc-card p-4 flex items-center justify-between gap-4" style={{ backgroundColor: '#f5f3ff', borderColor: '#7E57FF' }}>
              <div className="flex items-center gap-3">
                <span className="font-semibold" style={{ color: '#7E57FF' }}>
                  {selectedIds.length} selecionado(s)
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1 hover:bg-white rounded-full transition-all"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-label="Limpar seleção"
                >
                  <X className="w-4 h-4" style={{ color: '#7E57FF' }} />
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedIds.length === 2) {
                      setShowMergeModal(true);
                    } else {
                      toast.error('Selecione exatamente 2 pacientes');
                    }
                  }}
                  aria-label="Mesclar pacientes selecionados"
                  style={{ minHeight: '44px' }}
                >
                  <GitMerge className="w-4 h-4 mr-1" />
                  Mesclar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Arquivar ${selectedIds.length} paciente(s)?`)) {
                      acoesEmMassaMutation.mutate({ acao: 'arquivar', ids: selectedIds });
                    }
                  }}
                  aria-label={`Arquivar ${selectedIds.length} paciente(s) selecionado(s)`}
                  style={{ minHeight: '44px' }}
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Arquivar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(`EXCLUIR ${selectedIds.length} paciente(s)?`)) {
                      acoesEmMassaMutation.mutate({ acao: 'excluir', ids: selectedIds });
                    }
                  }}
                  aria-label={`Excluir ${selectedIds.length} paciente(s) selecionado(s)`}
                  style={{ minHeight: '44px' }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          )}

          <PacienteSearchBar
            busca={busca}
            onBuscaChange={setBusca}
            filtro={filtro}
            onFiltroChange={setFiltro}
          />

          {isLoading ? (
            <div style={{ height: '600px', contain: 'strict' }} className="space-y-4" role="status" aria-label="Carregando pacientes">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ height: '120px', minHeight: '120px', contain: 'layout' }}>
                  <div className="animate-pulse space-y-3">
                    <div className="bg-gray-200 rounded" style={{ height: '24px', width: '33%' }} />
                    <div className="bg-gray-100 rounded" style={{ height: '16px', width: '66%' }} />
                    <div className="bg-gray-100 rounded" style={{ height: '16px', width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={User}
              title="Nenhum paciente encontrado"
              description="Ajuste os filtros ou cadastre um novo paciente"
              iconColor="#bdc1c6"
            />
          ) : viewMode === "lista" ? (
            <div className="bg-white rounded-2xl shadow-sm border divide-y" style={{ minHeight: '600px', contain: 'strict' }}>
              {filtrados.map(c => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <PacienteListItem
                    key={c.id}
                    contato={c}
                    isSelected={isSelected}
                    onSelect={(checked) => {
                      if (checked) {
                        setSelectedIds([...selectedIds, c.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== c.id));
                      }
                    }}
                    onEdit={() => {
                      setEditingContato(c);
                      setShowForm(true);
                    }}
                    onArquivar={() => {
                      if (confirm('Arquivar paciente?')) {
                        arquivarMutation.mutate(c.id);
                      }
                    }}
                    onExcluir={() => {
                      if (confirm('EXCLUIR este paciente?')) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    onClick={() => navigate(createPageUrl(`PacienteDetalhes?id=${c.id}`))}
                  />
                );
              })}
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ height: "600px", contain: 'strict' }}>
              <VirtualList
                height={600}
                itemCount={filtrados.length}
                itemSize={220}
                width="100%"
                overscanCount={2}
                useIsScrolling
              >
                {({ index, style }) => {
                  const c = filtrados[index];
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <div style={style} className="px-2 py-2">
                      <div className="pc-card p-4 hover:shadow-md pc-transition cursor-pointer h-full" onClick={() => navigate(createPageUrl("PacienteDetalhes") + `?id=${c.id}`)}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                            <User className="w-6 h-6" style={{ color: '#7E57FF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate" style={{ color: 'var(--pc-text-primary)' }}>{c.nome_completo}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full`} style={{
                              backgroundColor: c.status === 'ativo' ? '#e6f7ed' : '#f8f9fa',
                              color: c.status === 'ativo' ? 'var(--pc-success)' : 'var(--pc-text-secondary)'
                            }}>
                              {c.status || 'ativo'}
                            </span>
                          </div>
                        </div>
                        
                        {(c.emails?.find(e => e.principal)?.email || c.email) && (
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--pc-gray-500)' }} />
                            <span className="truncate" style={{ color: 'var(--pc-text-secondary)' }}>
                              {c.emails?.find(e => e.principal)?.email || c.email}
                            </span>
                          </div>
                        )}
                        
                        {(c.telefones?.find(t => t.principal)?.numero || c.telefone) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--pc-gray-500)' }} />
                            <span className="truncate" style={{ color: 'var(--pc-text-secondary)' }}>
                              {c.telefones?.find(t => t.principal)?.numero || c.telefone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              </VirtualList>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ minHeight: '600px', contain: 'layout' }}>
              {filtrados.map(c => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <PacienteCard
                    key={c.id}
                    contato={c}
                    isSelected={isSelected}
                    onSelect={(checked) => {
                      if (checked) {
                        setSelectedIds([...selectedIds, c.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== c.id));
                      }
                    }}
                    onEdit={() => {
                      setEditingContato(c);
                      setShowForm(true);
                    }}
                    onArquivar={() => {
                      if (confirm('Arquivar paciente?')) {
                        arquivarMutation.mutate(c.id);
                      }
                    }}
                    onExcluir={() => {
                      if (confirm('EXCLUIR paciente?')) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    onClick={() => navigate(createPageUrl(`PacienteDetalhes?id=${c.id}`))}
                  />
                );
              })}
            </div>
          )}

          <SlideInPanel open={showForm} onClose={() => setShowForm(false)} title={editingContato ? "Editar Paciente" : "Novo Paciente"}>
            <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7E57FF' }} /></div>}>
              <FormularioPacienteCompleto
                contato={editingContato}
                onSubmit={(data) => {
                  if (editingContato) {
                    updateMutation.mutate({ id: editingContato.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
                onCancel={() => setShowForm(false)}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </Suspense>
          </SlideInPanel>

          {/* Modal Mesclar */}
          <Dialog open={showMergeModal} onOpenChange={setShowMergeModal}>
            <DialogContent style={{ zIndex: 999999 }}>
              <DialogHeader>
                <DialogTitle>Mesclar Pacientes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Selecione o paciente principal. Os dados do secundário serão mesclados e ele será excluído.
                </p>
                <div className="space-y-3">
                  {selectedIds.slice(0, 2).map((id) => {
                    const paciente = filtrados.find(p => p.id === id);
                    if (!paciente) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          const [id1, id2] = selectedIds;
                          const secundario = id === id1 ? id2 : id1;
                          if (confirm(`${paciente.nome_completo} será o principal?`)) {
                            mesclarMutation.mutate({ principalId: id, secundarioId: secundario });
                          }
                        }}
                        className="w-full p-4 border-2 rounded-lg hover:bg-purple-50 hover:border-purple-300 text-left transition-all"
                        style={{ minHeight: '44px' }}
                        aria-label={`Selecionar ${paciente.nome_completo} como paciente principal na mesclagem`}
                      >
                        <p className="font-semibold">{paciente.nome_completo}</p>
                        <p className="text-xs text-gray-600">{paciente.emails?.find(e => e.principal)?.email || paciente.email}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}