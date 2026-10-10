import React from "react";
import { ChevronRight, User, Send, Lock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SugestoesIA from "./SugestoesIA";
import { format } from "date-fns";
import { formatarDataLocal } from "@/components/hooks/useUserTimezone";

export default function MobileTicketDetails({
  ticket,
  mensagens,
  resposta,
  setResposta,
  onEnviarResposta,
  enviando,
  notasInternas,
  notaInterna,
  setNotaInterna,
  tipoNota,
  setTipoNota,
  onAdicionarNota,
  onVoltar,
  user,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div className="space-y-4">
      {/* Header com Back */}
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white w-full border"
        style={{ borderColor: '#e8eaed' }}
      >
        <ChevronRight className="w-5 h-5 rotate-180" style={{ color: '#5f6368' }} />
        <span className="font-semibold" style={{ color: '#202124' }}>Voltar para lista</span>
      </button>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs font-bold" style={{ color: '#6d28d9' }}>{ticket.numero_ticket}</span>
          <span className={`px-2 py-1 rounded-full text-[10px] font-medium`} style={{
            backgroundColor: ticket.status === 'aberto' ? '#fde7e7' : ticket.status === 'em_andamento' ? '#fef9e5' : '#e6f7ed',
            color: ticket.status === 'aberto' ? '#842820' : ticket.status === 'em_andamento' ? '#956802' : '#1f6332'
          }}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
        <h2 className="font-bold text-lg mb-2" style={{ color: '#202124' }}>{ticket.assunto}</h2>
        <div className="flex items-center gap-2 text-sm" style={{ color: '#5f6368' }}>
          <User className="w-4 h-4" />
          <span>{ticket.solicitante_nome}</span>
        </div>
      </div>

      {/* Mensagens */}
      <div className="p-4 rounded-2xl bg-white space-y-4" style={{ border: '1px solid #e8eaed' }}>
        <h3 className="font-semibold text-sm" style={{ color: '#202124' }}>Conversa</h3>
        {mensagens.map(msg => {
          const isMine = msg.remetente_email === user?.email;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3`} style={{
                backgroundColor: isMine ? '#7E57FF' : '#f8f9fa',
                color: isMine ? 'white' : '#202124',
                border: !isMine ? '1px solid #e8eaed' : 'none'
              }}>
                <p className="text-xs font-semibold mb-1 opacity-90">{msg.remetente_nome}</p>
                <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                <p className="text-[10px] mt-2 opacity-70" title={formatarDataLocal(msg.created_date, timezone, 'completo')}>
                  {format(new Date(msg.created_date), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resposta */}
      <div className="p-4 rounded-2xl bg-white space-y-3" style={{ border: '1px solid #e8eaed' }}>
        <SugestoesIA
          ticketId={ticket.id}
          onSelectSuggestion={(texto) => setResposta(texto)}
        />

        <Textarea
          placeholder="Digite sua resposta..."
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          className="min-h-[100px]"
          rows={3}
        />
        <button
          onClick={onEnviarResposta}
          disabled={!resposta.trim() || enviando}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: '#7E57FF', color: 'white' }}
        >
          <Send className="w-5 h-5" />
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      {/* Notas Internas */}
      <div className="p-4 rounded-2xl bg-white" style={{ border: '1px solid #e8eaed' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#202124' }}>
          <Lock className="w-4 h-4" />
          Notas Privadas ({notasInternas.length})
        </h3>
        <div className="space-y-2 mb-3">
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
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold" style={{ color: config.color }}>
                    {config.icon} {nota.autor_nome}
                  </span>
                  <span className="text-[10px]" style={{ color: '#9aa0a6' }} title={formatarDataLocal(nota.created_date, timezone, 'completo')}>
                    {format(new Date(nota.created_date), "dd/MM HH:mm")}
                  </span>
                </div>
                <p className="text-xs" style={{ color: '#202124' }}>{nota.conteudo}</p>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <Select value={tipoNota} onValueChange={setTipoNota}>
            <SelectTrigger className="h-10 text-xs">
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
            placeholder="Nova nota..."
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
            className="text-sm min-h-[60px]"
            rows={2}
          />
          <button
            onClick={onAdicionarNota}
            disabled={!notaInterna.trim()}
            className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}