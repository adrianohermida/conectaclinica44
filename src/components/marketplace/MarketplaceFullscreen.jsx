import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Plus, Minus, Trash2, Check, ShoppingCart, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function MarketplaceFullscreen({ paciente, onClose }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("produtos");
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [desconto, setDesconto] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [uploadingPix, setUploadingPix] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-ativo"],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 5 * 60 * 1000
  });

  const criarVendaMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await base44.functions.invoke('criarVenda', payload);
      if (res.data.venda_id) {
        await base44.functions.invoke('gerarFatura', {
          venda_id: res.data.venda_id,
          paciente_id: paciente.id,
          forma_pagamento: formaPagamento
        });
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Venda concluída!");
      setTimeout(() => onClose(), 1500);
    }
  });

  const filtrados = useMemo(() => 
    produtos.filter(p => {
      const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = categoria === "todos" || p.tipo === categoria;
      return matchBusca && matchCategoria;
    }), [produtos, busca, categoria]
  );

  const adicionar = (p) => {
    const existe = carrinho.find(i => i.produto_id === p.id);
    if (existe) {
      setCarrinho(carrinho.map(i => i.produto_id === p.id ? {...i, quantidade: i.quantidade + 1} : i));
    } else {
      setCarrinho([...carrinho, {produto_id: p.id, produto: p.nome, preco_unitario: p.preco_base, quantidade: 1}]);
    }
  };

  const ajustar = (id, delta) => {
    setCarrinho(carrinho.map(i => i.produto_id === id ? {...i, quantidade: Math.max(1, i.quantidade + delta)} : i).filter(i => i.quantidade > 0));
  };

  const remover = (id) => setCarrinho(carrinho.filter(i => i.produto_id !== id));

  const subtotal = carrinho.reduce((a, i) => a + i.preco_unitario * i.quantidade, 0);
  const total = Math.max(0, subtotal - desconto);
  const qtd = carrinho.reduce((a, i) => a + i.quantidade, 0);

  const uploadPix = async (file) => {
    if (!file) return;
    setUploadingPix(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast.success("Comprovante anexado");
    } catch {
      toast.error("Erro ao anexar");
    } finally {
      setUploadingPix(false);
    }
  };

  const finalizar = () => {
    if (!carrinho.length) return toast.error("Carrinho vazio");
    
    criarVendaMutation.mutate({
      paciente_id: paciente.id,
      paciente_nome: paciente.nome_completo,
      produtos: carrinho.map(i => ({...i, subtotal: i.preco_unitario * i.quantidade})),
      desconto,
      forma_pagamento: formaPagamento
    });
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-white flex flex-col">
      {/* HEADER FIXO */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={view==="produtos"?onClose:()=>setView(view==="checkout"?"carrinho":"produtos")} className="p-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-xl">
            {view==="produtos"?"Produtos":view==="carrinho"?"Carrinho":"Pagamento"}
          </h1>
        </div>
        {view === "produtos" && qtd > 0 && (
          <button onClick={()=>setView("carrinho")} className="relative p-2">
            <ShoppingCart className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{qtd}</span>
          </button>
        )}
      </div>

      {/* CONTEÚDO SCROLLABLE */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50">
        <AnimatePresence mode="wait">
          {view === "produtos" && (
            <motion.div key="p" initial={{opacity:0}} animate={{opacity:1}} className="p-3 space-y-3">
              <div className="sticky top-0 bg-white rounded-2xl p-3 shadow-sm z-10 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produtos..." className="w-full pl-11 pr-4 py-3 rounded-xl border-2 text-base" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {["todos","medicamento","servico","procedimento","tratamento"].map(c => (
                    <button key={c} onClick={()=>setCategoria(c)} className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap ${categoria===c?'bg-purple-600 text-white':'bg-gray-100 text-gray-700'}`}>
                      {c==="todos"?"Todos":c.charAt(0).toUpperCase()+c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pb-24">
                {filtrados.map(p => (
                  <motion.button key={p.id} whileTap={{scale:0.97}} onClick={()=>adicionar(p)} className="bg-white rounded-2xl overflow-hidden shadow-sm active:shadow-md">
                    <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-5xl">
                      {p.tipo==='medicamento'?'💊':p.tipo==='servico'?'⚕️':p.tipo==='procedimento'?'🩺':'📦'}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm line-clamp-2 mb-2 min-h-[40px]">{p.nome}</h3>
                      <p className="text-xl font-bold text-purple-600">R$ {p.preco_base.toFixed(2)}</p>
                      {p.categoria && <p className="text-xs text-gray-500 mt-1">{p.categoria}</p>}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {view === "carrinho" && (
            <motion.div key="c" initial={{opacity:0}} animate={{opacity:1}} className="p-4 space-y-3 pb-32">
              {carrinho.length===0 ? (
                <div className="flex flex-col items-center justify-center py-32">
                  <ShoppingCart className="w-24 h-24 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Carrinho vazio</p>
                </div>
              ) : (
                <>
                  {carrinho.map(i => (
                    <div key={i.produto_id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold mb-1 truncate">{i.produto}</h3>
                        <p className="text-sm text-gray-600">R$ {i.preco_unitario.toFixed(2)} × {i.quantidade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={()=>ajustar(i.produto_id,-1)} className="w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200 flex items-center justify-center">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-lg">{i.quantidade}</span>
                        <button onClick={()=>ajustar(i.produto_id,1)} className="w-9 h-9 rounded-full bg-purple-600 text-white active:bg-purple-700 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={()=>remover(i.produto_id)} className="ml-2 p-2 text-red-500 active:bg-red-50 rounded-full">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="bg-white rounded-2xl p-5 shadow-md space-y-3">
                    <div className="flex justify-between text-lg">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Desconto</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">R$</span>
                        <input type="number" value={desconto} onChange={e=>setDesconto(parseFloat(e.target.value)||0)} className="w-24 text-right border-2 rounded-lg px-3 py-2 font-bold" step="0.01" min="0" />
                      </div>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-purple-600 pt-3 border-t-2">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {view === "checkout" && (
            <motion.div key="ch" initial={{opacity:0}} animate={{opacity:1}} className="p-4 space-y-4 pb-32">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {value:"dinheiro",label:"💵 Dinheiro"},
                    {value:"debito",label:"💳 Débito"},
                    {value:"credito",label:"💳 Crédito"},
                    {value:"pix",label:"📱 PIX"}
                  ].map(f => (
                    <button key={f.value} onClick={()=>setFormaPagamento(f.value)} className={`p-4 rounded-xl font-bold text-center transition-all ${formaPagamento===f.value?'bg-purple-600 text-white shadow-lg':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === "pix" && (
                <div className="bg-purple-50 rounded-2xl p-5 shadow-sm border-2 border-purple-200">
                  <h3 className="font-bold mb-3 text-purple-900">Comprovante PIX</h3>
                  <input type="file" id="pix-file" accept="image/*,application/pdf" onChange={e=>uploadPix(e.target.files[0])} className="hidden" />
                  <label htmlFor="pix-file" className="block bg-white border-2 border-dashed border-purple-300 rounded-xl p-6 text-center cursor-pointer active:bg-purple-50">
                    <Upload className="w-10 h-10 mx-auto mb-2 text-purple-600" />
                    <p className="font-bold text-purple-900">{uploadingPix?"Enviando...":"Anexar Comprovante"}</p>
                    <p className="text-xs text-purple-700 mt-1">JPG, PNG ou PDF</p>
                  </label>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center text-3xl font-bold">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER FIXO */}
      {view === "carrinho" && carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-purple-200 p-4 shadow-2xl z-50">
          <Button onClick={()=>setView("checkout")} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg active:shadow-none">
            Continuar <ChevronRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      )}
      {view === "checkout" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-purple-200 p-4 shadow-2xl z-50">
          <Button onClick={finalizar} disabled={criarVendaMutation.isPending} className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 shadow-lg active:shadow-none">
            {criarVendaMutation.isPending ? "Processando..." : `Finalizar - R$ ${total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}