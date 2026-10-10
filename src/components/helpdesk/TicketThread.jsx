import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { User, Clock, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TicketThread({ ticketId }) {
  const queryClient = useQueryClient();
  const [resposta, setResposta] = useState("");
  const [anexando, setAnexando] = useState(false);

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["ticket-mensagens", ticketId],
    queryFn: () => base44.entities.MensagemTicket.filter({ ticket_id: ticketId }, "created_date", 100),
    enabled: !!ticketId
  });

  const enviarMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.MensagemTicket.create({
        ticket_id: ticketId,
        remetente_tipo: "staff",
        remetente_nome: user.full_name,
        remetente_email: user.email,
        conteudo: resposta,
        clinica_id: user.clinica_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["ticket-mensagens", ticketId]);
      setResposta("");
      toast.success("Resposta enviada!");
    }
  });

  if (isLoading) return <div className="p-4 text-center text-sm text-gray-500">Carregando histórico...</div>;

  return (
    <div className="space-y-4">
      {/* Histórico */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {mensagens.map(m => (
          <div key={m.id} className={`p-3 rounded-lg ${m.remetente_tipo === "staff" ? "bg-purple-50 border border-purple-200" : "bg-gray-50 border"}`}>
            <div className="flex items-start gap-2 mb-2">
              <User className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{m.remetente_nome}</span>
                  <span className="text-xs text-gray-500">{format(new Date(m.created_date), "dd/MM/yyyy HH:mm")}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.conteudo}</p>
                {m.anexos?.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {m.anexos.map((url, i) => (
                      <a key={i} href={url} target="_blank" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Anexo {i+1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Resposta */}
      <div className="border-t pt-4">
        <textarea 
          placeholder="Digite sua resposta..." 
          value={resposta} 
          onChange={e => setResposta(e.target.value)} 
          rows={3}
          className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('resposta-anexo').click()} disabled={anexando}>
            <Paperclip className="w-4 h-4 mr-1" /> Anexar
          </Button>
          <input type="file" id="resposta-anexo" className="hidden" onChange={async (e) => {
            if (!e.target.files[0]) return;
            setAnexando(true);
            try {
              const { file_url } = await base44.integrations.Core.UploadFile({ file: e.target.files[0] });
              setResposta(resposta + `\n[Anexo: ${file_url}]`);
              toast.success("Anexado!");
            } catch (e) {
              toast.error("Erro ao anexar");
            } finally {
              setAnexando(false);
            }
          }} />
          <Button size="sm" onClick={() => enviarMutation.mutate()} disabled={!resposta.trim() || enviarMutation.isPending}>
            {enviarMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}