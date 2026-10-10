import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  DollarSign, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

export default function SidebarDrillDown({ contatoId }) {
  const [expandedCard, setExpandedCard] = useState(null);

  // QUERIES OTIMIZADAS
  const { data: prontuarios = [], isLoading: loadingProntuarios } = useQuery({
    queryKey: ["prontuarios", contatoId],
    queryFn: () => base44.entities.Prontuario.filter({ paciente_id: contatoId }, "-data_atendimento", 50),
    staleTime: 10 * 60 * 1000
  });

  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useQuery({
    queryKey: ["agendamentos", contatoId],
    queryFn: () => base44.entities.Agendamento.filter({ paciente_id: contatoId }, "-data", 100),
    staleTime: 10 * 60 * 1000
  });

  const { data: documentos = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documentos", contatoId],
    queryFn: () => base44.entities.DocumentoPaciente.filter({ paciente_id: contatoId }, "-created_date", 50),
    staleTime: 10 * 60 * 1000
  });

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["tickets", contatoId],
    queryFn: () => base44.entities.Ticket.filter({ contato_id: contatoId }, "-created_date"),
    staleTime: 2 * 60 * 1000
  });

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ["vendas", contatoId],
    queryFn: () => base44.entities.Venda.filter({ paciente_id: contatoId }, "-data_venda", 100),
    staleTime: 5 * 60 * 1000
  });

  // CÁLCULOS
  const hoje = new Date();
  const proximaConsulta = agendamentos.find(a => new Date(a.data) >= hoje && a.status !== "cancelado");
  const ultimoAtendimento = prontuarios[0];
  const ticketsAbertos = tickets.filter(t => t.status === "aberto" || t.status === "em_andamento").length;
  const totalVendas = vendas.reduce((sum, v) => sum + (v.valor_final || 0), 0);

  // Dados para gráfico (últimos 6 meses)
  const vendasChart = vendas.slice(0, 6).reverse().map(v => ({
    mes: format(new Date(v.data_venda), 'MMM'),
    valor: v.valor_final
  }));

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const isLoading = loadingProntuarios || loadingAgendamentos || loadingDocs || loadingTickets || loadingVendas;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="pc-card p-4 animate-pulse">
            <div className="h-4 rounded w-1/2 mb-3" style={{ backgroundColor: 'var(--pc-gray-200)' }} />
            <div className="h-20 rounded" style={{ backgroundColor: 'var(--pc-gray-100)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* VISÃO GERAL - Grid 2x2 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold mb-3 uppercase flex items-center gap-2" style={{ fontSize: '12px', color: '#5f6368', letterSpacing: '0.5px' }}>
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#7E57FF' }} />
          Visão Geral
        </h3>
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <div>
            <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Prontuários</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{prontuarios.length}</p>
          </div>
          <div>
            <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Consultas</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{agendamentos.length}</p>
          </div>
          <div>
            <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Documentos</p>
            <p className="text-xl font-bold" style={{ color: '#7E57FF' }}>{documentos.length}</p>
          </div>
          <div>
            <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Tickets</p>
            <p className="text-xl font-bold" style={{ color: ticketsAbertos > 0 ? '#ea4335' : '#34a853' }}>
              {tickets.length}
            </p>
          </div>
        </div>
      </div>

      {/* PRÓXIMA CONSULTA - Expandível */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <button 
          onClick={() => toggleCard('consulta')}
          className="w-full p-4 hover:bg-gray-50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#34a853' }} />
              <h3 className="font-bold uppercase" style={{ fontSize: '12px', color: '#5f6368', letterSpacing: '0.5px' }}>
                Próxima Consulta
              </h3>
            </div>
            {expandedCard === 'consulta' ? 
              <ChevronUp className="w-4 h-4" style={{ color: '#80868b' }} /> : 
              <ChevronDown className="w-4 h-4" style={{ color: '#80868b' }} />
            }
          </div>
          {!expandedCard && proximaConsulta && (
            <div className="mt-2">
              <p className="font-medium" style={{ fontSize: '14px', color: '#202124' }}>
                {format(new Date(proximaConsulta.data), "dd/MM/yyyy")} às {proximaConsulta.horario}
              </p>
            </div>
          )}
        </button>

        {expandedCard === 'consulta' && (
          <div className="p-4 pt-0 border-t" style={{ borderColor: '#e8eaed' }}>
            {proximaConsulta ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Data e Horário</p>
                  <p className="font-medium" style={{ fontSize: '14px', color: '#202124' }}>
                    {format(new Date(proximaConsulta.data), "dd/MM/yyyy")} às {proximaConsulta.horario}
                  </p>
                </div>
                {proximaConsulta.medico && (
                  <div>
                    <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Médico</p>
                    <p style={{ fontSize: '14px', color: '#5f6368' }}>Dr(a). {proximaConsulta.medico}</p>
                  </div>
                )}
                {proximaConsulta.especialidade && (
                  <div>
                    <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Especialidade</p>
                    <p style={{ fontSize: '14px', color: '#5f6368' }}>{proximaConsulta.especialidade.replace(/_/g, ' ')}</p>
                  </div>
                )}
                <Link to={`${createPageUrl("Agenda")}?paciente=${contatoId}`} className="block">
                  <button 
                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#f1f3f4', color: '#5f6368' }}
                  >
                    <Eye className="w-3 h-3" /> Ver todas consultas
                  </button>
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#5f6368' }}>Nenhuma consulta agendada</p>
            )}
          </div>
        )}
      </div>

      {/* ÚLTIMO ATENDIMENTO - Expandível */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <button 
          onClick={() => toggleCard('atendimento')}
          className="w-full p-4 hover:bg-gray-50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#7E57FF' }} />
              <h3 className="font-bold uppercase" style={{ fontSize: '12px', color: '#5f6368', letterSpacing: '0.5px' }}>
                Último Atendimento
              </h3>
            </div>
            {expandedCard === 'atendimento' ? 
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--pc-text-tertiary)' }} /> : 
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--pc-text-tertiary)' }} />
            }
          </div>
          {!expandedCard && ultimoAtendimento && (
            <div className="mt-2">
              <p className="pc-body-sm font-medium">
                {format(new Date(ultimoAtendimento.data_atendimento), "dd/MM/yyyy")}
              </p>
            </div>
          )}
        </button>

        {expandedCard === 'atendimento' && (
          <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--pc-border-primary)' }}>
            {ultimoAtendimento ? (
              <div className="space-y-3">
                <div>
                  <p className="pc-caption mb-1">Data</p>
                  <p className="pc-body-sm font-medium">
                    {format(new Date(ultimoAtendimento.data_atendimento), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <p className="pc-caption mb-1">Médico</p>
                  <p className="pc-body-sm">Dr(a). {ultimoAtendimento.medico_nome}</p>
                </div>
                {ultimoAtendimento.queixa_principal && (
                  <div>
                    <p className="pc-caption mb-1">Queixa Principal</p>
                    <p className="pc-body-sm line-clamp-3">{ultimoAtendimento.queixa_principal}</p>
                  </div>
                )}
                <Link to={`${createPageUrl("Prontuarios")}?paciente=${contatoId}`} className="block">
                  <button className="w-full pc-badge pc-badge-neutral justify-center gap-1 py-2">
                    <Eye className="w-3 h-3" /> Ver todos prontuários
                  </button>
                </Link>
              </div>
            ) : (
              <p className="pc-body-sm">Nenhum atendimento registrado</p>
            )}
          </div>
        )}
      </div>

      {/* FINANCEIRO - Expandível com Chart */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <button 
          onClick={() => toggleCard('financeiro')}
          className="w-full p-4 hover:bg-gray-50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: '#34a853' }} />
              <h3 className="font-bold uppercase" style={{ fontSize: '12px', color: '#5f6368', letterSpacing: '0.5px' }}>
                Financeiro
              </h3>
            </div>
            {expandedCard === 'financeiro' ? 
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--pc-text-tertiary)' }} /> : 
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--pc-text-tertiary)' }} />
            }
          </div>
          {!expandedCard && (
            <div className="mt-2">
              <p className="text-lg font-bold" style={{ color: '#34a853' }}>
                R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p style={{ fontSize: '12px', color: '#80868b' }}>Total em vendas</p>
            </div>
          )}
        </button>

        {expandedCard === 'financeiro' && (
          <div className="p-4 pt-0 border-t" style={{ borderColor: 'var(--pc-border-primary)' }}>
            {vendas.length > 0 ? (
              <div className="space-y-4">
                {/* MICRO GRÁFICO */}
                {vendasChart.length > 1 && (
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={vendasChart}>
                        <defs>
                          <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34a853" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#34a853" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e8eaed',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="valor" 
                          stroke="#34a853" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorVendas)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* TOTAL */}
                <div className="rounded-xl p-3" style={{ backgroundColor: '#e6f7ed' }}>
                  <p className="mb-1" style={{ fontSize: '12px', color: '#80868b' }}>Total Acumulado</p>
                  <p className="text-2xl font-bold" style={{ color: '#34a853' }}>
                    R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* ÚLTIMAS VENDAS */}
                <div>
                  <p className="font-bold mb-2" style={{ fontSize: '12px', color: '#5f6368' }}>Últimas Transações</p>
                  <div className="space-y-2">
                    {vendas.slice(0, 5).map(v => (
                      <div key={v.id} className="flex justify-between items-center py-2 border-b" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ fontSize: '14px', color: '#202124' }}>
                            {format(new Date(v.data_venda), "dd/MM/yyyy")}
                          </p>
                          <p style={{ fontSize: '12px', color: '#80868b' }}>{v.forma_pagamento}</p>
                        </div>
                        <p className="font-bold" style={{ fontSize: '14px', color: '#34a853' }}>
                          R$ {v.valor_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to={`${createPageUrl("Financeiro")}?contato=${contatoId}`} className="block">
                  <button className="w-full pc-badge pc-badge-neutral justify-center gap-1 py-2">
                    <Eye className="w-3 h-3" /> Ver detalhes financeiros
                  </button>
                </Link>
              </div>
            ) : (
              <p className="pc-body-sm">Sem movimentação financeira</p>
            )}
          </div>
        )}
      </div>

      {/* ALERTAS - Tickets */}
      {ticketsAbertos > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: '#ea4335', borderRight: '1px solid #e8eaed', borderTop: '1px solid #e8eaed', borderBottom: '1px solid #e8eaed', backgroundColor: '#fef2f2' }}>
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#ea4335' }} />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold mb-1" style={{ fontSize: '14px', color: '#ea4335' }}>
                Atenção Necessária
              </h4>
              <p style={{ fontSize: '12px', color: '#80868b' }}>
                {ticketsAbertos} ticket{ticketsAbertos > 1 ? 's' : ''} aguardando resposta
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}