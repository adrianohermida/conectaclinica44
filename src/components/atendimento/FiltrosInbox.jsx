import React from "react";
import { Inbox, Star, Clock, Archive, Trash2, AlertCircle, CheckCircle, User, Mail } from "lucide-react";

export default function FiltrosInbox({ filtroAtivo, setFiltroAtivo, stats, user }) {
  const filtros = [
    { 
      id: 'abertos_novos', 
      label: 'Meus tickets abertos e novos', 
      icon: Inbox, 
      color: '#1a73e8',
      count: stats.meusAbertosNovos || 0
    },
    { 
      id: 'criados_por_mim', 
      label: 'Tickets criados por mim', 
      icon: User, 
      color: '#34a853',
      count: stats.criadosPorMim || 0
    },
    { 
      id: 'todos', 
      label: 'Todos os tickets', 
      icon: Mail, 
      color: '#5f6368',
      count: stats.todos || 0
    },
    { 
      id: 'nao_resolvidos', 
      label: 'Todos os tickets não resolvidos', 
      icon: Clock, 
      color: '#fbbc04',
      count: stats.naoResolvidos || 0
    },
    { 
      id: 'aguardando', 
      label: 'Aguardando cliente', 
      icon: Clock, 
      color: '#f59e0b',
      count: stats.aguardando || 0
    },
    { 
      id: 'resolvido', 
      label: 'Resolvidos', 
      icon: CheckCircle, 
      color: '#34a853',
      count: stats.resolvidos || 0
    },
    { 
      id: 'arquivado', 
      label: 'Arquivados', 
      icon: Archive, 
      color: '#5f6368',
      count: stats.arquivados || 0
    }
  ];

  return (
    <div className="space-y-1 px-2">
      {filtros.map(filtro => {
        const isActive = filtroAtivo === filtro.id;
        const Icon = filtro.icon;
        
        return (
          <button
            key={filtro.id}
            onClick={() => setFiltroAtivo(filtro.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
              isActive ? '' : 'hover:bg-gray-100'
            }`}
            style={isActive ? {
              backgroundColor: '#f5f3ff',
              color: '#7E57FF',
              fontWeight: 600
            } : {
              color: '#5f6368'
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? '#7E57FF' : filtro.color }} />
            <span className="flex-1 text-sm truncate">{filtro.label}</span>
            {filtro.count > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? 'font-bold' : ''}`} style={{
                backgroundColor: isActive ? '#7E57FF' : '#f8f9fa',
                color: isActive ? 'white' : '#5f6368'
              }}>
                {filtro.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}