import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ShoppingCart,
  Calendar,
  Clock,
  DollarSign,
  Package,
  Search,
  Loader2
} from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

/**
 * CATÁLOGO PÚBLICO - Portal Paciente
 * 
 * Lista produtos/serviços ativos para agendamento
 * CTA: "Agendar" → redireciona Agenda com serviço pré-selecionado
 * Ganho: conversão orgânica, self-service
 */

export default function CatalogoServicos() {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Fetch produtos/serviços ativos (público) - CACHE AGRESSIVO
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["catalogo-publico"],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }, "-created_date", 100),
    staleTime: 10 * 60 * 1000, // 10min
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const produtosFiltrados = useMemo(() => {
    return produtos
      .filter(p => filtroTipo === "todos" || p.tipo === filtroTipo)
      .filter(p => filtroCategoria === "todos" || p.categoria === filtroCategoria)
      .filter(p =>
        p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(busca.toLowerCase())
      );
  }, [produtos, filtroTipo, filtroCategoria, busca]);

  const categorias = useMemo(() => {
    const cats = new Set();
    produtos.forEach(p => p.categoria && cats.add(p.categoria));
    return Array.from(cats);
  }, [produtos]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#202124' }}>
          Produtos e Serviços
        </h2>
        <p style={{ color: '#5f6368', fontSize: '16px' }}>
          Conheça nossos tratamentos e agende sua consulta
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchBar
            value={busca}
            onChange={setBusca}
            placeholder="Buscar serviço..."
          />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-full min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="servico">Serviços</SelectItem>
              <SelectItem value="tratamento">Tratamentos</SelectItem>
              <SelectItem value="exame">Exames</SelectItem>
              <SelectItem value="procedimento">Procedimentos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-full min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="todos">Todas Categorias</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Serviços */}
      {produtosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border" style={{ borderColor: '#e8eaed' }}>
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Nenhum serviço encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.map((produto, idx) => (
            <motion.div
              key={produto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all overflow-hidden"
              style={{ borderColor: '#e8eaed' }}
            >
              <div className="p-6">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f5f3ff' }}>
                  <ShoppingCart className="w-7 h-7" style={{ color: '#7E57FF' }} />
                </div>
                
                <h3 className="text-xl font-bold mb-2" style={{ color: '#202124' }}>
                  {produto.nome}
                </h3>
                
                <p className="text-sm mb-4 line-clamp-2" style={{ color: '#5f6368' }}>
                  {produto.descricao || 'Sem descrição'}
                </p>

                <div className="space-y-2 mb-4">
                  {produto.duracao && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5f6368' }}>
                      <Clock className="w-4 h-4" />
                      <span>{produto.duracao}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      R$ {produto.preco_base.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f5f3ff', color: '#7E57FF' }}>
                    {produto.tipo}
                  </span>
                  {produto.categoria && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f8f9fa', color: '#5f6368' }}>
                      {produto.categoria}
                    </span>
                  )}
                </div>

                <Link
                  to={createPageUrl(`Agenda?servico=${encodeURIComponent(produto.nome)}`)}
                  className="block w-full text-center py-3 rounded-xl font-bold text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#7E57FF' }}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Agendar Consulta
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}