import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { X, Search, ShoppingCart, Plus, Minus, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useClinicaContext } from "@/components/hooks/useClinicaContext";

export default function ModalVendaPaciente({ contato, isOpen, onClose }) {
  const { clinicaId } = useClinicaContext();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [etapa, setEtapa] = useState("produtos"); // produtos | checkout

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", clinicaId],
    queryFn: () => base44.entities.Produto.filter({ clinica_id: clinicaId, ativo: true }, "nome", 100),
    enabled: !!clinicaId && isOpen,
    staleTime: 5 * 60 * 1000
  });

  const criarVendaMutation = useMutation({
    mutationFn: async (dadosVenda) => {
      const response = await base44.functions.invoke('criarVenda', dadosVenda);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Venda registrada com sucesso!");
      setCarrinho([]);
      queryClient.invalidateQueries(["contato-completo", contato.id]);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Erro ao criar venda");
    }
  });

  const produtosFiltrados = produtos.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const adicionarAoCarrinho = (produto) => {
    const item = carrinho.find(i => i.produto_id === produto.id);
    if (item) {
      setCarrinho(carrinho.map(i =>
        i.produto_id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produto.id,
        produto: produto.nome,
        quantidade: 1,
        preco_unitario: produto.preco_base || 0,
        subtotal: produto.preco_base || 0
      }]);
    }
  };

  const removerDoCarrinho = (produtoId) => {
    const item = carrinho.find(i => i.produto_id === produtoId);
    if (item && item.quantidade > 1) {
      setCarrinho(carrinho.map(i =>
        i.produto_id === produtoId ? { ...i, quantidade: i.quantidade - 1, subtotal: (i.quantidade - 1) * i.preco_unitario } : i
      ));
    } else {
      setCarrinho(carrinho.filter(i => i.produto_id !== produtoId));
    }
  };

  const valorTotal = carrinho.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);

  const finalizarVenda = () => {
    if (carrinho.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    criarVendaMutation.mutate({
      clinica_id: clinicaId,
      paciente_id: contato.id,
      paciente_nome: contato.nome_completo,
      itens: carrinho.map(item => ({
        ...item,
        subtotal: item.quantidade * item.preco_unitario
      })),
      valor_total: valorTotal,
      desconto: 0,
      valor_final: valorTotal,
      forma_pagamento: "dinheiro",
      status_pagamento: "pendente",
      data_venda: new Date().toISOString().split('T')[0]
    });
  };

  if (!isOpen) return null;

  // MOBILE: Fullscreen
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto">
        {/* HEADER MOBILE */}
        <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center justify-between" style={{ borderColor: '#e8eaed' }}>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">Marketplace</h2>
          <div className="relative">
            <ShoppingCart className="w-5 h-5" style={{ color: '#7E57FF' }} />
            {carrinho.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {carrinho.length}
              </span>
            )}
          </div>
        </div>

        {/* CONTENT MOBILE */}
        <div className="p-4 space-y-4">
          {/* BUSCA */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-10"
            />
          </div>

          {/* LISTA PRODUTOS */}
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : (
            <div className="space-y-3">
              {produtosFiltrados.map(produto => {
                const noCarrinho = carrinho.find(i => i.produto_id === produto.id);
                return (
                  <div key={produto.id} className="bg-white border rounded-xl p-4" style={{ borderColor: '#e8eaed' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{produto.nome}</h3>
                        <p className="text-xs text-gray-600">{produto.tipo}</p>
                      </div>
                      <p className="font-bold text-green-600 text-sm">
                        R$ {(produto.preco_base || 0).toFixed(2)}
                      </p>
                    </div>
                    {noCarrinho ? (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => removerDoCarrinho(produto.id)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-bold">{noCarrinho.quantidade}</span>
                        <Button size="sm" variant="outline" onClick={() => adicionarAoCarrinho(produto)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => adicionarAoCarrinho(produto)} className="w-full">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER STICKY MOBILE */}
        {carrinho.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold text-green-600">R$ {valorTotal.toFixed(2)}</span>
            </div>
            <Button
              onClick={finalizarVenda}
              disabled={criarVendaMutation.isPending}
              className="w-full"
            >
              {criarVendaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar Venda"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // DESKTOP/TABLET: Modal 70%
  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e8eaed' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#202124' }}>Marketplace</h2>
            <p className="text-sm text-gray-600">{contato.nome_completo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* PRODUTOS (2/3) */}
            <div className="col-span-2 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produtos ou serviços..."
                  className="pl-10"
                />
              </div>

              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-white border rounded-xl p-4 hover:border-purple-300 transition-all text-left"
                      style={{ borderColor: '#e8eaed' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm mb-1">{produto.nome}</h3>
                          <p className="text-xs text-gray-600">{produto.tipo}</p>
                        </div>
                      </div>
                      <p className="font-bold text-green-600 text-lg">
                        R$ {(produto.preco_base || 0).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CARRINHO (1/3) */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: '#7E57FF' }} />
                Carrinho ({carrinho.length})
              </h3>
              {carrinho.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Carrinho vazio</p>
              ) : (
                <div className="space-y-3">
                  {carrinho.map(item => (
                    <div key={item.produto_id} className="bg-white rounded-lg p-3 border" style={{ borderColor: '#e8eaed' }}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium flex-1">{item.produto}</h4>
                        <button onClick={() => setCarrinho(carrinho.filter(i => i.produto_id !== item.produto_id))}>
                          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => removerDoCarrinho(item.produto_id)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold text-sm">{item.quantidade}</span>
                          <Button size="sm" variant="outline" onClick={() => adicionarAoCarrinho({ id: item.produto_id, nome: item.produto, preco_base: item.preco_unitario })}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-bold text-green-600">
                          R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        {carrinho.length > 0 && (
          <div className="border-t p-6" style={{ borderColor: '#e8eaed' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {valorTotal.toFixed(2)}</p>
              </div>
              <Button
                onClick={finalizarVenda}
                disabled={criarVendaMutation.isPending}
                size="lg"
              >
                {criarVendaMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finalizar Venda"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}