import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  AlertTriangle,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  FileText,
  Scan,
  FileSpreadsheet,
  Brain,
  Building2,
  Calendar as CalendarIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import CodigoBarrasScanner from "@/components/estoque/CodigoBarrasScanner";
import RelatorioInventario from "@/components/estoque/RelatorioInventario";
import PrevisaoDemandaIA from "@/components/estoque/PrevisaoDemandaIA";
import IntegracaoFornecedores from "@/components/estoque/IntegracaoFornecedores";
import ControleLoteValidade from "@/components/estoque/ControleLoteValidade";
import SearchBar from "@/components/ui/SearchBar";
import StatCard from "@/components/ui/StatCard";
import AlertBanner from "@/components/ui/AlertBanner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, EmptyState } from "@/components/ui/LoadingSpinner";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import ModuleTour from "@/components/onboarding/ModuleTour";
import RouteGuard from "@/components/auth/RouteGuard";
import ModuloGuard from "@/components/auth/ModuloGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function Estoque() {
  usePerformanceTracker('/Estoque');
  const { clinicaId } = useClinicaContext();
  const [showPanel, setShowPanel] = useState(false);
  const [showMovimentacaoPanel, setShowMovimentacaoPanel] = useState(false);
  const [showHistoricoPanel, setShowHistoricoPanel] = useState(false);
  const [showRelatorioPanel, setShowRelatorioPanel] = useState(false);
  const [showScannerPanel, setShowScannerPanel] = useState(false);
  const [showPrevisaoPanel, setShowPrevisaoPanel] = useState(false);
  const [showFornecedoresPanel, setShowFornecedoresPanel] = useState(false);
  const [showLoteValidadePanel, setShowLoteValidadePanel] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState(null);
  const [medicamentoSelecionado, setMedicamentoSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroAlerta, setFiltroAlerta] = useState("todos");
  const queryClient = useQueryClient();

  const { data: medicamentos = [], isLoading } = useOptimizedQuery({
    queryKey: ["produtos-estoque", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Produto.filter({ 
      clinica_id: clinicaId,
      tipo: ["produto", "medicamento"] // Apenas produtos físicos com estoque
    }, "-created_date") : [],
    enabled: !!clinicaId
  });

  const { data: movimentacoes = [] } = useOptimizedQuery({
    queryKey: ["movimentacoes"],
    queryFn: () => base44.entities.MovimentacaoEstoque.list("-data_movimentacao", 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Produto.create({ 
      ...data, 
      clinica_id: clinicaId,
      tipo: 'medicamento'
    }),
    onSuccess: () => {
      // Invalidar TODOS os caches de produtos
      queryClient.invalidateQueries(["produtos-estoque"]);
      queryClient.invalidateQueries(["produtos-catalogo"]);
      queryClient.invalidateQueries(["produtos-catalogo-marketplace"]);
      queryClient.invalidateQueries(["catalogo-publico"]);
      setShowPanel(false);
      setEditingMedicamento(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const user = await base44.auth.me();
      const payload = { ...data, clinica_id: user.clinica_id, tipo: 'medicamento' };
      return base44.entities.Produto.update(id, payload);
    },
    onSuccess: () => {
      // Invalidar TODOS os caches de produtos
      queryClient.invalidateQueries(["produtos-estoque"]);
      queryClient.invalidateQueries(["produtos-catalogo"]);
      queryClient.invalidateQueries(["produtos-catalogo-marketplace"]);
      queryClient.invalidateQueries(["catalogo-publico"]);
      setShowPanel(false);
      setEditingMedicamento(null);
    }
  });

  const movimentacaoMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.MovimentacaoEstoque.create(data);
      
      // Atualizar estoque do medicamento
      const medicamento = medicamentos.find(m => m.id === data.medicamento_id);
      if (medicamento) {
        const novaQuantidade = data.tipo_movimentacao === "entrada" 
          ? medicamento.quantidade_estoque + data.quantidade
          : medicamento.quantidade_estoque - data.quantidade;
        
        await base44.entities.Produto.update(data.medicamento_id, {
          ...medicamento,
          quantidade_estoque: novaQuantidade
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["produtos-estoque"]);
      queryClient.invalidateQueries(["movimentacoes"]);
      setShowMovimentacaoPanel(false);
    }
  });

  const [formData, setFormData] = useState({
    nome: "",
    principio_ativo: "",
    codigo_barras: "",
    registro_anvisa: "",
    fabricante: "",
    categoria: "outro",
    apresentacao: "",
    dosagem: "",
    unidade_medida: "comprimido",
    quantidade_estoque: 0,
    estoque_minimo: 10,
    estoque_maximo: 100,
    preco_custo: 0,
    preco_venda: 0,
    margem_lucro: 0,
    lote: "",
    validade: "",
    localizacao: "",
    fornecedor: "",
    tarja: "sem_tarja",
    receita_obrigatoria: false,
    controlado: false,
    ativo: true,
    observacoes: ""
  });

  const [movimentacaoData, setMovimentacaoData] = useState({
    tipo_movimentacao: "entrada",
    quantidade: 0,
    data_movimentacao: format(new Date(), "yyyy-MM-dd"),
    motivo: "",
    fornecedor: "",
    numero_nota: "",
    valor_unitario: 0,
    lote: "",
    validade: "",
    observacoes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // CRITICAL: preco_base é required - usar preco_venda
    const payload = {
      ...formData,
      preco_base: formData.preco_venda || formData.preco_custo || 0
    };

    if (editingMedicamento) {
      updateMutation.mutate({ id: editingMedicamento.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleMovimentacao = (e) => {
    e.preventDefault();
    const medicamento = medicamentoSelecionado;
    
    movimentacaoMutation.mutate({
      ...movimentacaoData,
      medicamento_id: medicamento.id,
      medicamento_nome: medicamento.nome,
      valor_total: movimentacaoData.quantidade * movimentacaoData.valor_unitario,
      estoque_anterior: medicamento.quantidade_estoque,
      estoque_atual: movimentacaoData.tipo_movimentacao === "entrada"
        ? medicamento.quantidade_estoque + movimentacaoData.quantidade
        : medicamento.quantidade_estoque - movimentacaoData.quantidade,
      responsavel: "Sistema"
    });
  };

  const abrirMovimentacao = (medicamento, tipo) => {
    setMedicamentoSelecionado(medicamento);
    setMovimentacaoData({
      tipo_movimentacao: tipo,
      quantidade: 0,
      data_movimentacao: format(new Date(), "yyyy-MM-dd"),
      motivo: "",
      fornecedor: medicamento.fornecedor || "",
      numero_nota: "",
      valor_unitario: tipo === "entrada" ? medicamento.preco_custo : 0,
      lote: medicamento.lote || "",
      validade: medicamento.validade || "",
      observacoes: ""
    });
    setShowMovimentacaoPanel(true);
  };

  const verHistorico = (medicamento) => {
    setMedicamentoSelecionado(medicamento);
    setShowHistoricoPanel(true);
  };

  const handleScanCodigoBarras = async (codigo) => {
    // Buscar medicamento por código de barras
    const medicamento = medicamentos.find(m => m.codigo_barras === codigo);
    
    if (medicamento) {
      handleEdit(medicamento);
      setShowScannerPanel(false);
    } else {
      // Criar novo com código de barras preenchido
      setFormData({ ...formData, codigo_barras: codigo });
      setShowScannerPanel(false);
      setShowPanel(true);
    }
  };

  const handleAjusteInventario = async (medicamento, novaQuantidade, diferenca) => {
    await movimentacaoMutation.mutateAsync({
      medicamento_id: medicamento.id,
      medicamento_nome: medicamento.nome,
      tipo_movimentacao: "ajuste",
      quantidade: Math.abs(diferenca),
      data_movimentacao: format(new Date(), "yyyy-MM-dd"),
      motivo: "Ajuste de inventário",
      estoque_anterior: medicamento.quantidade_estoque,
      estoque_atual: novaQuantidade,
      responsavel: "Inventário"
    });
  };

  const handleEdit = (medicamento) => {
    setEditingMedicamento(medicamento);
    const margem = medicamento.preco_custo > 0 
      ? ((medicamento.preco_venda - medicamento.preco_custo) / medicamento.preco_custo * 100).toFixed(2)
      : 0;
    setFormData({
      ...medicamento,
      margem_lucro: margem
    });
    setShowPanel(true);
  };

  const medicamentosFiltrados = useMemo(() => {
    let filtrados = medicamentos
      .filter((m) => filtroCategoria === "todos" ? true : m.categoria === filtroCategoria)
      .filter((m) =>
        m.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        m.principio_ativo?.toLowerCase().includes(busca.toLowerCase())
      );

    if (filtroAlerta === "baixo") {
      filtrados = filtrados.filter(m => m.quantidade_estoque <= (m.estoque_minimo || 0));
    } else if (filtroAlerta === "vencendo") {
      const tresMeses = new Date();
      tresMeses.setMonth(tresMeses.getMonth() + 3);
      filtrados = filtrados.filter(m => m.validade && new Date(m.validade) <= tresMeses);
    }

    return filtrados;
  }, [medicamentos, filtroCategoria, busca, filtroAlerta]);

  const estoquesBaixos = useMemo(
    () => medicamentos.filter((m) => m.quantidade_estoque <= (m.estoque_minimo || 0)),
    [medicamentos]
  );

  const medicamentosVencendo = useMemo(() => {
    const umMes = new Date();
    umMes.setDate(umMes.getDate() + 30); // 30 days from now
    return medicamentos.filter((m) => m.validade && new Date(m.validade) <= umMes);
  }, [medicamentos]);

  const valorTotalEstoque = useMemo(
    () => medicamentos.reduce((acc, m) => acc + (m.quantidade_estoque || 0) * (m.preco_custo || 0), 0),
    [medicamentos]
  );

  const historicoMovimentacoes = useMemo(() => {
    if (!medicamentoSelecionado) return [];
    return movimentacoes.filter(m => m.medicamento_id === medicamentoSelecionado.id);
  }, [medicamentoSelecionado, movimentacoes]);

  const tourSteps = [
    {
      title: "Bem-vindo ao Controle de Estoque",
      description: "Gerencie medicamentos e insumos com alertas automáticos de estoque baixo e vencimento próximo."
    },
    {
      title: "Adicionar e movimentar itens",
      description: "Clique em 'Adicionar Item' para cadastrar novos produtos. Use 'Entrada' e 'Saída' para controlar movimentações de estoque."
    },
    {
      title: "Recursos avançados",
      description: "Use o scanner de código de barras, previsão de demanda com IA, e relatórios de inventário para otimizar sua gestão."
    }
  ];

  if (isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={true}>
        <div className="max-w-6xl mx-auto space-y-6 overflow-x-hidden">
          <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-40 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
                <div className="h-5 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={true}>
      <div className="max-w-6xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">:::
        <ModuleTour moduleName="estoque" steps={tourSteps} />
      <PageHeader
        title="Estoque"
        description="Gestão de medicamentos e insumos"
        breadcrumbs={[{ label: "Administração" }, { label: "Estoque" }]}
        action={
          <button
            onClick={() => {
              setEditingMedicamento(null);
              setFormData({
                nome: "",
                principio_ativo: "",
                codigo_barras: "",
                registro_anvisa: "",
                fabricante: "",
                categoria: "outro",
                apresentacao: "",
                dosagem: "",
                unidade_medida: "comprimido",
                quantidade_estoque: 0,
                estoque_minimo: 10,
                estoque_maximo: 100,
                preco_custo: 0,
                preco_venda: 0,
                margem_lucro: 0,
                lote: "",
                validade: "",
                localizacao: "",
                fornecedor: "",
                tarja: "sem_tarja",
                receita_obrigatoria: false,
                controlado: false,
                ativo: true,
                observacoes: ""
              });
              setShowPanel(true);
            }}
            aria-label="Adicionar item ao estoque"
            className="inline-flex items-center gap-2 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl min-h-[48px] transition-all w-full sm:w-auto justify-center hover:opacity-90"
            style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Adicionar Item</span>
          </button>
        }
      />

      {/* Menu Rápido - Mobile First */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-hidden">
        {[
          { onClick: () => setShowPrevisaoPanel(true), icon: Brain, label: "Previsão IA", color: "#7E57FF", bg: "#f5f3ff" },
          { onClick: () => setShowFornecedoresPanel(true), icon: Building2, label: "Fornecedores", color: "#1a73e8", bg: "#e8f1fb" },
          { onClick: () => setShowLoteValidadePanel(true), icon: CalendarIcon, label: "Lote/Validade", color: "#fbbc04", bg: "#fef9e5" },
          { onClick: () => setShowRelatorioPanel(true), icon: FileSpreadsheet, label: "Inventário", color: "#34a853", bg: "#e6f7ed" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              aria-label={item.label}
              className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md min-h-[100px] transition-all active:scale-95 overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.bg }}
              >
                <Icon className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <span className="text-center break-words font-bold" style={{ color: '#202124', fontSize: '14px', lineHeight: '1.3' }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stats - Mobile First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 overflow-hidden">
        {(
          <>
            <StatCard
              title="Total de Itens"
              value={medicamentos.length}
              icon={Package}
              color="#7E57FF"
              delay={0.1}
            />
            <StatCard
              title="Estoque Baixo"
              value={estoquesBaixos.length}
              icon={AlertTriangle}
              color="#fbbc04"
              delay={0.15}
            />
            <StatCard
              title="Vencendo (30d)"
              value={medicamentosVencendo.length}
              icon={Clock}
              color="#ea4335"
              delay={0.2}
            />
            <StatCard
              title="Valor Total"
              value={`R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="#34a853"
              delay={0.25}
            />
          </>
        )}
      </div>

      {/* Alertas de Vencimento */}
      {!isLoading && medicamentosVencendo.length > 0 && (
        <AlertBanner variant="error" title={`${medicamentosVencendo.length} medicamento(s) vencendo em até 30 dias`}>
          <div className="space-y-2">
            {medicamentosVencendo.slice(0, 3).map((med) => (
              <div key={med.id} className="bg-white rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-on-surface text-sm truncate">{med.nome}</p>
                    <p className="text-xs text-on-surface-variant truncate">Lote: {med.lote}</p>
                  </div>
                  <Badge variant="error">
                    <span className="text-xs">Validade: {format(new Date(med.validade), "dd/MM/yyyy")}</span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </AlertBanner>
      )}

      {/* Alertas de Estoque Baixo */}
      {!isLoading && estoquesBaixos.length > 0 && (
        <AlertBanner variant="warning" title={`${estoquesBaixos.length} item(ns) com estoque baixo`}>
          <div className="space-y-2">
            {estoquesBaixos.slice(0, 3).map((med) => (
              <div key={med.id} className="bg-white rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-on-surface text-sm truncate">{med.nome}</p>
                    <p className="text-xs text-on-surface-variant truncate">{med.apresentacao}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant="warning"><span className="text-xs">Atual: {med.quantidade_estoque}</span></Badge>
                    <Badge variant="default"><span className="text-xs">Mín: {med.estoque_minimo}</span></Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AlertBanner>
      )}

      {/* Ações Rápidas */}
      <div className="bg-white rounded-2xl shadow-sm border p-3 md:p-4 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowScannerPanel(true)}
            aria-label="Ler código de barras" 
            className="inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] px-4 overflow-hidden"
            style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
          >
            <Scan className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline truncate">Ler Código</span>
            <span className="sm:hidden truncate">Código</span>
          </button>
          <button 
            onClick={() => setShowRelatorioPanel(true)}
            aria-label="Abrir relatório de inventário" 
            className="inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] px-4 hover:bg-gray-200 overflow-hidden"
            style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
          >
            <FileSpreadsheet className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Relatório</span>
          </button>
        </div>
      </div>

      {/* Filtros - Mobile First */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-5 overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="min-w-0">
          <div className="flex flex-col gap-3">
            <div className="w-full min-w-0">
              <SearchBar
                value={busca}
                onChange={setBusca}
                placeholder="Buscar medicamento..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden">
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-full bg-gray-100 border-0 rounded-full min-h-[48px]" style={{ fontSize: '14px' }}>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="todos" style={{ fontSize: '14px' }}>Todas categorias</SelectItem>
                <SelectItem value="antibiotico" style={{ fontSize: '14px' }}>Antibiótico</SelectItem>
                <SelectItem value="analgesico" style={{ fontSize: '14px' }}>Analgésico</SelectItem>
                <SelectItem value="anti_inflamatorio" style={{ fontSize: '14px' }}>Anti-inflamatório</SelectItem>
                <SelectItem value="vitamina" style={{ fontSize: '14px' }}>Vitamina</SelectItem>
                <SelectItem value="suplemento" style={{ fontSize: '14px' }}>Suplemento</SelectItem>
                <SelectItem value="injetavel" style={{ fontSize: '14px' }}>Injetável</SelectItem>
                <SelectItem value="outro" style={{ fontSize: '14px' }}>Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroAlerta} onValueChange={setFiltroAlerta}>
              <SelectTrigger className="w-full bg-gray-100 border-0 rounded-full min-h-[48px]" style={{ fontSize: '14px' }}>
                <SelectValue placeholder="Alertas" />
              </SelectTrigger>
              <SelectContent className="z-[80]">
                <SelectItem value="todos" style={{ fontSize: '14px' }}>Todos os itens</SelectItem>
                <SelectItem value="baixo" style={{ fontSize: '14px' }}>Estoque Baixo</SelectItem>
                <SelectItem value="vencendo" style={{ fontSize: '14px' }}>Vencendo em Breve</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="grid gap-4 overflow-hidden">
        {medicamentosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
            <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#bdc1c6' }} aria-hidden="true" />
            <h3 className="font-bold mb-2 break-words" style={{ color: '#202124', fontSize: '20px' }}>Nenhum medicamento encontrado</h3>
            <p className="mb-6 break-words" style={{ color: '#5f6368', fontSize: '16px' }}>Adicione itens ao estoque para começar o controle</p>
            <button
              onClick={() => {
                setEditingMedicamento(null);
                setFormData({
                  nome: "",
                  principio_ativo: "",
                  codigo_barras: "",
                  registro_anvisa: "",
                  fabricante: "",
                  categoria: "outro",
                  apresentacao: "",
                  dosagem: "",
                  unidade_medida: "comprimido",
                  quantidade_estoque: 0,
                  estoque_minimo: 10,
                  estoque_maximo: 100,
                  preco_custo: 0,
                  preco_venda: 0,
                  margem_lucro: 0,
                  lote: "",
                  validade: "",
                  localizacao: "",
                  fornecedor: "",
                  tarja: "sem_tarja",
                  receita_obrigatoria: false,
                  controlado: false,
                  ativo: true,
                  observacoes: ""
                });
                setShowPanel(true);
              }}
              aria-label="Adicionar primeiro item ao estoque"
              className="inline-flex items-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-6"
              style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              Adicionar Primeiro Item
            </button>
          </div>
        ) : (
          medicamentosFiltrados.map((medicamento, idx) => {
            const estoqueBaixo = medicamento.quantidade_estoque <= (medicamento.estoque_minimo || 0);
            const vencimentoProximo = medicamento.validade && new Date(medicamento.validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            return (
              <div
                key={medicamento.id}
                className="bg-white rounded-2xl shadow-sm border p-5 md:p-6 transition-all hover:shadow-md overflow-hidden"
                style={{ borderColor: '#e8eaed' }}
              >
                <div className="min-w-0">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: estoqueBaixo || vencimentoProximo ? '#fef9e5' : '#e6f7ed',
                          color: estoqueBaixo || vencimentoProximo ? '#fbbc04' : '#34a853'
                        }}
                      >
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: 'clamp(15px, 4vw, 18px)' }}>
                          {medicamento.nome}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {medicamento.principio_ativo && (
                            <span className="px-2 py-1 rounded-lg font-bold whitespace-nowrap" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '13px' }}>{medicamento.principio_ativo}</span>
                          )}
                          {medicamento.apresentacao && (
                            <span className="px-2 py-1 rounded-lg font-bold whitespace-nowrap" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '13px' }}>{medicamento.apresentacao}</span>
                          )}
                          {vencimentoProximo && (
                            <span className="px-2 py-1 rounded-lg font-bold whitespace-nowrap" style={{ backgroundColor: '#fde7e7', color: '#c5221f', fontSize: '13px' }}>
                              Vencimento: {format(new Date(medicamento.validade), "dd/MM/yy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 overflow-hidden">
                    <div className="rounded-xl p-3 min-h-[72px] overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                      <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Estoque</p>
                      <p className="font-bold truncate" style={{ 
                        color: estoqueBaixo ? '#fbbc04' : '#202124',
                        fontSize: '24px'
                      }}>
                        {medicamento.quantidade_estoque}
                      </p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[72px] overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                      <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Mínimo</p>
                      <p className="font-bold truncate" style={{ color: '#202124', fontSize: '24px' }}>{medicamento.estoque_minimo}</p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[72px] overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                      <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Custo</p>
                      <p className="font-bold truncate" style={{ color: '#202124', fontSize: '20px' }}>
                        R$ {medicamento.preco_custo?.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl p-3 min-h-[72px] overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                      <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Venda</p>
                      <p className="font-bold truncate" style={{ color: '#34a853', fontSize: '20px' }}>
                        R$ {medicamento.preco_venda?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 overflow-hidden">
                    <button 
                      onClick={() => handleEdit(medicamento)}
                      aria-label="Editar medicamento" 
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-4 overflow-hidden"
                      style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                    >
                      <span className="truncate">Editar</span>
                    </button>
                    <button 
                      onClick={() => abrirMovimentacao(medicamento, "entrada")}
                      aria-label="Registrar entrada de estoque" 
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] px-4 hover:opacity-90 overflow-hidden"
                      style={{ backgroundColor: '#e6f7ed', color: '#137333', fontSize: '14px', border: '1px solid #b8e7ca' }}
                    >
                      <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Entrada</span>
                    </button>
                    <button 
                      onClick={() => abrirMovimentacao(medicamento, "saida")}
                      aria-label="Registrar saída de estoque" 
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all min-h-[48px] px-4 hover:opacity-90 overflow-hidden"
                      style={{ backgroundColor: '#fde7e7', color: '#842820', fontSize: '14px', border: '1px solid #f9b8b6' }}
                    >
                      <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Saída</span>
                    </button>
                    <button 
                      onClick={() => verHistorico(medicamento)}
                      aria-label="Ver histórico de movimentações" 
                      className="inline-flex items-center justify-center gap-2 font-bold rounded-xl hover:bg-gray-200 transition-all min-h-[48px] px-4 sm:col-span-1 col-span-2 overflow-hidden"
                      style={{ backgroundColor: '#f8f9fa', color: '#202124', fontSize: '14px' }}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Histórico</span>
                    </button>
                  </div>
                </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SlideInPanel - Formulário Principal */}
      <SlideInPanel
        open={showPanel}
        onClose={() => setShowPanel(false)}
        title={editingMedicamento ? "Editar Item" : "Novo Item"}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Nome do Medicamento *
              </label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="pc-input min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Princípio Ativo
              </label>
              <Input
                value={formData.principio_ativo}
                onChange={(e) =>
                  setFormData({ ...formData, principio_ativo: e.target.value })
                }
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Fabricante/Laboratório
              </label>
              <Input
                value={formData.fabricante}
                onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                className="pc-input min-h-[44px]"
                placeholder="Ex: EMS, Medley"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Código de Barras (EAN)
              </label>
              <Input
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                className="pc-input min-h-[44px]"
                placeholder="7891234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Categoria
              </label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="antibiotico">Antibiótico</SelectItem>
                  <SelectItem value="analgesico">Analgésico</SelectItem>
                  <SelectItem value="anti_inflamatorio">Anti-inflamatório</SelectItem>
                  <SelectItem value="vitamina">Vitamina</SelectItem>
                  <SelectItem value="suplemento">Suplemento</SelectItem>
                  <SelectItem value="hormonio">Hormônio</SelectItem>
                  <SelectItem value="uso_topico">Uso Tópico</SelectItem>
                  <SelectItem value="injetavel">Injetável</SelectItem>
                  <SelectItem value="controlado">Controlado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Tarja
              </label>
              <Select
                value={formData.tarja}
                onValueChange={(value) => setFormData({ ...formData, tarja: value })}
              >
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_tarja">Sem Tarja</SelectItem>
                  <SelectItem value="amarela">Amarela</SelectItem>
                  <SelectItem value="vermelha">Vermelha</SelectItem>
                  <SelectItem value="preta">Preta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Unidade
              </label>
              <Select
                value={formData.unidade_medida}
                onValueChange={(value) => setFormData({ ...formData, unidade_medida: value })}
              >
                <SelectTrigger className="pc-input min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="comprimido">Comprimido</SelectItem>
                  <SelectItem value="capsula">Cápsula</SelectItem>
                  <SelectItem value="ml">ML</SelectItem>
                  <SelectItem value="mg">MG</SelectItem>
                  <SelectItem value="ampola">Ampola</SelectItem>
                  <SelectItem value="frasco">Frasco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Apresentação
              </label>
              <Input
                value={formData.apresentacao}
                onChange={(e) => setFormData({ ...formData, apresentacao: e.target.value })}
                className="pc-input min-h-[44px]"
                placeholder="Ex: Caixa com 30 comprimidos"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Dosagem
              </label>
              <Input
                value={formData.dosagem}
                onChange={(e) => setFormData({ ...formData, dosagem: e.target.value })}
                className="pc-input min-h-[44px]"
                placeholder="Ex: 500mg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Quantidade *
              </label>
              <Input
                type="number"
                value={formData.quantidade_estoque}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantidade_estoque: parseFloat(e.target.value)
                  })
                }
                className="pc-input min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Mínimo
              </label>
              <Input
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) =>
                  setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) })
                }
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Máximo
              </label>
              <Input
                type="number"
                value={formData.estoque_maximo}
                onChange={(e) =>
                  setFormData({ ...formData, estoque_maximo: parseFloat(e.target.value) })
                }
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Custo (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_custo}
                onChange={(e) => {
                  const custo = parseFloat(e.target.value) || 0;
                  const venda = formData.preco_venda;
                  const margem = custo > 0 ? ((venda - custo) / custo * 100).toFixed(2) : 0;
                  setFormData({ ...formData, preco_custo: custo, margem_lucro: margem });
                }}
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Venda (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_venda}
                onChange={(e) => {
                  const venda = parseFloat(e.target.value) || 0;
                  const custo = formData.preco_custo;
                  const margem = custo > 0 ? ((venda - custo) / custo * 100).toFixed(2) : 0;
                  setFormData({ ...formData, preco_venda: venda, margem_lucro: margem });
                }}
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Margem (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.margem_lucro}
                onChange={(e) => {
                  const margem = parseFloat(e.target.value) || 0;
                  const custo = formData.preco_custo;
                  const venda = custo * (1 + margem / 100);
                  setFormData({ ...formData, margem_lucro: margem, preco_venda: venda.toFixed(2) });
                }}
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">Lote</label>
              <Input
                value={formData.lote}
                onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Validade
              </label>
              <Input
                type="date"
                value={formData.validade}
                onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                className="pc-input min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Fornecedor
              </label>
              <Input
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                className="pc-input min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
                Localização
              </label>
              <Input
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                className="pc-input min-h-[44px]"
                placeholder="Ex: Prateleira A3"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
              Registro ANVISA
            </label>
            <Input
              value={formData.registro_anvisa}
              onChange={(e) => setFormData({ ...formData, registro_anvisa: e.target.value })}
              className="pc-input min-h-[44px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <label className="flex items-center gap-2 min-h-[44px]">
              <input
                type="checkbox"
                checked={formData.receita_obrigatoria}
                onChange={(e) => setFormData({ ...formData, receita_obrigatoria: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-xs md:text-sm text-[var(--pc-text-primary)]">Requer Receita</span>
            </label>
            <label className="flex items-center gap-2 min-h-[44px]">
              <input
                type="checkbox"
                checked={formData.controlado}
                onChange={(e) => setFormData({ ...formData, controlado: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-xs md:text-sm text-[var(--pc-text-primary)]">Controlado</span>
            </label>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-[var(--pc-text-secondary)] mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPanel(false)}
              className="min-h-[44px] flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              aria-label={editingMedicamento ? "Atualizar medicamento" : "Salvar medicamento"}
              className="flex-1 min-h-[48px] text-white font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span>Salvando...</span>
                </>
              ) : (
                editingMedicamento ? "Atualizar" : "Salvar"
              )}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* SlideInPanel - Movimentação */}
      <SlideInPanel
        open={showMovimentacaoPanel}
        onClose={() => setShowMovimentacaoPanel(false)}
        title={`${movimentacaoData.tipo_movimentacao === "entrada" ? "Entrada" : "Saída"} de Estoque`}
        maxWidth="700px"
      >
        <form onSubmit={handleMovimentacao} className="space-y-4">
          <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
            <h4 className="font-medium mb-2" style={{ color: '#7E57FF' }}>
              {medicamentoSelecionado?.nome}
            </h4>
            <p className="text-sm" style={{ color: '#5f4ab8' }}>
              Estoque Atual: <strong>{medicamentoSelecionado?.quantidade_estoque}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade *</label>
            <Input
              type="number"
              value={movimentacaoData.quantidade}
              onChange={(e) => setMovimentacaoData({ ...movimentacaoData, quantidade: parseFloat(e.target.value) })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
            <Input
              type="date"
              value={movimentacaoData.data_movimentacao}
              onChange={(e) => setMovimentacaoData({ ...movimentacaoData, data_movimentacao: e.target.value })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
            <Input
              value={movimentacaoData.motivo}
              onChange={(e) => setMovimentacaoData({ ...movimentacaoData, motivo: e.target.value })}
              className="border border-gray-300 rounded-lg min-h-[44px]"
              style={{ fontSize: '14px' }}
              placeholder="Ex: Compra, Venda, Perda, Ajuste"
              required
            />
          </div>

          {movimentacaoData.tipo_movimentacao === "entrada" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
                <Input
                  value={movimentacaoData.fornecedor}
                  onChange={(e) => setMovimentacaoData({ ...movimentacaoData, fornecedor: e.target.value })}
                  className="border border-gray-300 rounded-lg min-h-[44px]"
                  style={{ fontSize: '14px' }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nº Nota Fiscal</label>
                  <Input
                    value={movimentacaoData.numero_nota}
                    onChange={(e) => setMovimentacaoData({ ...movimentacaoData, numero_nota: e.target.value })}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    style={{ fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor Unitário (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={movimentacaoData.valor_unitario}
                    onChange={(e) => setMovimentacaoData({ ...movimentacaoData, valor_unitario: parseFloat(e.target.value) })}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lote</label>
                  <Input
                    value={movimentacaoData.lote}
                    onChange={(e) => setMovimentacaoData({ ...movimentacaoData, lote: e.target.value })}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    style={{ fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Validade</label>
                  <Input
                    type="date"
                    value={movimentacaoData.validade}
                    onChange={(e) => setMovimentacaoData({ ...movimentacaoData, validade: e.target.value })}
                    className="border border-gray-300 rounded-lg min-h-[44px]"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={movimentacaoData.observacoes}
              onChange={(e) => setMovimentacaoData({ ...movimentacaoData, observacoes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 resize-none min-h-[88px]"
              style={{ fontSize: '14px' }}
              rows="3"
            />
          </div>

          <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f5f3ff', borderColor: '#e9ddff' }}>
            <p className="text-sm font-medium" style={{ color: '#7E57FF' }}>
              Novo Estoque: <strong>
                {movimentacaoData.tipo_movimentacao === "entrada"
                  ? medicamentoSelecionado?.quantidade_estoque + movimentacaoData.quantidade
                  : medicamentoSelecionado?.quantidade_estoque - movimentacaoData.quantidade}
              </strong>
            </p>
            {movimentacaoData.quantidade > 0 && movimentacaoData.valor_unitario > 0 && (
              <p className="text-sm mt-1" style={{ color: '#5f4ab8' }}>
                Valor Total: <strong>R$ {(movimentacaoData.quantidade * movimentacaoData.valor_unitario).toFixed(2)}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowMovimentacaoPanel(false)}
              className="min-h-[44px] flex-1"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={movimentacaoMutation.isPending}
              aria-label="Confirmar movimentação de estoque"
              className="flex-1 min-h-[48px] text-white font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            >
              {movimentacaoMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span>Processando...</span>
                </>
              ) : (
                "Confirmar Movimentação"
              )}
            </button>
          </div>
        </form>
      </SlideInPanel>

      {/* SlideInPanel - Histórico */}
      <SlideInPanel
        open={showHistoricoPanel}
        onClose={() => setShowHistoricoPanel(false)}
        title={`Histórico - ${medicamentoSelecionado?.nome}`}
        maxWidth="700px"
      >
        <div className="space-y-4">
          {historicoMovimentacoes.length === 0 ? (
          <div className="text-center py-8 md:py-12 overflow-hidden">
            <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4" style={{ color: '#bdc1c6' }} aria-hidden="true" />
            <p className="mb-4 break-words" style={{ color: '#5f6368', fontSize: '16px' }}>Nenhuma movimentação registrada</p>
            <p className="break-words" style={{ color: '#80868b', fontSize: '14px' }}>As movimentações de entrada e saída aparecerão aqui</p>
          </div>
          ) : (
            historicoMovimentacoes.map((mov) => (
              <div key={mov.id} className="rounded-xl p-4 border overflow-hidden" style={{ backgroundColor: '#f8f9fa', borderColor: '#e8eaed' }}>
                <div className="flex items-start gap-3 min-w-0">
                  {mov.tipo_movimentacao === "entrada" ? (
                    <ArrowUpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#34a853' }} />
                  ) : (
                    <ArrowDownCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ea4335' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold capitalize truncate" style={{ color: '#202124', fontSize: '15px' }}>{mov.tipo_movimentacao}</p>
                        <p className="mt-1 truncate" style={{ color: '#5f6368', fontSize: '14px' }}>
                          {format(new Date(mov.data_movimentacao), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="font-bold whitespace-nowrap flex-shrink-0" style={{
                        color: mov.tipo_movimentacao === "entrada" ? '#34a853' : '#ea4335',
                        fontSize: '18px'
                      }}>
                        {mov.tipo_movimentacao === "entrada" ? "+" : "-"}{mov.quantidade}
                      </span>
                    </div>
                    {mov.motivo && (
                      <p className="mb-2 break-words" style={{ color: '#5f6368', fontSize: '14px' }}>
                        <strong>Motivo:</strong> {mov.motivo}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4" style={{ color: '#80868b', fontSize: '13px' }}>
                      <span>Antes: {mov.estoque_anterior}</span>
                      <span>Depois: {mov.estoque_atual}</span>
                      {mov.valor_total > 0 && (
                        <span>Valor: R$ {mov.valor_total.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SlideInPanel>

      {/* Scanner de Código de Barras */}
      <SlideInPanel
        open={showScannerPanel}
        onClose={() => setShowScannerPanel(false)}
        title="Leitura de Código de Barras"
        maxWidth="500px"
      >
        <CodigoBarrasScanner
          onScan={handleScanCodigoBarras}
          onClose={() => setShowScannerPanel(false)}
        />
      </SlideInPanel>

      {/* Relatório de Inventário */}
      <SlideInPanel
        open={showRelatorioPanel}
        onClose={() => setShowRelatorioPanel(false)}
        title="Relatório de Inventário"
        maxWidth="1200px"
      >
        <RelatorioInventario
          medicamentos={medicamentos}
          movimentacoes={movimentacoes}
          onAjusteEstoque={handleAjusteInventario}
        />
      </SlideInPanel>

      {/* Previsão de Demanda IA */}
      <SlideInPanel
        open={showPrevisaoPanel}
        onClose={() => setShowPrevisaoPanel(false)}
        title="Previsão de Demanda com IA"
        maxWidth="900px"
      >
        <PrevisaoDemandaIA
          medicamentos={medicamentos}
          movimentacoes={movimentacoes}
          onPrevisaoGerada={(previsao) => {
            console.log("Previsão gerada:", previsao);
          }}
        />
      </SlideInPanel>

      {/* Integração Fornecedores */}
      <SlideInPanel
        open={showFornecedoresPanel}
        onClose={() => setShowFornecedoresPanel(false)}
        title="Integração com Fornecedores"
        maxWidth="800px"
      >
        <IntegracaoFornecedores
          medicamentosSugeridos={estoquesBaixos}
        />
      </SlideInPanel>

      {/* Controle Lote/Validade */}
      <SlideInPanel
        open={showLoteValidadePanel}
        onClose={() => setShowLoteValidadePanel(false)}
        title="Controle de Lote e Validade"
        maxWidth="900px"
      >
        <ControleLoteValidade
          medicamentos={medicamentos}
          onAtualizarMedicamento={(id, data) => {
            const medicamento = medicamentos.find(m => m.id === id);
            updateMutation.mutate({ id, data: { ...medicamento, ...data } });
          }}
        />
      </SlideInPanel>
      </div>
    </RouteGuard>
  );
}