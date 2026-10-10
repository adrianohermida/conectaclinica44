import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/Button";
import DragDropUpload from "./DragDropUpload";
import { Paperclip, X as XIcon } from "lucide-react";
import { toast } from "sonner";

export default function CriarTicketForm({ contatoPreSelecionado, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [anexos, setAnexos] = useState([]);
  const [tipoAtendimento, setTipoAtendimento] = useState(contatoPreSelecionado ? "ticket" : "email");
  const [form, setForm] = useState({
    contato_id: contatoPreSelecionado?.id || "",
    assunto: "",
    prioridade: "media",
    categoria: "duvida",
    canal: "email",
    descricao: ""
  });

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const [buscaContato, setBuscaContato] = useState("");

  const { data: contatos = [] } = useQuery({
    queryKey: ["contatos", user?.clinica_id],
    queryFn: () => base44.entities.Contato.filter({ clinica_id: user.clinica_id, tipo_contato: "paciente" }),
    enabled: !!user?.clinica_id && !contatoPreSelecionado,
    staleTime: 5 * 60 * 1000
  });

  const contatosFiltrados = contatos.filter(c => {
    if (!buscaContato) return true;
    const termo = buscaContato.toLowerCase();
    const email = c.emails?.[0]?.email || c.email || '';
    return c.nome_completo?.toLowerCase().includes(termo) || email.toLowerCase().includes(termo);
  });

  const criarTicketMutation = useMutation({
    mutationFn: async (data) => {
      const contato = contatoPreSelecionado || contatos.find(c => c.id === data.contato_id);
      
      if (!contato) {
        throw new Error('Selecione um contato');
      }

      const emailPrincipal = contato?.emails?.find(e => e.principal)?.email || 
                            contato?.emails?.[0]?.email || 
                            contato?.email;

      if (!emailPrincipal) {
        throw new Error('Contato sem email cadastrado');
      }

      const ano = new Date().getFullYear();
      const ticketsExistentes = await base44.entities.Ticket.filter({ clinica_id: user.clinica_id });
      const numeroSequencial = String(ticketsExistentes.length + 1).padStart(4, '0');

      const ticket = await base44.entities.Ticket.create({
        clinica_id: user.clinica_id,
        contato_id: contato.id,
        numero_ticket: `#${ano}-${numeroSequencial}`,
        assunto: data.assunto,
        solicitante_nome: contato.nome_completo,
        solicitante_email: emailPrincipal,
        solicitante_telefone: contato.telefones?.find(t => t.principal)?.numero || contato.telefones?.[0]?.numero || contato.telefone,
        canal: data.canal,
        prioridade: data.prioridade,
        categoria: data.categoria,
        status: "aberto"
      });

      const mensagem = await base44.entities.MensagemTicket.create({
        ticket_id: ticket.id,
        clinica_id: user.clinica_id,
        remetente_tipo: 'equipe',
        remetente_nome: user.full_name,
        remetente_email: user.email,
        conteudo: data.descricao,
        anexos: anexos
      });

      const responseEmail = await base44.functions.invoke('enviarEmailTicket', {
        ticket_id: ticket.id,
        mensagem_id: mensagem.id,
        destinatario: emailPrincipal,
        assunto: data.assunto,
        corpo: data.descricao,
        anexos: anexos,
        tipo_envio: 'novo_email'
      });

      await base44.entities.StatusEntregaEmail.create({
        ticket_id: ticket.id,
        clinica_id: user.clinica_id,
        mensagem_id: mensagem.id,
        destinatario_email: emailPrincipal,
        assunto: data.assunto,
        status_envio: responseEmail.data.enviado ? 'enviado' : 'falha',
        data_envio: new Date().toISOString(),
        sendgrid_message_id: responseEmail.data.message_id,
        provedor: responseEmail.data.provedor || 'base44_builtin',
        erro_descricao: responseEmail.data.erro
      });

      return { ticket, enviado: responseEmail.data.enviado };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["tickets"]);
      queryClient.invalidateQueries(["contato-completo"]);
      toast.success(result.enviado ? "✅ Email enviado" : "⚠️ Ticket criado (email falhou)");
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      criarTicketMutation.mutate(form);
    }} className="space-y-5">
      {!contatoPreSelecionado && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold" style={{ color: '#202124' }}>Destinatário *</label>
          
          <Input
            placeholder="🔍 Buscar por nome ou email..."
            value={buscaContato}
            onChange={(e) => setBuscaContato(e.target.value)}
            className="rounded-xl min-h-[48px] border-gray-200"
          />

          {contatosFiltrados.length > 0 ? (
            <div className="max-h-[200px] overflow-y-auto border rounded-xl" style={{ borderColor: '#e8eaed' }}>
              {contatosFiltrados.slice(0, 10).map(c => {
                const emailPrincipal = c.emails?.find(e => e.principal)?.email || c.emails?.[0]?.email || c.email;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, contato_id: c.id });
                      setBuscaContato("");
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-all border-b last:border-b-0 ${
                      form.contato_id === c.id ? 'bg-purple-50' : ''
                    }`}
                    style={{ borderColor: '#e8eaed' }}
                  >
                    <div className="font-semibold text-sm" style={{ color: '#202124' }}>{c.nome_completo}</div>
                    <div className="text-xs mt-1" style={{ color: '#5f6368' }}>{emailPrincipal || 'Sem email'}</div>
                  </button>
                );
              })}
            </div>
          ) : buscaContato ? (
            <div className="text-center py-4 text-sm" style={{ color: '#80868b' }}>
              ⚠️ Nenhum contato encontrado com "{buscaContato}"
            </div>
          ) : null}

          {form.contato_id && (
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#f5f3ff' }}>
              <span className="text-sm font-medium" style={{ color: '#7E57FF' }}>
                ✓ {contatos.find(c => c.id === form.contato_id)?.nome_completo}
              </span>
              <button
                type="button"
                onClick={() => setForm({ ...form, contato_id: "" })}
                className="text-xs px-2 py-1 rounded hover:bg-white"
              >
                Remover
              </button>
            </div>
          )}
        </div>
      )}

      {contatoPreSelecionado && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Para</label>
          <Input
            value={contatoPreSelecionado?.nome_completo || ""}
            disabled
            className="rounded-xl min-h-[48px] border-gray-200 bg-gray-50"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Assunto *</label>
        <Input
          value={form.assunto}
          onChange={(e) => setForm({ ...form, assunto: e.target.value })}
          placeholder="Digite o assunto do email"
          required
          className="rounded-xl min-h-[48px] border-gray-200"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Mensagem *</label>
        <Textarea
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder="Escreva sua mensagem..."
          required
          className="rounded-xl resize-none border-gray-200"
          rows={8}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Anexos</label>
        <DragDropUpload 
          onFilesUploaded={(uploadedFiles) => setAnexos([...anexos, ...uploadedFiles])}
          maxFiles={5}
          maxSizeMB={10}
        />
        {anexos.length > 0 && (
          <div className="mt-3 space-y-2">
            {anexos.map((anexo, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Paperclip className="w-4 h-4 flex-shrink-0" style={{ color: '#7E57FF' }} />
                  <span className="text-sm truncate" style={{ color: '#202124' }}>{anexo.nome}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnexos(anexos.filter((_, i) => i !== idx))}
                  className="p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
                >
                  <XIcon className="w-4 h-4" style={{ color: '#ea4335' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Prioridade</label>
          <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
            <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="baixa">🟢 Baixa</SelectItem>
              <SelectItem value="media">🟡 Média</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="urgente">🔴 Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Categoria</label>
          <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
            <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="suporte_tecnico">🛠️ Suporte</SelectItem>
              <SelectItem value="agendamento">📅 Agendamento</SelectItem>
              <SelectItem value="financeiro">💰 Financeiro</SelectItem>
              <SelectItem value="duvida">❓ Dúvida</SelectItem>
              <SelectItem value="reclamacao">⚠️ Reclamação</SelectItem>
              <SelectItem value="outro">📋 Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 min-h-[48px] rounded-xl font-medium transition-all border"
          style={{ borderColor: '#e8eaed', color: '#5f6368' }}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={criarTicketMutation.isPending || !form.assunto || !form.descricao || (!contatoPreSelecionado && !form.contato_id)} 
          className="flex-1 min-h-[48px] rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#7E57FF', color: 'white' }}
        >
          {criarTicketMutation.isPending ? "⏳ Enviando..." : "📧 Enviar Email"}
        </button>
      </div>
    </form>
  );
}