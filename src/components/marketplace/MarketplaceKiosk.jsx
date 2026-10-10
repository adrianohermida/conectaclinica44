import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  Package,
  CheckCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchBar from "@/components/ui/SearchBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MARKETPLACE KIOSK - Modal de venda rápida
 * 
 * Fluxo:
 * 1. Exibir produtos ativos do catálogo
 * 2. Adicionar ao carrinho
 * 3. Checkout → chama criarVenda backend
 * 4. Atualiza estoque + gera ContaReceber automaticamente
 */

export default function MarketplaceKiosk({ paciente, onClose, onSuccess }) {
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [carrinho, setCarrinho] = useState([]);
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [checkoutConcluido, setCheckoutConcluido] = useState(false);
  const queryClient = useQueryClient();

  // Buscar produtos ativos - CACHE AGRESSIVO (10min)
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos-catalogo-marketplace"],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, "-created_date", 100),
    staleTime: 10 * 60 * 1000, // 10min cache
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Mutation de venda
  const vendaMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke('criarVenda', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["produtos-catalogo"]);
      queryClient.invalidateQueries(["vendas"]);
      queryClient.invalidateQueries(["produtos-estoque"]);
      setCheckoutConcluido(true);
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 2000);
    }
  });

  const produtosFiltrados = useMemo(() => {
    return produtos
      .filter(p => filtroCategoria === "todos" || p.categoria === filtroCategoria)
      .filter(p =>
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(busca.toLowerCase())
      );
  }, [produtos, filtroCategoria, busca]);

  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(i => i.produto_id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(i =>
        i.produto_id === produto.id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        preco_unitario: produto.preco_base,
        tipo: produto.tipo
      }]);
    }
  };

  const removerDoCarrinho = (produto_id) => {
    setCarrinho(carrinho.filter(i => i.produto_id !== produto_id));
  };

  const ajustarQuantidade = (produto_id, delta) => {
    setCarrinho(carrinho.map(i => {
      if (i.produto_id === produto_id) {
        const novaQtd = Math.max(1, i.quantidade + delta);
        return { ...i, quantidade: novaQtd };
      }
      return i;
    }));
  };

  const valorTotal = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
  }, [carrinho]);

  const valorFinal = valorTotal - desconto;

  const handleCheckout = () => {
    if (carrinho.length === 0) return;

    vendaMutation.mutate({
      paciente_id: paciente.id,
      paciente_nome: paciente.nome_completo,
      itens: carrinho.map(i => ({
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario
      })),
      desconto,
      forma_pagamento: formaPagamento
    });
  };

  if (checkoutConcluido) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 text-center max-w-md"
        >
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-2xl font-bold mb-2" style={{ color: '#202124' }}>
            Venda Concluída!
          </h3>
          <p style={{ color: '#5f6368' }}>
            Estoque atualizado e conta a receber gerada automaticamente.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">🛒 Marketplace</h2>
              <p className="text-purple-100">Paciente: {paciente.nome_completo}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Produtos */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4 space-y-3">
              <SearchBar
                value={busca}
                onChange={setBusca}
                placeholder="Buscar produto ou serviço..."
              />
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="todos">Todas Categorias</SelectItem>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="terapia_injetavel">Terapia Injetável</SelectItem>
                  <SelectItem value="ozonoterapia">Ozonoterapia</SelectItem>
                  <SelectItem value="vitamina">Vitamina</SelectItem>
                  <SelectItem value="suplemento">Suplemento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {produtosFiltrados.map(produto => (
                  <div
                    key={produto.id}
                    className="border rounded-xl p-4 hover:shadow-md transition-all"
                    style={{ borderColor: '#e8eaed' }}
                  >
                    <h4 className="font-bold mb-1" style={{ color: '#202124' }}>
                      {produto.nome}
                    </h4>
                    <p className="text-sm mb-2 line-clamp-2" style={{ color: '#5f6368' }}>
                      {produto.descricao}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold" style={{ color: '#34a853' }}>
                        R$ {produto.preco_base.toFixed(2)}
                      </span>
                      <button
                        onClick={() => adicionarAoCarrinho(produto)}
                        className="px-4 py-2 rounded-lg text-white font-bold hover:opacity-90 transition-all"
                        style={{ backgroundColor: '#7E57FF' }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          <div className="w-96 border-l bg-gray-50 p-6 flex flex-col">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#202124' }}>
              Carrinho ({carrinho.length})
            </h3>

            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {carrinho.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 text-sm">Carrinho vazio</p>
                </div>
              ) : (
                carrinho.map(item => (
                  <div
                    key={item.produto_id}
                    className="bg-white rounded-lg p-3 border"
                    style={{ borderColor: '#e8eaed' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm flex-1" style={{ color: '#202124' }}>
                        {item.produto_nome}
                      </p>
                      <button
                        onClick={() => removerDoCarrinho(item.produto_id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ajustarQuantidade(item.produto_id, -1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold w-8 text-center">{item.quantidade}</span>
                        <button
                          onClick={() => ajustarQuantidade(item.produto_id, 1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold" style={{ color: '#34a853' }}>
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totais */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <span style={{ color: '#5f6368' }}>Subtotal</span>
                <span className="font-bold">R$ {valorTotal.toFixed(2)}</span>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: '#5f6368' }}>Desconto (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: '#5f6368' }}>Forma Pagamento</label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ zIndex: 999999 }}>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span style={{ color: '#34a853' }}>R$ {valorFinal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={carrinho.length === 0 || vendaMutation.isPending}
                className="w-full py-3 rounded-xl text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#7E57FF' }}
              >
                {vendaMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Finalizar Venda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}