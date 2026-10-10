import React from "react";
import { Inbox } from "lucide-react";

export default function TicketStatsBar({ stats, filtroAtivo, onFiltroChange }) {
  const statItems = [
    { label: 'Abertos', value: stats.abertos, icon: Inbox, color: '#ea4335', bg: '#fde7e7', status: 'aberto' },
    { label: 'Em Andamento', value: stats.andamento, icon: Inbox, color: '#fbbc04', bg: '#fef9e5', status: 'em_andamento' },
    { label: 'Resolvidos', value: stats.resolvidos, icon: Inbox, color: '#34a853', bg: '#e6f7ed', status: 'resolvido' },
    { label: 'Total', value: stats.total, icon: Inbox, color: '#7E57FF', bg: '#f5f3ff', status: 'todos' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {statItems.map((stat, idx) => {
        const isActive = filtroAtivo === stat.status;
        return (
          <button
            key={idx}
            onClick={() => onFiltroChange(stat.status)}
            className={`p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-white transition-all active:scale-95 ${isActive ? 'ring-2' : ''}`}
            style={{ 
              border: '1px solid #e8eaed', 
              boxShadow: isActive ? '0 4px 12px rgba(126,87,255,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
              ringColor: isActive ? stat.color : 'transparent'
            }}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: stat.color }} />
              </div>
              <div className="text-left">
                <p className="text-[10px] lg:text-xs font-medium" style={{ color: '#5f6368' }}>{stat.label}</p>
                <p className="text-2xl lg:text-3xl font-bold" style={{ color: '#202124' }}>{stat.value}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}