import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BotaoFeedback({ user }) {
  const [aberto, setAberto] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "sugestao",
    categoria: "outro",
    assunto: "",
    descricao: ""
  });

  const queryClient = useQueryClient();

  const enviarFeedback = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FeedbackUsuario.create({
        clinica_id: user.clinica_id,
        usuario_email: user.email,
        usuario_nome: user.full_name,
        ...data
      });

      // Notificar SuperAdmin
      await base44.integrations.Core.SendEmail({
        to: "admin@conectaclinica.com.br",
        subject: `[Feedback ${data.tipo.toUpperCase()}] ${data.assunto}`,
        body: `
Novo feedback recebido:

**Usuário:** ${user.full_name} (${user.email})
**Clínica ID:** ${user.clinica_id}
**Tipo:** ${data.tipo}
**Categoria:** ${data.categoria}
**Assunto:** ${data.assunto}

**Descrição:**
${data.descricao}
        `.trim()
      });
    },
    onSuccess: () => {
      toast.success("Feedback enviado com sucesso!");
      setFormData({ tipo: "sugestao", categoria: "outro", assunto: "", descricao: "" });
      setAberto(false);
      queryClient.invalidateQueries(['feedbacks']);
    },
    onError: () => {
      toast.error("Erro ao enviar feedback");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.assunto || !formData.descricao) {
      toast.error("Preencha assunto e descrição");
      return;
    }
    enviarFeedback.mutate(formData);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50"
        style={{ backgroundColor: '#7E57FF' }}
        aria-label="Enviar Feedback"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* Modal */}
      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#081828]">Enviar Feedback</h3>
              <button onClick={() => setAberto(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Feedback</label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sugestao">💡 Sugestão</SelectItem>
                    <SelectItem value="bug">🐛 Bug / Erro</SelectItem>
                    <SelectItem value="duvida">❓ Dúvida</SelectItem>
                    <SelectItem value="elogio">⭐ Elogio</SelectItem>
                    <SelectItem value="reclamacao">⚠️ Reclamação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Módulo</label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agenda">Agenda</SelectItem>
                    <SelectItem value="prontuarios">Prontuários</SelectItem>
                    <SelectItem value="pacientes">Pacientes</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="ia">IA</SelectItem>
                    <SelectItem value="telemedicina">Telemedicina</SelectItem>
                    <SelectItem value="relatorios">Relatórios</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assunto</label>
                <Input
                  value={formData.assunto}
                  onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                  placeholder="Ex: Problema ao agendar consulta"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição Detalhada</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 min-h-[120px] focus:outline-none focus:border-[#7E57FF]"
                  placeholder="Descreva em detalhes o que aconteceu ou sua sugestão..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={enviarFeedback.isPending}
                className="w-full text-white font-bold py-3 rounded-full hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: '#7E57FF' }}
              >
                {enviarFeedback.isPending ? "Enviando..." : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Feedback
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}