import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { createPageUrl } from "@/utils";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Link as LinkIcon,
  Key,
  Code,
  Activity,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

export default function GerenciadorConectores() {
  const [showPanel, setShowPanel] = useState(false);
  const [editingConector, setEditingConector] = useState(null);
  const queryClient = useQueryClient();

  const { data: conectores = [], isLoading: loadingConectores } = useQuery({
    queryKey: ["conectores"],
    queryFn: () => base44.entities.Conector.list("-created_date"),
    initialData: []
  });

  const { data: precificacoes = [], isLoading: loadingPrecificacoes } = useQuery({
    queryKey: ["precificacoes"],
    queryFn: () => base44.entities.PrecificacaoAPI.list(),
    initialData: []
  });

  const { data: incidentes = [], isLoading: loadingIncidentes } = useQuery({
    queryKey: ["incidentes"],
    queryFn: () => base44.entities.IncidenteAPI.filter({ status: "aberto" }),
    initialData: []
  });

  const { data: dadosFiscais = [], isLoading: loadingDadosFiscais } = useQuery({
    queryKey: ["dadosFiscais"],
    queryFn: () => base44.entities.DadosFiscaisClinica.list(),
    initialData: []
  });

  const { data: testesAPI = [], isLoading: loadingTestesAPI } = useQuery({
    queryKey: ["testesAPI"],
    queryFn: () => base44.entities.TesteAPI.list("-created_date", 200),
    initialData: []
  });

  const isLoading = loadingConectores || loadingPrecificacoes || loadingIncidentes || loadingDadosFiscais || loadingTestesAPI;

  const [executandoHealthCheck, setExecutandoHealthCheck] = useState({});

  const executarHealthCheck = async (conectorId) => {
    setExecutandoHealthCheck(prev => ({ ...prev, [conectorId]: true }));
    try {
      await base44.functions.invoke('healthCheckConector', { conector_id: conectorId });
      queryClient.invalidateQueries(["testesAPI"]);
    } catch (error) {
      alert("Erro ao executar health check: " + error.message);
    } finally {
      setExecutandoHealthCheck(prev => ({ ...prev, [conectorId]: false }));
    }
  };

  const getHealthStatus = (conectorId) => {
    const healthChecks = testesAPI.filter(t => 
      t.conector_id === conectorId && 
      t.tipo_teste === 'health_check'
    );
    
    if (healthChecks.length === 0) return null;
    
    const ultimoCheck = healthChecks[0];
    return {
      status: ultimoCheck.sucesso ? 'online' : 'offline',
      timestamp: ultimoCheck.created_date,
      tempoResposta: ultimoCheck.tempo_resposta_ms
    };
  };

  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    tipo: "infosimples",
    endpoint_base: "",
    metodo_http: "POST",
    headers_padrao: {},
    parametros_entrada: {},
    schema_resposta: {},
    mapeamento_campos: {},
    preco_consulta: 0,
    limite_consultas_mes: 1000,
    timeout_segundos: 30,
    retry_tentativas: 3,
    url_documentacao: "",
    url_manual: "",
    entidade_destino: "CertidaoRegularidade",
    ativo: true,
    requer_autenticacao: true,
    tipo_autenticacao: "api_key",
    secrets_necessarios: [],
    tags: [],
    observacoes: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Conector.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["conectores"]);
      setShowPanel(false);
      setEditingConector(null);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conector.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["conectores"]);
      setShowPanel(false);
      setEditingConector(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Conector.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["conectores"]);
    }
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      codigo: "",
      tipo: "infosimples",
      endpoint_base: "",
      metodo_http: "POST",
      headers_padrao: {},
      parametros_entrada: {},
      schema_resposta: {},
      mapeamento_campos: {},
      preco_consulta: 0,
      limite_consultas_mes: 1000,
      timeout_segundos: 30,
      retry_tentativas: 3,
      url_documentacao: "",
      url_manual: "",
      entidade_destino: "CertidaoRegularidade",
      ativo: true,
      requer_autenticacao: true,
      tipo_autenticacao: "api_key",
      secrets_necessarios: [],
      tags: [],
      observacoes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingConector) {
      updateMutation.mutate({ id: editingConector.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (conector) => {
    setEditingConector(conector);
    setFormData(conector);
    setShowPanel(true);
  };

  const handleDelete = (id) => {
    if (confirm("Deseja excluir este conector?")) {
      deleteMutation.mutate(id);
    }
  };

  const conectoresAtivos = (conectores || []).filter(c => c.ativo).length;
  const custoTotal = (precificacoes || []).reduce((acc, p) => acc + (p.custo_total || 0), 0);
  const incidentesAbertos = (incidentes || []).length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">
        {/* Header Skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="h-6 bg-gray-200 rounded w-64 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="h-10 bg-gray-200 rounded w-10 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded-xl" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-9 bg-gray-200 rounded-xl w-24" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Gerenciador de Conectores"
        description="Configure e gerencie integrações com APIs externas"
        breadcrumbs={[
          { label: "Administração", href: createPageUrl("Administracao") },
          { label: "Configuração APIs", href: createPageUrl("ConfiguracaoIntegracoes") },
          { label: "Gerenciador" }
        ]}
        action={
          <button
            onClick={() => {
              resetForm();
              setEditingConector(null);
              setShowPanel(true);
            }}
            aria-label="Criar novo conector de API"
            className="font-bold py-3 px-6 rounded-full text-white hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Novo Conector</span>
          </button>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7ed' }}>
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#34a853' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Conectores Ativos</p>
              <p className="font-bold truncate" style={{ color: '#202124', fontSize: '28px' }}>{conectoresAtivos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
              <Code className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#7E57FF' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Total Conectores</p>
              <p className="font-bold truncate" style={{ color: '#202124', fontSize: '28px' }}>{conectores.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef9e5' }}>
              <DollarSign className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#f59e0b' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Custo Mensal</p>
              <p className="font-bold truncate" style={{ color: '#202124', fontSize: '24px' }}>
                R$ {custoTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: incidentesAbertos > 0 ? '#fde7e7' : '#f8f9fa' }}>
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6" style={{ color: incidentesAbertos > 0 ? '#ea4335' : '#dadce0' }} />
            </div>
            <div className="min-w-0">
              <p className="truncate" style={{ color: '#80868b', fontSize: '14px' }}>Incidentes Abertos</p>
              <p className="font-bold truncate" style={{ color: incidentesAbertos > 0 ? '#ea4335' : '#202124', fontSize: '28px' }}>
                {incidentesAbertos}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Conectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {(conectores || []).map((conector) => {
          const preco = precificacoes.find(p => p.conector_id === conector.id);
          const incidente = incidentes.find(i => i.conector_id === conector.id);

          return (
            <div key={conector.id} className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{conector.nome}</h3>
                    <span className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap" style={{
                      backgroundColor: conector.ativo ? '#e6f7ed' : '#f8f9fa',
                      color: conector.ativo ? '#1f6332' : '#5f6368',
                      fontSize: '14px'
                    }}>
                      {conector.ativo ? "Ativo" : "Inativo"}
                    </span>
                    {incidente && (
                      <span className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap" style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px' }}>
                        ⚠️ Incidente
                      </span>
                    )}
                  </div>
                  <p className="truncate mb-3" style={{ color: '#80868b', fontSize: '16px' }}>{conector.codigo}</p>
                  {conector.tags && conector.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {conector.tags.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap" style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Tipo</p>
                  <p className="font-bold uppercase truncate" style={{ color: '#202124', fontSize: '16px' }}>{conector.tipo}</p>
                </div>
                <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                  <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Método</p>
                  <p className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{conector.metodo_http}</p>
                </div>
                <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: '#fef9e5' }}>
                  <p className="mb-1 truncate" style={{ color: '#956802', fontSize: '14px' }}>Preço/Consulta</p>
                  <p className="font-bold truncate" style={{ color: '#956802', fontSize: '16px' }}>
                    R$ {conector.preco_consulta?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="rounded-xl p-3 overflow-hidden" style={{ backgroundColor: '#fef9e5' }}>
                  <p className="mb-1 truncate" style={{ color: '#956802', fontSize: '14px' }}>Timeout</p>
                  <p className="font-bold truncate" style={{ color: '#956802', fontSize: '16px' }}>{conector.timeout_segundos}s</p>
                </div>
              </div>

              {preco && (
                <div className="rounded-xl p-3 mb-4 border overflow-hidden" style={{ backgroundColor: '#e8f1fb', borderColor: '#bdd8f4' }}>
                  <p className="mb-1" style={{ color: '#0e4082', fontSize: '14px' }}>Este Mês</p>
                  <p className="font-bold" style={{ color: '#0e4082', fontSize: '16px' }}>
                    {preco.total_consultas} consultas • R$ {preco.custo_total?.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Health Status */}
              {(() => {
                const health = getHealthStatus(conector.id);
                return health && (
                  <div className="rounded-xl p-3 mb-4 border overflow-hidden" style={{
                    backgroundColor: health.status === 'online' ? '#e6f7ed' : '#fde7e7',
                    borderColor: health.status === 'online' ? '#b8e7ca' : '#f9b8b6'
                  }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="w-4 h-4 flex-shrink-0" style={{
                          color: health.status === 'online' ? '#34a853' : '#ea4335'
                        }} />
                        <span className="font-bold truncate" style={{
                          color: health.status === 'online' ? '#1f6332' : '#842820',
                          fontSize: '16px'
                        }}>
                          {health.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <span className="whitespace-nowrap" style={{ color: '#80868b', fontSize: '14px' }}>
                        {format(new Date(health.timestamp), "HH:mm dd/MM")} • {health.tempoResposta}ms
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => executarHealthCheck(conector.id)}
                  disabled={executandoHealthCheck[conector.id]}
                  aria-label="Executar health check"
                  className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                  style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '14px' }}
                >
                  <RefreshCw className={`w-4 h-4 flex-shrink-0 ${executandoHealthCheck[conector.id] ? 'animate-spin' : ''}`} />
                  <span>Health Check</span>
                </button>
                <button
                  onClick={() => handleEdit(conector)}
                  aria-label="Editar conector"
                  className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                  style={{ backgroundColor: '#e8f1fb', color: '#0e4082', fontSize: '14px' }}
                >
                  <Edit className="w-4 h-4 flex-shrink-0" />
                  <span>Editar</span>
                </button>
                <a
                  href={createPageUrl("TesteConectores") + `?conector_id=${conector.id}`}
                  aria-label="Testar conector"
                  className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                  style={{ backgroundColor: '#e6f7ed', color: '#1f6332', fontSize: '14px' }}
                >
                  <Play className="w-4 h-4 flex-shrink-0" />
                  <span>Testar</span>
                </a>
                {conector.url_manual && (
                  <a
                    href={conector.url_manual}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir site do conector"
                    className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                    style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Site</span>
                  </a>
                )}
                <button
                  onClick={() => handleDelete(conector.id)}
                  aria-label="Excluir conector"
                  className="px-4 py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] whitespace-nowrap"
                  style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px' }}
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}

        {(conectores || []).length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border p-12 md:p-16 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <Code className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6" style={{ color: '#dadce0' }} />
            <p className="font-bold mb-6" style={{ color: '#80868b', fontSize: '18px' }}>Nenhum conector configurado</p>
            <button
              onClick={() => {
                resetForm();
                setShowPanel(true);
              }}
              aria-label="Criar primeiro conector"
              className="font-bold py-3 px-6 rounded-full text-white hover:opacity-90 transition-all flex items-center gap-2 min-h-[48px] mx-auto"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Criar Primeiro Conector</span>
            </button>
          </div>
        )}
      </div>

      {/* SlideInPanel - Formulário */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingConector ? "Editar Conector" : "Novo Conector"}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-4">Informações Básicas</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Conector *
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: FGTS Caixa"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Único *
                </label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="Ex: fgts_caixa"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infosimples">Infosimples</SelectItem>
                    <SelectItem value="custom">Custom API</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entidade Destino</label>
                <Input
                  value={formData.entidade_destino}
                  onChange={(e) => setFormData({ ...formData, entidade_destino: e.target.value })}
                  placeholder="CertidaoRegularidade"
                />
              </div>
            </div>
          </div>

          {/* Configuração HTTP */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-4">Configuração HTTP</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL Base</label>
                <Input
                  value={formData.endpoint_base}
                  onChange={(e) => setFormData({ ...formData, endpoint_base: e.target.value })}
                  placeholder="https://api.exemplo.com/v1"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método HTTP</label>
                  <Select value={formData.metodo_http} onValueChange={(v) => setFormData({ ...formData, metodo_http: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeout (s)</label>
                  <Input
                    type="number"
                    value={formData.timeout_segundos}
                    onChange={(e) => setFormData({ ...formData, timeout_segundos: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retry</label>
                  <Input
                    type="number"
                    value={formData.retry_tentativas}
                    onChange={(e) => setFormData({ ...formData, retry_tentativas: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Autenticação */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-4">Autenticação</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requer_autenticacao}
                  onChange={(e) => setFormData({ ...formData, requer_autenticacao: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-gray-700">Requer Autenticação</label>
              </div>
              {formData.requer_autenticacao && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                      <Select value={formData.tipo_autenticacao} onValueChange={(v) => setFormData({ ...formData, tipo_autenticacao: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="oauth2">OAuth2</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secrets Necessários (separados por vírgula)
                      </label>
                      <Input
                        value={formData.secrets_necessarios?.join(", ")}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          secrets_necessarios: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        })}
                        placeholder="API_KEY, API_SECRET"
                      />
                    </div>
                  </div>

                  {dadosFiscais.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-bold text-blue-900 mb-2">💡 Parâmetros Padrão</h4>
                      <p className="text-xs text-blue-800 mb-3">
                        Configure valores padrão que serão usados automaticamente nos testes deste conector.
                      </p>
                      <div className="bg-white rounded p-3 border border-blue-200 text-xs space-y-1">
                        <p className="text-blue-900"><strong>CNPJ:</strong> {dadosFiscais[0].cnpj}</p>
                        <p className="text-blue-900"><strong>Razão Social:</strong> {dadosFiscais[0].razao_social}</p>
                        <p className="text-blue-900"><strong>Cidade/UF:</strong> {dadosFiscais[0].cidade}/{dadosFiscais[0].estado}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const params = {};
                            if (formData.parametros_entrada?.properties?.cnpj) params.cnpj = dadosFiscais[0].cnpj;
                            if (formData.parametros_entrada?.properties?.estado) params.estado = dadosFiscais[0].estado;
                            if (formData.parametros_entrada?.properties?.cidade) params.cidade = dadosFiscais[0].cidade;
                            if (formData.parametros_entrada?.properties?.inscricao_municipal) params.inscricao_municipal = dadosFiscais[0].inscricao_municipal;

                            setFormData({
                              ...formData,
                              parametros_entrada: {
                                ...formData.parametros_entrada,
                                default: params
                              }
                            });
                          }}
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Usar dados da clínica como padrão
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Precificação */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Precificação
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Preço por Consulta (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_consulta}
                  onChange={(e) => setFormData({ ...formData, preco_consulta: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Limite Consultas/Mês
                </label>
                <Input
                  type="number"
                  value={formData.limite_consultas_mes}
                  onChange={(e) => setFormData({ ...formData, limite_consultas_mes: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-800 mb-4">Links Úteis</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Documentação
                </label>
                <Input
                  value={formData.url_documentacao}
                  onChange={(e) => setFormData({ ...formData, url_documentacao: e.target.value })}
                  placeholder="https://docs.api.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Consulta Manual
                </label>
                <Input
                  value={formData.url_manual}
                  onChange={(e) => setFormData({ ...formData, url_manual: e.target.value })}
                  placeholder="https://portal.exemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Tags e Observações */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (separadas por vírgula)
              </label>
              <Input
                value={formData.tags?.join(", ")}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                })}
                placeholder="federal, compliance, certidao"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 resize-none"
                rows="3"
                placeholder="Notas e observações sobre este conector..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Conector Ativo</label>
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
              aria-label={editingConector ? "Atualizar conector" : "Salvar novo conector"}
              className="flex-1 text-white font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 min-h-[48px]"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingConector ? "Atualizar" : "Salvar Conector"}
            </button>
          </div>
        </form>
      </SlideInPanel>
    </div>
  );
}