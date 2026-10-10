import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { secureEntities } from "@/components/security/SecureEntityWrapper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import FilterBar from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { motion } from "framer-motion";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";
import { usePermissions } from "@/components/hooks/usePermissions";
import RouteGuard from "@/components/auth/RouteGuard";
import PermissionGuard from "@/components/auth/PermissionGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Produtos() {
  usePerformanceTracker('/Produtos');
  const { clinicaId } = useClinicaContext();
  const userPermissions = usePermissions();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useOptimizedQuery({
    queryKey: ["produtos-catalogo", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Produto.filter({ 
      clinica_id: clinicaId,
      ativo: true
    }, "-created_date", 100) : [],
    enabled: !!clinicaId,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: vendas = [], isLoading: loadingVendas } = useOptimizedQuery({
    queryKey: ["vendas", clinicaId],
    queryFn: () => clinicaId ? base44.entities.Venda.filter({ clinica_id: clinicaId }, "-data_venda", 50) : [],
    enabled: !!clinicaId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = loadingProdutos || loadingVendas;

  const produtosFiltrados = produtos
    .filter((p) => filtroTipo === "todos" ? true : p.tipo === filtroTipo)
    .filter((p) =>
      p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(busca.toLowerCase())
    );

  const totalProdutos = produtos.filter(p => p.tipo === "produto").length;
  const totalServicos = produtos.filter(p => p.tipo === "servico").length;
  const receitaPotencial = produtos
    .filter(p => p.ativo)
    .reduce((acc, p) => acc + (p.preco_base || 0), 0);

  const relatorioVendas = useMemo(() => {
    const vendaPorProduto = {};
    
    vendas.forEach(venda => {
      venda.itens?.forEach(item => {
        if (!vendaPorProduto[item.produto]) {
          vendaPorProduto[item.produto] = {
            nome: item.produto,
            quantidade: 0,
            receita: 0
          };
        }
        vendaPorProduto[item.produto].quantidade += item.quantidade;
        vendaPorProduto[item.produto].receita += item.subtotal;
      });
    });

    return Object.values(vendaPorProduto).sort((a, b) => b.receita - a.receita);
  }, [vendas]);

  return (
    <RouteGuard requireAuth requireClinica>
      <PermissionGuard modulo="produtos">
        <div className="space-y-4 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Produtos e Serviços"
        description="Catálogo completo de produtos e serviços (somente leitura)"
        breadcrumbs={[{ label: "Produtos" }]}
        action={
          user?.role === 'admin' || userPermissions?.perfil === 'admin_clinica' ? (
            <Link
              to={createPageUrl("Estoque")}
              className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all min-h-[48px]"
              style={{ backgroundColor: '#7E57FF', fontSize: '16px' }}
            >
              Gerenciar Estoque
            </Link>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <StatCard
            title="Produtos"
            value={totalProdutos}
            icon={Package}
            color="#7E57FF"
            delay={0}
          />
          <StatCard
            title="Serviços"
            value={totalServicos}
            icon={ShoppingCart}
            color="#a855f7"
            delay={0.05}
          />
          <StatCard
            title="Catálogo Total"
            value={`R$ ${receitaPotencial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="#34a853"
            delay={0.1}
          />
        </div>
      )}

      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar produto ou serviço..."
        filters={[
          {
            value: filtroTipo,
            onValueChange: setFiltroTipo,
            placeholder: "Tipo",
            options: [
              { value: "todos", label: "Todos" },
              { value: "produto", label: "Produtos" },
              { value: "servico", label: "Serviços" },
              { value: "tratamento", label: "Tratamentos" },
              { value: "exame", label: "Exames" },
              { value: "procedimento", label: "Procedimentos" }
            ]
          }
        ]}
      />

      <div className="grid gap-3 md:gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border animate-pulse overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhum item encontrado"
            description="Ajuste os filtros ou gerencie o estoque"
          />
        ) : (
          produtosFiltrados.map((produto, idx) => (
            <div
              key={produto.id}
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border transition-all overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#f5f3ff' }}
                  >
                    <ShoppingCart className="w-6 h-6" style={{ color: '#7E57FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: '#202124', fontSize: 'clamp(16px, 4vw, 18px)' }}>{produto.nome}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-3 py-1 rounded-lg font-bold" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF', fontSize: '14px' }}>{produto.tipo}</span>
                      <span className="px-3 py-1 rounded-lg font-bold" style={{ backgroundColor: '#f8f9fa', color: '#5f6368', fontSize: '14px' }}>{produto.categoria?.replace(/_/g, " ")}</span>
                      {!produto.ativo && (
                        <span className="px-3 py-1 rounded-lg font-bold" style={{ backgroundColor: '#fde7e7', color: '#c5221f', fontSize: '14px' }}>Inativo</span>
                      )}
                    </div>
                    {produto.descricao && (
                      <p className="mt-2 line-clamp-2 break-words" style={{ color: '#5f6368', fontSize: '14px' }}>{produto.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 overflow-hidden">
                  {produto.duracao && (
                    <div className="rounded-xl p-3 min-h-[64px] flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                      <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Duração</p>
                      <p className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>{produto.duracao}</p>
                    </div>
                  )}
                  <div className="rounded-xl p-3 min-h-[64px] flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
                    <p className="mb-1 truncate" style={{ color: '#80868b', fontSize: '14px' }}>Preço</p>
                    <p className="font-bold truncate" style={{ color: '#202124', fontSize: '18px' }}>
                      R$ {produto.preco_base?.toFixed(2)}
                    </p>
                  </div>
                  {produto.margem_lucro > 0 && (
                    <div className="rounded-xl p-3 min-h-[64px] flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#e6f7ed' }}>
                      <p className="mb-1 truncate" style={{ color: '#267a3d', fontSize: '14px' }}>Margem</p>
                      <p className="font-bold" style={{ color: '#34a853', fontSize: '18px' }}>{produto.margem_lucro}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {relatorioVendas.length > 0 && (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <h2 className="font-bold mb-4 flex items-center gap-2 break-words" style={{ color: '#202124', fontSize: '20px' }}>
            <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} aria-hidden="true" />
            <span>Relatório de Vendas</span>
          </h2>
          <div className="space-y-2 overflow-hidden">
            {relatorioVendas.slice(0, 5).map((item, idx) => (
              <div 
                key={idx} 
                className="rounded-xl p-3 md:p-4 min-h-[64px] flex items-center transition-all overflow-hidden hover:bg-[#f5f3ff]"
                style={{ backgroundColor: '#f8f9fa' }}
              >
                <div className="flex items-center justify-between w-full gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: '#202124', fontSize: '16px' }}>{item.nome}</p>
                    <p style={{ color: '#5f6368', fontSize: '14px' }}>Qtd: {item.quantidade}</p>
                  </div>
                  <p className="font-bold flex-shrink-0" style={{ color: '#34a853', fontSize: '20px' }}>
                    R$ {item.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        </div>
      </PermissionGuard>
    </RouteGuard>
  );
}