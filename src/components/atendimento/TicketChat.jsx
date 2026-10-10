import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Send, Printer, Brain, Sparkles, Paperclip, XIcon as X, CheckCircle, AlertCircle, User, Inbox } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SentimentoBadge from "./SentimentoBadge";
import SugestoesIA from "./SugestoesIA";

export default function TicketChat({ 
  ticket, 
  mensagens, 
  templates,
  user,
  onUpdateSugestao
}) {
  const queryClient = useQueryClient();
  const [resposta, setResposta] = useState("");
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [buscaTemplate, setBuscaTemplate] = useState("");
  const [sugestaoIA, setSugestaoIA] = useState(null);
  const [logIAId, setLogIAId] = useState(null);

  const enviarRespostaMutation = useMutation({
    mutationFn: async ({ conteudo }) => {
      const mensagem = await base44.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: user.clinica_id,
        remetente_tipo: "equipe",
        remetente_id: user.id,
        remetente_nome: user.full_name,
        remetente_email: user.email,
        conteudo
      });

      const updates = { 
        status: "em_andamento",
        ultima_interacao: new Date().toISOString()
      };
      
      if (!ticket.tempo_primeira_resposta) {
        const minutos = Math.floor((Date.now() - new Date(ticket.created_date).getTime()) / 60000);
        updates.tempo_primeira_resposta = minutos;
      }
      
      await base44.entities.Ticket.update(ticket.id, updates);

      if (ticket.solicitante_email) {
        try {
          const responseEmail = await base44.functions.invoke('enviarEmailTicket', {
            ticket_id: ticket.id,
            mensagem_id: mensagem.id,
            destinatario: ticket.solicitante_email,
            assunto: `Re: ${ticket.assunto}`,
            corpo: conteudo,
            tipo_envio: 'resposta'
          });
          
          await base44.entities.StatusEntregaEmail.create({
            ticket_id: ticket.id,
            clinica_id: user.clinica_id,
            mensagem_id: mensagem.id,
            destinatario_email: ticket.solicitante_email,
            assunto: `Re: ${ticket.assunto}`,
            status_envio: responseEmail.data.enviado ? 'enviado' : 'falha',
            data_envio: new Date().toISOString(),
            sendgrid_message_id: responseEmail.data.message_id,
            provedor: responseEmail.data.provedor || 'base44_builtin',
            erro_descricao: responseEmail.data.erro
          });
        } catch (emailError) {
          await base44.entities.StatusEntregaEmail.create({
            ticket_id: ticket.id,
            clinica_id: user.clinica_id,
            mensagem_id: mensagem.id,
            destinatario_email: ticket.solicitante_email,
            assunto: `Re: ${ticket.assunto}`,
            status_envio: 'falha',
            data_envio: new Date().toISOString(),
            erro_descricao: emailError.message
          });
          throw new Error(`Resposta salva mas email falhou: ${emailError.message}`);
        }
      }
    },
    onSuccess: () => {
      setResposta("");
      queryClient.invalidateQueries(["mensagens-ticket"]);
      queryClient.invalidateQueries(["tickets"]);
      queryClient.invalidateQueries(["status-email"]);
      toast.success("✅ Resposta enviada e email confirmado");
    },
    onError: (error) => {
      toast.error(`⚠️ ${error.message}`);
    }
  });

  const usarTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.TemplateResposta.update(templateId, {
        uso_count: (templates.find(t => t.id === templateId)?.uso_count || 0) + 1
      });
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates-resposta"]);
    }
  });

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Inbox className="w-16 h-16 mx-auto mb-4" style={{ color: '#dadce0' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: '#202124' }}>Selecione um ticket</h3>
          <p className="text-sm" style={{ color: '#5f6368' }}>Clique em um ticket à esquerda</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
              onClick={async () => {
                toast.loading('Consultando IA...');
                try {
                  const resp = await base44.functions.invoke('processarTicketComIA', {
                    ticket_id: ticket.id,
                    modo: 'sugestao'
                  });
                  toast.dismiss();
                  if (resp.data.success) {
                    setSugestaoIA(resp.data.resposta);
                    setLogIAId(resp.data.log_id);
                    toast.success('✨ Sugestão IA gerada');
                  }
                } catch (error) {
                  toast.dismiss();
                  toast.error('IA indisponível');
                }
              }}
              className="px-3 py-2 rounded-lg border transition-all hover:bg-purple-50 flex items-center gap-2"
              style={{ borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }}
              title="Pedir sugestão de resposta da IA"
            >
              <Brain className="w-4 h-4" style={{ color: '#7E57FF' }} />
              <span className="text-xs font-semibold hidden sm:inline" style={{ color: '#6d28d9' }}>Sugestão IA</span>
            </button>
            <SentimentoBadge 
              ticket={ticket} 
              onUpdate={() => queryClient.invalidateQueries(["tickets"])}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
        {mensagens.map(msg => {
          const isMine = msg.remetente_email === user?.email;
          
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mr-3" style={{ backgroundColor: '#e8eaed', color: '#5f6368' }}>
                  {msg.remetente_nome?.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className={`max-w-[85%]`}>
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
                        {msg.email_headers.date 
                          ? format(new Date(msg.email_headers.date), "dd/MM/yyyy 'às' HH:mm")
                          : format(new Date(msg.created_date), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className={`rounded-2xl p-4`} style={{
                  backgroundColor: isMine ? '#7E57FF' : '#ffffff',
                  color: isMine ? 'white' : '#202124',
                  border: !isMine ? '1px solid #e8eaed' : 'none'
                }}>
                  {!msg.email_headers && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: isMine ? 'rgba(255,255,255,0.2)' : '#e8eaed' }}>
                      <p className="text-xs font-semibold opacity-90">{msg.remetente_nome}</p>
                      <span className="text-[10px] opacity-70">
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

      <div className="border-t p-4 bg-white space-y-3" style={{ borderColor: '#e8eaed' }}>
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
                  setLogIAId(null);
                }}
                className="p-1 hover:bg-purple-200 rounded transition-all"
              >
                <X className="w-4 h-4" style={{ color: '#6d28d9' }} />
              </button>
            </div>
            <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border" style={{ borderColor: '#ddd6fe' }}>
              {sugestaoIA}
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setResposta(sugestaoIA);
                  setSugestaoIA(null);
                  if (logIAId) {
                    await base44.entities.LogUsageIA.update(logIAId, { aceito: true, status: 'aceito' });
                  }
                  toast.success('✅ Sugestão aceita');
                }}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: '#34a853', color: 'white' }}
              >
                <CheckCircle className="w-4 h-4" />
                Aceitar
              </button>
              <button
                onClick={async () => {
                  setSugestaoIA(null);
                  if (logIAId) {
                    const motivo = prompt('Por que rejeitou? (opcional)');
                    await base44.entities.LogUsageIA.update(logIAId, { 
                      aceito: false, 
                      status: 'rejeitado',
                      motivo_rejeicao: motivo 
                    });
                  }
                  toast.info('Sugestão rejeitada');
                }}
                className="flex-1 px-4 py-2 rounded-lg font-semibold transition-all border flex items-center justify-center gap-2"
                style={{ borderColor: '#ea4335', color: '#ea4335' }}
              >
                <X className="w-4 h-4" />
                Rejeitar
              </button>
            </div>
          </div>
        )}

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
            style={{ borderColor: '#e8eaed', color: '#5f6368' }}
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
                      onClick={() => {
                        setResposta(template.conteudo);
                        setMostrarTemplates(false);
                        setBuscaTemplate("");
                        usarTemplateMutation.mutate(template.id);
                      }}
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
                  onClick={() => onUpdateSugestao?.('templates', true)}
                  className="cursor-pointer px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                  style={{ border: '1px solid #ddd6fe' }}
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
            onClick={() => enviarRespostaMutation.mutate({ conteudo: resposta })}
            disabled={!resposta.trim() || enviarRespostaMutation.isPending}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: 'white' }}
          >
            {enviarRespostaMutation.isPending ? "⏳" : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </>
  );
}