import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Calendar, 
  FileText, 
  MessageSquare, 
  Clock,
  TrendingUp,
  Loader2,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PendenciasCard from "./PendenciasCard";
import NotasCardAvancado from "./NotasCardAvancado";
import UltimoAtendimentoCard from "./UltimoAtendimentoCard";

export default function ContactSidebar({ contatoId, metricas, contato, isMobile }) {
  // ZERO QUERIES - tudo vem do agregador
  const isLoading = !metricas;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* VISÃO GERAL - Grid compacto */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="text-xs font-bold mb-3 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          Visão Geral
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Prontuários</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{metricas?.prontuarios_count || 0}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Consultas</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{metricas?.agendamentos_count || 0}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Documentos</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{metricas?.documentos_count || 0}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Tickets</p>
            <p className="text-xl font-bold" style={{ color: (metricas?.tickets_abertos || 0) > 0 ? '#ea4335' : '#34a853' }}>
              {metricas?.tickets_count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* PRÓXIMA CONSULTA */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
            <Calendar className="w-3.5 h-3.5" />
            Próxima Consulta
          </h3>
          {(metricas?.agendamentos_count || 0) > 0 && (
            <Link
              to={`${createPageUrl("Agenda")}?paciente_id=${contatoId}`}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#7E57FF' }}
            >
              Ver todas ({metricas.agendamentos_count})
            </Link>
          )}
        </div>
        {metricas?.proxima_consulta ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3.5 h-3.5" style={{ color: '#80868b' }} />
              <span style={{ color: '#202124', fontWeight: 500 }}>
                {format(new Date(metricas.proxima_consulta.data), "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-3.5 h-3.5" style={{ color: '#80868b' }} />
              <span style={{ color: '#202124', fontWeight: 500 }}>{metricas.proxima_consulta.horario}</span>
            </div>
            {metricas.proxima_consulta.medico && (
              <p className="text-xs" style={{ color: '#5f6368' }}>
                Dr(a). {metricas.proxima_consulta.medico}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#80868b' }}>Nenhuma consulta agendada</p>
        )}
      </div>

      {/* HISTÓRICO DE ATENDIMENTOS (expandido) */}
      <UltimoAtendimentoCard 
        contatoId={contatoId} 
        ultimoProntuario={metricas?.ultimo_prontuario}
        isMobile={isMobile}
      />

      {/* FINANCEIRO */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="text-xs font-bold mb-3 flex items-center gap-2 uppercase" style={{ color: '#80868b', letterSpacing: '0.5px' }}>
          <DollarSign className="w-3.5 h-3.5" />
          Financeiro
        </h3>
        {(metricas?.total_vendas || 0) > 0 ? (
          <div>
            <p className="text-xs mb-1" style={{ color: '#5f6368' }}>Total em Vendas</p>
            <p className="text-lg font-bold" style={{ color: '#34a853' }}>
              R$ {(metricas.total_vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Link 
              to={createPageUrl("Financeiro")} 
              className="text-xs font-medium inline-flex items-center gap-1 mt-2 hover:underline"
              style={{ color: '#7E57FF' }}
            >
              Ver Detalhes →
            </Link>
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#80868b' }}>Nenhuma movimentação financeira</p>
        )}
      </div>

      {/* ALERTAS - Tickets Abertos */}
      {(metricas?.tickets_abertos || 0) > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 border-l-4" style={{ borderColor: '#ea4335' }}>
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#ea4335' }} />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold mb-1" style={{ color: '#ea4335' }}>
                Atenção Necessária
              </h4>
              <p className="text-xs" style={{ color: '#5f6368' }}>
                {metricas.tickets_abertos} ticket{metricas.tickets_abertos > 1 ? 's' : ''} aguardando resposta
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PENDÊNCIAS */}
      <PendenciasCard contatoId={contatoId} />

      {/* NOTAS AVANÇADO */}
      <NotasCardAvancado contato={contato} />

      {/* MARKETPLACE BUTTON */}
      <button
        onClick={() => {/* Será conectado no PacienteDetalhes */}}
        className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 shadow-sm border hover:shadow-md transition-all w-full text-left min-h-[48px]"
        style={{ borderColor: '#e8eaed' }}
        data-marketplace-trigger="true"
        aria-label="Abrir marketplace de produtos e serviços"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#7E57FF' }}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold mb-0.5" style={{ color: '#202124' }}>Marketplace</h4>
            <p className="text-xs" style={{ color: '#5f6368' }}>Vender produtos/serviços</p>
          </div>
        </div>
      </button>
    </div>
  );
}