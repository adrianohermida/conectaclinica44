import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import RouteGuard from "@/components/auth/RouteGuard";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Eye,
  Edit,
  Settings,
  BarChart3
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";


export default function SuperAdmin() {
  usePerformanceTracker('/SuperAdmin');
  const queryClient = useQueryClient();
  
  // TODOS OS HOOKS PRIMEIRO - antes de qualquer early return
  const [pageLoading, setPageLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [clinicaSelecionada, setClinicaSelecionada] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    email: "",
    telefone: "",
    admin_principal_email: "",
    plano_assinatura: "trial",
    status_assinatura: "trial",
    ativa: true
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 90);
    return () => clearTimeout(timer);
  }, []);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await base44.auth.me();
      console.log("🔐 Current User:", user);
      return user;
    },
    retry: 3,
    retryDelay: 1000
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "contato@aetherlab.com.br";

  const { data: clinicas = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["clinicas", isAdmin],
    queryFn: async () => {
      console.log("🔄 Iniciando carregamento de clínicas...");
      console.log("🔑 isAdmin:", isAdmin);
      
      if (!isAdmin) {
        console.log("⚠️ Usuário não é admin, retornando array vazio");
        return [];
      }

      try {
        // CRÍTICO: Usar backend function com service role
        console.log("📡 Chamando backend function listarClinicas...");
        const response = await base44.functions.invoke('listarClinicas', {});
        
        console.log("📦 Response completa:", JSON.stringify(response, null, 2));
        console.log("📦 Response.data:", response.data);
        console.log("📦 Response.data.data:", response.data?.data);
        
        // FIX: Normalizar resposta - response.data já contém { success, data, count }
        const payload = response.data;
        
        if (!payload?.success) {
          throw new Error(payload?.error || 'Erro ao carregar clínicas');
        }

        // Extrair array de clínicas
        const clinicasArray = Array.isArray(payload.data) ? payload.data : [];
        console.log(`✅ ${clinicasArray.length} clínicas carregadas`);
        
        setErrorMsg("");
        return clinicasArray;
      } catch (err) {
        console.error("❌ ERRO ao carregar clínicas:", err);
        setErrorMsg(`Erro ao carregar: ${err.message}`);
        throw err;
      }
    },
    enabled: isAdmin && !userLoading,
    initialData: [],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000 // 30s cache
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos-assinatura"],
    queryFn: async () => {
      try {
        const result = await base44.entities.PlanoAssinatura.list("ordem_exibicao");
        return Array.isArray(result) ? result : [];
      } catch (e) {
        console.error("Erro ao carregar planos:", e);
        return [];
      }
    },
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const clinica = await base44.entities.Clinica.create(data);
      // CRITICAL: Auto-referência clinica_id = id
      await base44.entities.Clinica.update(clinica.id, { clinica_id: clinica.id });
      return clinica;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["clinicas"]);
      setShowPanel(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Clinica.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["clinicas"]);
      setShowPanel(false);
      setClinicaSelecionada(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (clinicaSelecionada) {
      updateMutation.mutate({ id: clinicaSelecionada.id, data: formData });
    } else {
      const dataInicio = new Date();
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 14);
      
      const clinicaData = {
        ...formData,
        data_inicio_trial: format(dataInicio, "yyyy-MM-dd"),
        data_vencimento_plano: format(dataVencimento, "yyyy-MM-dd"),
        limites_plano: planos.find(p => p.slug === "trial")?.limites || {},
        uso_atual: { usuarios: 0, pacientes: 0, agendamentos_mes: 0, storage_usado_gb: 0 }
      };
      
      createMutation.mutate(clinicaData);
    }
  };

  const clinicasFiltradas = (Array.isArray(clinicas) ? clinicas : [])
    .filter(c => filtroPlano === "todos" ? true : c.plano_assinatura === filtroPlano)
    .filter(c => 
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase())
    );

  const stats = useMemo(() => {
    const clinicasArray = Array.isArray(clinicas) ? clinicas : [];
    const planosArray = Array.isArray(planos) ? planos : [];
    
    return {
      total: clinicasArray.length,
      ativas: clinicasArray.filter(c => c.status_assinatura === "ativa").length,
      trial: clinicasArray.filter(c => c.status_assinatura === "trial").length,
      receitaMensal: clinicasArray
        .filter(c => c.status_assinatura === "ativa")
        .reduce((acc, c) => {
          const plano = planosArray.find(p => p.slug === c.plano_assinatura);
          return acc + (plano?.preco_mensal || 0);
        }, 0)
    };
  }, [clinicas, planos]);

  if (pageLoading) {
    return (
      <RouteGuard requireAuth={true}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
                <div className="h-12 bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto overflow-x-hidden">
        <PageHeader title="Super Admin" description="Acesso restrito" />
        <div className="bg-red-50 rounded-2xl p-8 text-center border overflow-hidden" style={{ borderColor: '#f9b8b6' }}>
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4 flex-shrink-0" />
        <p className="font-bold break-words" style={{ color: '#c5221f', fontSize: '16px' }}>Acesso exclusivo para super administradores</p>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requireAuth={true}>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">
      <PageHeader
        title="SuperAdmin"
        description="Gestão de clínicas"
        breadcrumbs={[{ label: "SuperAdmin" }]}
        action={
          <button
            onClick={() => {
              setClinicaSelecionada(null);
              setFormData({
                nome: "",
                slug: "",
                email: "",
                telefone: "",
                admin_principal_email: "",
                plano_assinatura: "trial",
                status_assinatura: "trial",
                ativa: true
              });
              setShowPanel(true);
            }}
            className="w-full sm:w-auto bg-[#7E57FF] hover:bg-[#6d47ee] text-white font-medium py-3 px-4 sm:px-6 rounded-lg flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Nova Clínica</span>
          </button>
        }
      />

      {/* KPIs - Componentizados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          icon={Building2}
          label="Total Clínicas"
          value={stats.total}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={isLoading}
        />
        <StatCard 
          icon={CheckCircle}
          label="Ativas"
          value={stats.ativas}
          color="#34a853"
          bgColor="#e6f7ed"
          loading={isLoading}
        />
        <StatCard 
          icon={Clock}
          label="Trial"
          value={stats.trial}
          color="#fbbc04"
          bgColor="#fef9e5"
          loading={isLoading}
        />
        <StatCard 
          icon={DollarSign}
          label="MRR"
          value={`R$ ${stats.receitaMensal.toLocaleString("pt-BR")}`}
          color="#7E57FF"
          bgColor="#f5f3ff"
          loading={isLoading}
        />
      </div>

      {/* Debug & Filtros - Mobile-First */}
      <div className="space-y-4">
        {/* Debug Info */}
        {isAdmin && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 mb-2">🔍 Status da Conexão</p>
                <div className="space-y-1 text-xs text-blue-800">
                  <p>✓ Usuário: {currentUser?.email}</p>
                  <p>✓ Role: {currentUser?.role}</p>
                  <p>✓ Admin: {isAdmin ? "SIM" : "NÃO"}</p>
                  <p>✓ Clínicas carregadas: {clinicas.length}</p>
                  <p>✓ Status: {isLoading ? "Carregando..." : isError ? "Erro" : "Conectado"}</p>
                  {errorMsg && <p className="text-red-600">⚠️ {errorMsg}</p>}
                </div>
              </div>
              <button
                onClick={() => refetch()}
                className="flex-shrink-0 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                🔄 Recarregar
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex-shrink-0" style={{ color: '#80868b' }} />
              <Input
                placeholder="Buscar clínica..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 border-gray-300 rounded-xl w-full min-h-[48px] text-base"
              />
            </div>
            <Select value={filtroPlano} onValueChange={setFiltroPlano}>
              <SelectTrigger className="w-full sm:w-48 border-gray-300 rounded-xl min-h-[48px] text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Planos</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de Clínicas - Skeleton States */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-3/4" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded w-24" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-20 bg-gray-200 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 rounded-2xl shadow-sm p-12 text-center overflow-hidden border border-red-200">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <p className="text-base font-semibold text-red-900 mb-2">Erro ao carregar clínicas</p>
            <p className="text-sm text-red-700 mb-4">{error?.message || "Erro desconhecido"}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        ) : clinicasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center overflow-hidden" style={{ border: '1px solid #e8eaed' }}>
            <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
            <p className="text-base font-semibold mb-2" style={{ color: '#202124' }}>
              {busca || filtroPlano !== "todos" 
                ? "Nenhuma clínica encontrada com os filtros aplicados" 
                : "Nenhuma clínica cadastrada"}
            </p>
            <p className="text-sm" style={{ color: '#5f6368' }}>
              Total de clínicas: {clinicas.length}
            </p>
          </div>
        ) : (
          clinicasFiltradas.map((clinica) => {
            const plano = planos.find(p => p.slug === clinica.plano_assinatura);
            const diasRestantes = clinica.data_vencimento_plano 
              ? Math.ceil((new Date(clinica.data_vencimento_plano) - new Date()) / (1000 * 60 * 60 * 24))
              : 0;
            
            return (
              <div key={clinica.id} className="bg-white rounded-2xl p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ 
                      backgroundColor: clinica.status_assinatura === "ativa" ? '#e6f7ed' :
                                      clinica.status_assinatura === "trial" ? '#fef9e5' : '#f1f3f4'
                    }}>
                      <Building2 className="w-6 h-6" style={{ 
                        color: clinica.status_assinatura === "ativa" ? '#34a853' :
                               clinica.status_assinatura === "trial" ? '#fbbc04' : '#80868b'
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold mb-2 break-words" style={{ color: '#202124' }}>{clinica.nome}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg text-sm font-semibold whitespace-nowrap" style={{
                          backgroundColor: clinica.status_assinatura === "ativa" ? '#e6f7ed' :
                                          clinica.status_assinatura === "trial" ? '#fef9e5' : '#f1f3f4',
                          color: clinica.status_assinatura === "ativa" ? '#1f6332' :
                                 clinica.status_assinatura === "trial" ? '#956802' : '#5f6368'
                        }}>
                          {clinica.plano_assinatura?.toUpperCase() || 'N/A'}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700 truncate max-w-[150px]">
                          {clinica.slug}
                        </span>
                        {clinica.status_assinatura === "trial" && diasRestantes > 0 && (
                          <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
                            {diasRestantes} dias
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-3 text-sm" style={{ color: '#5f6368' }}>
                        <span className="truncate">{clinica.email}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">Admin: {clinica.admin_principal_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl p-3 min-h-[64px] overflow-hidden" style={{ backgroundColor: '#F4F7FA' }}>
                      <p className="text-sm mb-1" style={{ color: '#80868b' }}>Usuários</p>
                      <p className="text-base font-bold" style={{ color: '#202124' }}>
                        {clinica.uso_atual?.usuarios || 0}/{clinica.limites_plano?.max_usuarios || "∞"}
                      </p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[64px] overflow-hidden" style={{ backgroundColor: '#F4F7FA' }}>
                      <p className="text-sm mb-1" style={{ color: '#80868b' }}>Pacientes</p>
                      <p className="text-base font-bold" style={{ color: '#202124' }}>
                        {clinica.uso_atual?.pacientes || 0}/{clinica.limites_plano?.max_pacientes || "∞"}
                      </p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[64px] overflow-hidden" style={{ backgroundColor: '#F4F7FA' }}>
                      <p className="text-sm mb-1" style={{ color: '#80868b' }}>Agend/Mês</p>
                      <p className="text-base font-bold" style={{ color: '#202124' }}>
                        {clinica.uso_atual?.agendamentos_mes || 0}/{clinica.limites_plano?.max_agendamentos_mes || "∞"}
                      </p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[64px] overflow-hidden" style={{ backgroundColor: '#e6f7ed' }}>
                      <p className="text-sm mb-1" style={{ color: '#267a3d' }}>Receita/Mês</p>
                      <p className="text-base font-bold" style={{ color: '#34a853' }}>
                        R$ {plano?.preco_mensal || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setClinicaSelecionada(clinica);
                        setFormData(clinica);
                        setShowPanel(true);
                      }}
                      className="flex-1 sm:flex-none border-2 border-purple-600 text-purple-600 font-semibold py-3 px-6 rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2 min-h-[48px] text-base"
                    >
                      <Edit className="w-5 h-5 flex-shrink-0" />
                      <span>Edição Rápida</span>
                    </button>
                    <button
                      onClick={() => window.location.href = createPageUrl(`ClinicaDetalhes?id=${clinica.id}`)}
                      className="flex-1 sm:flex-none text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 min-h-[48px] text-base"
                      style={{ backgroundColor: '#7E57FF' }}
                    >
                      <Eye className="w-5 h-5 flex-shrink-0" />
                      <span>Ver Detalhes</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel - Clínica */}
      <SlideInPanel
        open={showPanel}
        onClose={() => {
          setShowPanel(false);
          setClinicaSelecionada(null);
        }}
        title={clinicaSelecionada ? "Edição Rápida" : "Nova Clínica"}
        maxWidth="700px"
        fullHeight={true}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Nome da Clínica *</label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Slug (URL única) *</label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, "-") })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
              placeholder="minha-clinica"
              required
            />
            <p className="text-sm mt-2 break-all" style={{ color: '#80868b' }}>Exemplo: {formData.slug}.prevenclin.com.br</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-gray-300 rounded-xl min-h-[48px] text-base"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Telefone</label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="border-gray-300 rounded-xl min-h-[48px] text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>CNPJ</label>
            <Input
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Razão Social</label>
            <Input
              value={formData.razao_social}
              onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>WhatsApp</label>
            <Input
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>CEP</label>
            <Input
              value={formData.cep}
              onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Endereço Completo</label>
            <Input
              value={formData.endereco_completo}
              onChange={(e) => setFormData({ ...formData, endereco_completo: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Cidade</label>
            <Input
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Estado</label>
            <Input
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Email do Administrador *</label>
            <Input
              type="email"
              value={formData.admin_principal_email}
              onChange={(e) => setFormData({ ...formData, admin_principal_email: e.target.value })}
              className="border-gray-300 rounded-xl min-h-[48px] text-base"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Plano</label>
              <Select
                value={formData.plano_assinatura}
                onValueChange={(value) => setFormData({ ...formData, plano_assinatura: value })}
              >
                <SelectTrigger className="border-gray-300 rounded-xl min-h-[48px] text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (14 dias)</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Status</label>
              <Select
                value={formData.status_assinatura}
                onValueChange={(value) => setFormData({ ...formData, status_assinatura: value })}
              >
                <SelectTrigger className="border-gray-300 rounded-xl min-h-[48px] text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 min-h-[48px]">
            <input
              type="checkbox"
              checked={formData.ativa}
              onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
              className="w-5 h-5 rounded"
              style={{ accentColor: '#7E57FF' }}
            />
            <label className="text-base cursor-pointer" style={{ color: '#202124' }}>Clínica Ativa</label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="flex-1 border-2 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all min-h-[48px] text-base"
              style={{ borderColor: '#e8eaed', color: '#5f6368' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base"
              style={{ backgroundColor: '#7E57FF' }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </div>
        </form>
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}