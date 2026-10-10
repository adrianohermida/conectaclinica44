import React from "react";
import { Mail, Phone, UserCircle, Lock, ExternalLink, StickyNote, CheckCircle, AlertCircle, Clock, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { formatarDataLocal } from "@/components/hooks/useUserTimezone";

export default function TicketDetailsSidebar({ 
  ticket,
  contato,
  equipe = [],
  notasInternas = [],
  statusEmails = [],
  mensagens = [],
  notaInterna,
  setNotaInterna,
  tipoNota,
  setTipoNota,
  onStatusChange,
  onPrioridadeChange,
  onResponsavelChange,
  onAdicionarNota,
  onAbrirContato,
  adicionandoNota,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div className="hidden lg:block lg:col-span-3 p-5 rounded-2xl bg-white max-h-[600px] overflow-y-auto" style={{ border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 className="font-bold text-base mb-5 pb-3 border-b" style={{ color: '#202124', borderColor: '#e8eaed' }}>Detalhes</h3>

      {/* Status */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-2" style={{ color: '#5f6368' }}>Status</label>
        <Select 
          value={ticket.status} 
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando">Aguardando (fila IA)</SelectItem>
            <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
            <SelectItem value="respondido_ia">Respondido pela IA</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prioridade */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-2" style={{ color: '#5f6368' }}>Prioridade</label>
        <Select 
          value={ticket.prioridade} 
          onValueChange={onPrioridadeChange}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Responsável */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-2" style={{ color: '#5f6368' }}>Responsável</label>
        <Select 
          value={ticket.atribuido_a || "ninguem"} 
          onValueChange={onResponsavelChange}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue placeholder="Não atribuído" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ninguem">Não atribuído</SelectItem>
            {equipe.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contato */}
      <div className="mb-5 pb-5 border-b" style={{ borderColor: '#e8eaed' }}>
        <label className="block text-xs font-semibold mb-2" style={{ color: '#5f6368' }}>Contato</label>
        {contato ? (
          <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: '#f5f3ff' }}>
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-4 h-4" style={{ color: '#6d28d9' }} />
              <span className="text-sm font-semibold" style={{ color: '#4c1d95' }}>{contato.nome_completo}</span>
            </div>
            <p className="text-xs" style={{ color: '#6d28d9' }}>Tipo: {contato.tipo_contato}</p>
            <button
              onClick={onAbrirContato}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-purple-100"
              style={{ color: '#6d28d9' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Detalhes Completos
            </button>
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: '#9aa0a6' }}>Nenhum contato vinculado</p>
        )}
      </div>

      {/* Contato Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4" style={{ color: '#9aa0a6' }} />
          <span className="text-xs" style={{ color: '#5f6368' }}>{ticket.solicitante_email}</span>
        </div>
        {ticket.solicitante_telefone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4" style={{ color: '#9aa0a6' }} />
            <span className="text-xs" style={{ color: '#5f6368' }}>{ticket.solicitante_telefone}</span>
          </div>
        )}
      </div>

      {/* Notas Internas */}
      <div className="mt-5 pt-5 border-t" style={{ borderColor: '#e8eaed' }}>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#5f6368' }}>
          <Lock className="w-4 h-4" />
          Notas Privadas ({notasInternas.length})
        </h4>
        
        {/* Form Nota */}
        <div className="mb-3 space-y-2">
          <Select value={tipoNota} onValueChange={setTipoNota}>
            <SelectTrigger className="rounded-lg text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="observacao">📝 Observação</SelectItem>
              <SelectItem value="contexto">💡 Contexto</SelectItem>
              <SelectItem value="alerta">⚠️ Alerta</SelectItem>
              <SelectItem value="decisao">✅ Decisão</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Nota privada (visível apenas equipe)..."
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
            className="rounded-lg text-xs resize-none border-gray-200"
            rows={2}
          />
          <button
            onClick={onAdicionarNota}
            disabled={!notaInterna.trim() || adicionandoNota}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}
          >
            <StickyNote className="w-3.5 h-3.5" />
            {adicionandoNota ? 'Salvando...' : 'Adicionar Nota'}
          </button>
        </div>

        {/* Lista Notas */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {notasInternas.map(nota => {
            const tipoConfig = {
              contexto: { icon: '💡', bg: '#e0f2fe', color: '#075985' },
              alerta: { icon: '⚠️', bg: '#fef9e5', color: '#854d0e' },
              decisao: { icon: '✅', bg: '#e6f7ed', color: '#137333' },
              observacao: { icon: '📝', bg: '#f8f9fa', color: '#5f6368' }
            };
            const config = tipoConfig[nota.tipo] || tipoConfig.observacao;
            
            return (
              <div key={nota.id} className="p-2.5 rounded-lg border text-xs" style={{ 
                backgroundColor: config.bg, 
                borderColor: config.color + '40' 
              }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold flex items-center gap-1.5" style={{ color: config.color }}>
                    <span>{config.icon}</span>
                    {nota.autor_nome}
                  </span>
                  <span className="text-[10px]" style={{ color: '#9aa0a6' }} title={formatarDataLocal(nota.created_date, timezone, 'completo')}>
                    {format(new Date(nota.created_date), "dd/MM HH:mm")}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: '#202124' }}>{nota.conteudo}</p>
              </div>
            );
          })}
          {notasInternas.length === 0 && (
            <p className="text-[10px] text-center py-3 italic" style={{ color: '#9aa0a6' }}>
              Nenhuma nota interna
            </p>
          )}
        </div>
      </div>

      {/* Histórico Emails */}
      {(statusEmails.length > 0 || mensagens.some(m => m.email_headers)) && (
        <div className="mt-5 pt-5 border-t" style={{ borderColor: '#e8eaed' }}>
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: '#5f6368' }}>
            <Mail className="w-4 h-4" />
            Histórico de Emails
          </h4>
          
          <div className="space-y-3">
            {statusEmails.map(status => {
              const mensagemRelacionada = mensagens.find(m => m.id === status.mensagem_id);
              
              return (
                <div key={status.id} className="p-3 rounded-lg border space-y-2" style={{ 
                  backgroundColor: status.status_envio === 'entregue' || status.status_envio === 'aberto' ? '#e6f7ed' : 
                                   status.status_envio === 'falha' || status.status_envio === 'bounce' ? '#fde7e7' : '#f8f9fa',
                  borderColor: status.status_envio === 'entregue' || status.status_envio === 'aberto' ? '#b8e7ca' : 
                              status.status_envio === 'falha' || status.status_envio === 'bounce' ? '#f9b8b6' : '#e8eaed'
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status.status_envio === 'enviado' && <Clock className="w-3 h-3" style={{ color: '#fbbc04' }} />}
                      {(status.status_envio === 'entregue' || status.status_envio === 'aberto') && <CheckCircle className="w-3 h-3" style={{ color: '#34a853' }} />}
                      {(status.status_envio === 'falha' || status.status_envio === 'bounce') && <AlertCircle className="w-3 h-3" style={{ color: '#ea4335' }} />}
                      <span className="text-xs font-semibold capitalize" style={{ 
                        color: status.status_envio === 'entregue' || status.status_envio === 'aberto' ? '#137333' :
                               status.status_envio === 'falha' || status.status_envio === 'bounce' ? '#c5221f' : '#956802'
                      }}>
                        {status.status_envio.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: '#5f6368' }} title={formatarDataLocal(status.data_envio, timezone, 'completo')}>
                      {format(new Date(status.data_envio), "dd/MM HH:mm")}
                    </span>
                  </div>
                  
                  <div className="text-[10px] space-y-1" style={{ color: '#5f6368' }}>
                    <p><strong>Para:</strong> {status.destinatario_email}</p>
                    <p><strong>Assunto:</strong> {status.assunto}</p>
                    {status.provedor && status.provedor !== 'base44_builtin' && (
                      <p><strong>Provedor:</strong> SendGrid</p>
                    )}
                  </div>
                  
                  {status.total_aberturas > 0 && (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: '#34a853' }}>
                      <CheckCircle className="w-3 h-3" />
                      Lido {status.total_aberturas}x
                    </p>
                  )}
                  
                  {mensagemRelacionada?.email_headers && (
                    <details className="text-[10px] mt-2">
                      <summary className="cursor-pointer font-semibold flex items-center gap-1" style={{ color: '#5f6368' }}>
                        <Shield className="w-3 h-3" />
                        Autenticação (SPF/DKIM)
                      </summary>
                      <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                        {mensagemRelacionada.email_headers.spf && (
                          <p className="mb-1">
                            <strong>SPF:</strong> {mensagemRelacionada.email_headers.spf.includes('pass') ? '✅ Pass' : '❌ Fail'}
                          </p>
                        )}
                        {mensagemRelacionada.email_headers.dkim && (
                          <p className="mb-1">
                            <strong>DKIM:</strong> {mensagemRelacionada.email_headers.dkim ? '✅ Signed' : '❌ Not signed'}
                          </p>
                        )}
                        {mensagemRelacionada.email_headers.message_id && (
                          <p className="font-mono break-all">
                            <strong>ID:</strong> {mensagemRelacionada.email_headers.message_id}
                          </p>
                        )}
                      </div>
                    </details>
                  )}
                  
                  {status.erro_descricao && (
                    <p className="text-[10px] flex items-center gap-1" style={{ color: '#ea4335' }}>
                      <AlertCircle className="w-3 h-3" />
                      {status.erro_descricao}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}