import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, Users, Calendar, FileText, Headphones, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * BUSCA GLOBAL - Componente de Header
 * Latência P95 < 500ms (backend otimizado)
 */
export default function BuscaGlobal({ user }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Debounce
  useEffect(() => {
    if (query.length < 2) {
      setResultados([]);
      setAberto(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const response = await base44.functions.invoke('buscaGlobal', { query, limit: 10 });
        setResultados(response.data.resultados || []);
        setAberto(true);
      } catch (error) {
        console.error('[BuscaGlobal] Erro:', error);
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(prev => Math.min(prev + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && focusIndex >= 0) {
      e.preventDefault();
      navegarPara(resultados[focusIndex]);
    } else if (e.key === 'Escape') {
      setAberto(false);
      inputRef.current?.blur();
    }
  };

  const navegarPara = (resultado) => {
    navigate(resultado.url);
    setQuery("");
    setResultados([]);
    setAberto(false);
    inputRef.current?.blur();
  };

  const getIconeTipo = (tipo) => {
    switch (tipo) {
      case 'paciente': return <Users className="w-4 h-4" style={{ color: '#7E57FF' }} />;
      case 'agendamento': return <Calendar className="w-4 h-4" style={{ color: '#0B7A9E' }} />;
      case 'prontuario': return <FileText className="w-4 h-4" style={{ color: '#34a853' }} />;
      case 'ticket': return <Headphones className="w-4 h-4" style={{ color: '#fbbc04' }} />;
      default: return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!user?.clinica_id) return null;

  return (
    <div className="flex-1 max-w-2xl mx-4 md:mx-8 hidden md:block relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setAberto(true)}
          placeholder="Pesquisar pacientes, agendamentos, prontuários..."
          className="w-full pl-9 pr-10 py-2 rounded-lg bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-[#7E57FF] focus:outline-none text-sm"
        />
        {buscando && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {query && !buscando && (
          <button
            onClick={() => {
              setQuery("");
              setResultados([]);
              setAberto(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Resultados */}
      <AnimatePresence>
        {aberto && resultados.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
          >
            <div className="max-h-96 overflow-y-auto">
              {resultados.map((resultado, idx) => (
                <button
                  key={`${resultado.tipo}-${resultado.id}`}
                  onClick={() => navegarPara(resultado)}
                  onMouseEnter={() => setFocusIndex(idx)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    idx === focusIndex ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#f5f3ff' }}>
                    {getIconeTipo(resultado.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-medium text-sm truncate" 
                      style={{ color: '#202124' }}
                      dangerouslySetInnerHTML={{ __html: resultado.destacado || resultado.titulo }}
                    />
                    <p className="text-xs truncate" style={{ color: '#80868b' }}>
                      {resultado.subtitulo}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#f8f9fa', color: '#5f6368' }}>
                    {resultado.tipo}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">
                Pressione <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↓</kbd> para navegar, <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Enter</kbd> para selecionar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      <AnimatePresence>
        {aberto && query.length >= 2 && resultados.length === 0 && !buscando && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 p-8 text-center z-50"
          >
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-600">Nenhum resultado encontrado para "{query}"</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}