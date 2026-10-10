import React from "react";
import { Search, Filter, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AtendimentoSearchBar({ 
  busca, 
  setBusca, 
  filtroAvancado, 
  setFiltroAvancado,
  filtros,
  setFiltros,
  equipe = [],
  onRefresh
}) {
  return (
    <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-white space-y-3" style={{ border: '1px solid #e8eaed' }}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5" style={{ color: '#9aa0a6' }} />
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 lg:pl-12 rounded-xl min-h-[44px] lg:min-h-[48px] border-gray-200 text-sm lg:text-base"
            style={{ backgroundColor: '#f8f9fa' }}
          />
        </div>
        <button
          onClick={() => setFiltroAvancado(!filtroAvancado)}
          className={`flex items-center justify-center gap-2 rounded-xl min-h-[44px] lg:min-h-[48px] px-4 border font-medium text-xs lg:text-sm transition-all ${filtroAvancado ? 'ring-2' : 'active:bg-gray-50'}`}
          style={{ 
            borderColor: filtroAvancado ? '#7E57FF' : '#e8eaed', 
            color: filtroAvancado ? '#7E57FF' : '#5f6368',
            backgroundColor: filtroAvancado ? '#f5f3ff' : 'transparent',
            ringColor: filtroAvancado ? '#7E57FF' : 'transparent'
          }}
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="rounded-xl min-w-[44px] min-h-[44px] lg:min-h-[48px] px-3 border font-medium text-xs lg:text-sm transition-all active:bg-gray-50 flex items-center justify-center"
          style={{ borderColor: '#e8eaed', color: '#5f6368' }}
          title="Atualizar tickets"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filtros Avançados */}
      {filtroAvancado && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 pt-3 border-t animate-fadeIn" style={{ borderColor: '#e8eaed' }}>
          <Select value={filtros.prioridade} onValueChange={(v) => setFiltros({ ...filtros, prioridade: v })}>
            <SelectTrigger className="rounded-lg lg:rounded-xl min-h-[40px] lg:min-h-[44px] border-gray-200 text-xs lg:text-sm" style={{ backgroundColor: '#f8f9fa' }}>
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Prioridades</SelectItem>
              <SelectItem value="baixa">🟢 Baixa</SelectItem>
              <SelectItem value="media">🟡 Média</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="urgente">🔴 Urgente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.categoria} onValueChange={(v) => setFiltros({ ...filtros, categoria: v })}>
            <SelectTrigger className="rounded-xl min-h-[44px] border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Categorias</SelectItem>
              <SelectItem value="suporte_tecnico">🛠️ Suporte</SelectItem>
              <SelectItem value="agendamento">📅 Agendamento</SelectItem>
              <SelectItem value="financeiro">💰 Financeiro</SelectItem>
              <SelectItem value="duvida">❓ Dúvida</SelectItem>
              <SelectItem value="reclamacao">⚠️ Reclamação</SelectItem>
              <SelectItem value="outro">📋 Outro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.responsavel} onValueChange={(v) => setFiltros({ ...filtros, responsavel: v })}>
            <SelectTrigger className="rounded-xl min-h-[44px] border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Responsáveis</SelectItem>
              {equipe.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtros.canal} onValueChange={(v) => setFiltros({ ...filtros, canal: v })}>
            <SelectTrigger className="rounded-xl min-h-[44px] border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Canais</SelectItem>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
              <SelectItem value="widget">🌐 Widget</SelectItem>
              <SelectItem value="interno">🏢 Interno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}