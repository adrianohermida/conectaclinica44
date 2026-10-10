import React from "react";
import { User, AlertCircle, Sparkles, XIcon, CheckCircle, Paperclip, Send, Printer, Brain } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";
import SentimentoBadge from "./SentimentoBadge";
import SugestoesIA from "./SugestoesIA";
import { formatarDataLocal } from "@/components/hooks/useUserTimezone";
import { base44 } from "@/api/base44Client";

export default function TicketChatWindow({ 
  ticket, 
  mensagens = [],
  resposta,
  setResposta,
  onEnviarResposta,
  enviando,
  sugestaoIA,
  setSugestaoIA,
  logIAId,
  onAceitarSugestao,
  onRejeitarSugestao,
  onPedirSugestaoIA,
  mostrarTemplates,
  setMostrarTemplates,
  buscaTemplate,
  setBuscaTemplate,
  templates = [],
  onUsarTemplate,
  onAbrirTemplates,
  user,
  onAtualizarTickets,
  timezone = 'America/Sao_Paulo'
}) {
  return (
    <div className="lg:col-span-5 rounded-2xl bg-white flex flex-col" style={{ border: '1px solid #e8eaed', height: '600px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg mb-1" style={{ color: '#202124' }}>{ticket.assunto}</h2>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#5f6368' }}>
              <User className="w-4 h-4" />
              <span>{ticket.solicitante_nome}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPedirSugestaoIA}
              className="px-3 py-2 rounded-lg border transition-all hover:bg-purple-50 flex items-center gap-2"
              style={{ borderColor: '#ddd6fe', backgroundColor: '#f5f3ff', minWidth: '44px', minHeight: '44px' }}
              title="Pedir sugestão de resposta da IA"
              aria-label="Pedir sugestão IA"
            >
              <Brain className="w-4 h-4" style={{ color: '#7E57FF' }} />
              <span className="text-xs font-semibold hidden sm:inline" style={{ color: '#6d28d9' }}>Sugestão IA</span>
            </button>
            <SentimentoBadge 
              ticket={ticket} 
              onUpdate={onAtualizarTickets}
            />
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {mensagens.map(msg => {
          const isMine = msg.remetente_email === user?.email;
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{ backgroundColor: '#e8eaed', color: '#5f6368' }}>
                  {msg.remetente_nome?.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className={`max-w-[85%]`}>
                {/* Headers do Email */}
                {msg.email_headers && (
                  <div className="mb-2 p-3 rounded-lg text-xs" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <span className="font-semibold text-gray-600">De:</span>
                      <span className="text-gray-900 truncate">{msg.email_headers.from || msg.remetente_email}</span>
                      
                      <span className="font-semibold text-gray-600">Para:</span>
                      <span className="text-gray-900 truncate">{msg.email_headers.to}</span>
                      
                      {msg.email_headers.cc && (
                        <>
                          <span className="font-semibold text-gray-600">CC:</span>
                          <span className="text-gray-900 truncate">{msg.email_headers.cc}</span>
                        </>
                      )}
                      
                      <span className="font-semibold text-gray-600">Data:</span>
                      <span className="text-gray-900">
                        {formatarDataLocal(msg.email_headers?.date || msg.created_date, timezone, 'data_hora')}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Conteúdo */}
                <div className={`rounded-2xl p-4`} style={{
                  backgroundColor: isMine ? '#7E57FF' : '#ffffff',
                  color: isMine ? 'white' : '#202124',
                  border: !isMine ? '1px solid #e8eaed' : 'none'
                }}>
                  {!msg.email_headers && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: isMine ? 'rgba(255,255,255,0.2)' : '#e8eaed' }}>
                      <p className="text-xs font-semibold opacity-90">{msg.remetente_nome}</p>
                      <span className="text-[10px] opacity-70" title={formatarDataLocal(msg.created_date, timezone, 'completo')}>
                        {format(new Date(msg.created_date), "HH:mm")}
                      </span>
                    </div>
                  )}
                  
                  {msg.conteudo_html ? (
                    <div 
                      className="text-sm email-content"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.conteudo_html
                          .replace(/<script[^>]*>.*?<\/script>/gis, '')
                          .replace(/<style[^>]*>.*?<\/style>/gis, '')
                      }}
                    />
                  ) : msg.conteudo && msg.conteudo.trim().length > 0 ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                  ) : (
                    <div className="text-xs italic opacity-70 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>[Email sem conteúdo]</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Resposta */}
      <div className="border-t p-4 bg-white space-y-3" style={{ borderColor: '#e8eaed' }}>
        {/* Sugestão IA */}
        {sugestaoIA && (
          <div className="p-4 rounded-xl border-2 space-y-3" style={{ backgroundColor: '#f5f3ff', borderColor: '#7E57FF' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: '#7E57FF' }} />
                <span className="text-sm font-bold" style={{ color: '#6d28d9' }}>Sugestão da IA</span>
              </div>
              <button
                onClick={() => {
                  setSugestaoIA(null);
                }}
                className="p-1 hover:bg-purple-200 rounded transition-all"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-label="Fechar sugestão"
              >
                <XIcon className="w-4 h-4" style={{ color: '#6d28d9' }} />
              </button>
            </div>
            <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border" style={{ borderColor: '#ddd6fe' }}>
              {sugestaoIA}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onAceitarSugestao(sugestaoIA, logIAId)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: '#34a853', color: 'white', minHeight: '44px' }}
              >
                <CheckCircle className="w-4 h-4" />
                Aceitar
              </button>
              <button
                onClick={() => onRejeitarSugestao(logIAId)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all border flex items-center justify-center gap-2"
                style={{ borderColor: '#ea4335', color: '#ea4335', minHeight: '44px' }}
              >
                <XIcon className="w-4 h-4" />
                Rejeitar
              </button>
            </div>
          </div>
        )}

        {/* Ações do Ticket */}
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: '#f1f3f4' }}>
          <button
            onClick={async () => {
              try {
                const response = await base44.functions.invoke('imprimirTicketPDF', { 
                  ticket_id: ticket.id 
                });
                const html = response.data;
                const printWindow = window.open('', '_blank');
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 500);
              } catch (error) {
                toast.error('Erro ao gerar PDF');
              }
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all hover:bg-gray-50 flex items-center gap-2"
            style={{ borderColor: '#e8eaed', color: '#5f6368', minWidth: '44px', minHeight: '44px' }}
            aria-label="Imprimir ticket"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              placeholder="Digite sua resposta... (use / para templates)"
              value={resposta}
              onChange={(e) => {
                const val = e.target.value;
                setResposta(val);
                
                if (val.startsWith('/')) {
                  setMostrarTemplates(true);
                  setBuscaTemplate(val.slice(1));
                } else if (mostrarTemplates && !val.includes('/')) {
                  setMostrarTemplates(false);
                  setBuscaTemplate("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && mostrarTemplates) {
                  setMostrarTemplates(false);
                  setBuscaTemplate("");
                }
              }}
              className="rounded-xl resize-none border-gray-200"
              rows={2}
            />
            
            {/* Dropdown Templates */}
            {mostrarTemplates && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border shadow-lg max-h-[300px] overflow-y-auto z-50" style={{ borderColor: '#e8eaed' }}>
                {templates
                  .filter(t => 
                    !buscaTemplate || 
                    t.titulo.toLowerCase().includes(buscaTemplate.toLowerCase()) ||
                    t.atalho?.toLowerCase().includes(buscaTemplate.toLowerCase()) ||
                    t.tags?.some(tag => tag.toLowerCase().includes(buscaTemplate.toLowerCase()))
                  )
                  .slice(0, 8)
                  .map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onUsarTemplate(template)}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-all border-b last:border-b-0"
                      style={{ borderColor: '#f1f3f4' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm" style={{ color: '#202124' }}>
                          {template.titulo}
                        </span>
                        {template.atalho && (
                          <code className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
                            /{template.atalho}
                          </code>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{template.conteudo}</p>
                      {template.uso_count > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">Usado {template.uso_count}x</p>
                      )}
                    </button>
                  ))}
                {templates.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum template criado</p>
                    <button
                      onClick={() => {
                        onAbrirTemplates();
                        setMostrarTemplates(false);
                      }}
                      className="mt-2 text-xs text-purple-600 hover:underline"
                    >
                      Criar primeiro template
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-3 mt-3">
              <SugestoesIA
                ticketId={ticket.id}
                onSelectSuggestion={(texto) => setResposta(texto)}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onAbrirTemplates}
                  className="cursor-pointer px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                  style={{ border: '1px solid #ddd6fe', minWidth: '44px', minHeight: '44px' }}
                  aria-label="Abrir templates"
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#7E57FF' }} />
                  <span className="text-xs" style={{ color: '#6d28d9' }}>Templates</span>
                </button>
                <label htmlFor="anexo-resposta" className="cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2">
                  <Paperclip className="w-4 h-4" style={{ color: '#5f6368' }} />
                  <span className="text-xs" style={{ color: '#5f6368' }}>Anexar</span>
                </label>
                <input type="file" id="anexo-resposta" className="hidden" />
              </div>
            </div>
          </div>
          <button
            onClick={onEnviarResposta}
            disabled={!resposta.trim() || enviando}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: 'white', minWidth: '44px', minHeight: '44px' }}
            aria-label="Enviar resposta"
          >
            {enviando ? "⏳" : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}