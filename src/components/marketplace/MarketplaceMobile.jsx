import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Upload,
  ChevronRight,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function MarketplaceMobile({ paciente, onClose }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("produtos");
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [pixQrCode, setPixQrCode] = useState(null);
  const [comprovante, setComprovante] = useState(null);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-marketplace"],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, "-created_date", 100),
    staleTime: 10 * 60 * 1000
  });

  const criarVendaMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('criarVenda', payload),
    onSuccess: async (res) => {
      await base44.functions.invoke('gerarFatura', {
        venda_id: res.data.venda_id,
        paciente_id: paciente.id,
        forma_pagamento: formaPagamento,
        pix_qrcode_url: pixQrCode,
        comprovante_url: comprovante
      });
      queryClient.invalidateQueries();
      setView("sucesso");
      toast.success("✅ Venda finalizada!");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Erro")
  });

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase());
      const matchFiltro = filtro === "todos" || p.tipo === filtro;
      return matchBusca && matchFiltro;
    });
  }, [produtos, busca, filtro]);

  const adicionarCarrinho = (p) => {
    const existe = carrinho.find(i => i.produto_id === p.id);
    if (existe) {
      setCarrinho(carrinho.map(i => i.produto_id === p.id ? {...i, quantidade: i.quantidade + 1} : i));
    } else {
      setCarrinho([...carrinho, {produto_id: p.id, produto: p.nome, preco_unitario: p.preco_base, quantidade: 1}]);
    }
    toast.success("➕ Adicionado");
  };

  const ajustarQtd = (id, delta) => {
    setCarrinho(carrinho.map(i => i.produto_id === id ? {...i, quantidade: Math.max(1, i.quantidade + delta)} : i));
  };

  const remover = (id) => {
    setCarrinho(carrinho.filter(i => i.produto_id !== id));
  };

  const subtotal = carrinho.reduce((a, i) => a + i.preco_unitario * i.quantidade, 0);
  const total = subtotal - desconto;
  const qtdTotal = carrinho.reduce((a, i) => a + i.quantidade, 0);

  const finalizar = () => {
    if (!carrinho.length) return toast.error("Carrinho vazio");
    if (formaPagamento === "pix" && !comprovante) return toast.error("Anexe comprovante PIX");
    
    criarVendaMutation.mutate({
      paciente_id: paciente.id,
      paciente_nome: paciente.nome_completo,
      produtos: carrinho,
      desconto,
      forma_pagamento: formaPagamento
    });
  };

  const uploadArq = async (file, tipo) => {
    try {
      const {data} = await base44.integrations.Core.UploadFile({file});
      if (tipo === 'qr') setPixQrCode(data.file_url);
      else setComprovante(data.file_url);
      toast.success("✓");
    } catch {
      toast.error("Erro upload");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={view === "produtos" ? onClose : () => setView("produtos")} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">
            {view === "produtos" ? "Produtos" : view === "carrinho" ? "Carrinho" : view === "checkout" ? "Pagamento" : "Sucesso"}
          </h1>
        </div>
        {view === "produtos" && (
          <button onClick={() => setView("carrinho")} className="relative">
            <ShoppingCart className="w-6 h-6" />
            {qtdTotal > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {qtdTotal}
              </span>
            )}
          </button>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <AnimatePresence mode="wait">
          {view === "produtos" && (
            <motion.div key="prod" initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} exit={{x:20,opacity:0}} className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 rounded-full border-2 bg-white" />
              </div>
              <Select value={filtro} onValueChange={setFiltro}>
                <SelectTrigger className="h-11 rounded-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{zIndex:999999}}>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="medicamento">Medicamentos</SelectItem>
                  <SelectItem value="servico">Serviços</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                {produtosFiltrados.map(p => (
                  <motion.button key={p.id} whileTap={{scale:0.95}} onClick={()=>adicionarCarrinho(p)} className="bg-white rounded-2xl overflow-hidden shadow-sm border-2 border-gray-100 text-left">
                    <div className="aspect-square bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center text-4xl">
                      {p.tipo==='medicamento'?'💊':p.tipo==='servico'?'⚕️':'📦'}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm line-clamp-2 mb-1">{p.nome}</h3>
                      <p className="text-lg font-bold text-purple-600">R$ {p.preco_base.toFixed(2)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {view === "carrinho" && (
            <motion.div key="carr" initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} exit={{x:20,opacity:0}} className="p-4 space-y-3">
              {carrinho.length===0 ? (
                <div className="text-center py-20">
                  <ShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Carrinho vazio</p>
                </div>
              ) : (
                <>
                  {carrinho.map(i => (
                    <div key={i.produto_id} className="bg-white rounded-xl p-4 flex gap-3 shadow-sm">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm mb-1">{i.produto}</h3>
                        <p className="text-xs text-gray-600">R$ {i.preco_unitario.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>ajustarQtd(i.produto_id,-1)} className="w-8 h-8 rounded-full bg-gray-100">
                          <Minus className="w-4 h-4 mx-auto" />
                        </button>
                        <span className="w-6 text-center font-bold">{i.quantidade}</span>
                        <button onClick={()=>ajustarQtd(i.produto_id,1)} className="w-8 h-8 rounded-full bg-purple-600 text-white">
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                        <button onClick={()=>remover(i.produto_id)} className="ml-2 text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-white rounded-xl p-4 space-y-2 shadow-sm">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Desconto</span>
                      <input type="number" value={desconto} onChange={e=>setDesconto(parseFloat(e.target.value)||0)} className="w-20 text-right border rounded px-2 py-1" step="0.01"/>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-purple-600 pt-2 border-t-2">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {view === "checkout" && (
            <motion.div key="check" initial={{x:-20,opacity:0}} animate={{x:0,opacity:1}} exit={{x:20,opacity:0}} className="p-4 space-y-4">
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-bold mb-3">Pagamento</h3>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{zIndex:999999}}>
                    <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                    <SelectItem value="debito">💳 Débito</SelectItem>
                    <SelectItem value="credito">💳 Crédito</SelectItem>
                    <SelectItem value="pix">📱 PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formaPagamento === "pix" && (
                <div className="bg-purple-50 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold">PIX</h3>
                  <input type="file" id="qr" accept="image/*" onChange={e=>uploadArq(e.target.files[0],'qr')} className="hidden" />
                  <label htmlFor="qr" className="block bg-white border-2 rounded-xl p-4 text-center cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    {pixQrCode ? "✓ QR Code OK" : "Carregar QR Code"}
                  </label>
                  <input type="file" id="comp" accept="image/*,application/pdf" onChange={e=>uploadArq(e.target.files[0],'comp')} className="hidden" />
                  <label htmlFor="comp" className="block bg-white border-2 rounded-xl p-4 text-center cursor-pointer">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    {comprovante ? "✓ Comprovante OK" : "Anexar Comprovante"}
                  </label>
                </div>
              )}

              <div className="bg-purple-100 rounded-xl p-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-purple-600">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {view === "sucesso" && (
            <motion.div key="ok" initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
                <Check className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Concluído!</h2>
              <p className="text-gray-600 mb-6 text-center">Fatura gerada e enviada</p>
              <Button onClick={onClose} className="w-full max-w-xs">Fechar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER AÇÕES */}
      {view === "carrinho" && carrinho.length > 0 && (
        <div className="bg-white border-t-2 p-4 shadow-2xl">
          <Button onClick={()=>setView("checkout")} className="w-full h-14 text-lg font-bold bg-purple-600">
            Continuar <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
      {view === "checkout" && (
        <div className="bg-white border-t-2 p-4 shadow-2xl">
          <Button onClick={finalizar} disabled={criarVendaMutation.isLoading} className="w-full h-14 text-lg font-bold bg-purple-600">
            {criarVendaMutation.isLoading ? "Processando..." : "Finalizar Venda"}
          </Button>
        </div>
      )}
    </div>
  );
}