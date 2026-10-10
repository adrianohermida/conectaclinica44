import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export default function TicketForm({ onSuccess, contatoId, contatoNome }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    categoria: "suporte_tecnico",
    contato_id: contatoId || "",
    contato_nome: contatoNome || ""
  });
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Ticket.create({
        ...data,
        clinica_id: user.clinica_id,
        status: "aberto",
        criado_por: user.email,
        anexos: anexos.map(a => a.url)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tickets"]);
      toast.success("Ticket criado!");
      if (onSuccess) onSuccess();
    }
  });

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAnexos([...anexos, { name: file.name, url: file_url }]);
      toast.success("Arquivo anexado!");
    } catch (e) {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
      <Input 
        placeholder="Título do ticket *" 
        value={formData.titulo} 
        onChange={e => setFormData({...formData, titulo: e.target.value})} 
        required 
      />

      <textarea 
        placeholder="Descreva o problema detalhadamente *" 
        value={formData.descricao} 
        onChange={e => setFormData({...formData, descricao: e.target.value})} 
        required
        rows={5}
        className="w-full px-3 py-2 border rounded-lg resize-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <Select value={formData.prioridade} onValueChange={v => setFormData({...formData, prioridade: v})}>
          <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent style={{zIndex:999999}}>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formData.categoria} onValueChange={v => setFormData({...formData, categoria: v})}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent style={{zIndex:999999}}>
            <SelectItem value="suporte_tecnico">Suporte Técnico</SelectItem>
            <SelectItem value="duvida">Dúvida</SelectItem>
            <SelectItem value="bug">Bug/Erro</SelectItem>
            <SelectItem value="feature">Nova Funcionalidade</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Anexos */}
      <div>
        <label className="block text-sm font-medium mb-2">Anexos (opcional)</label>
        <div 
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
          onClick={() => document.getElementById('ticket-file-upload').click()}
        >
          <Paperclip className="w-6 h-6 mx-auto text-gray-400 mb-1" />
          <p className="text-xs text-gray-600">Clique para anexar arquivos</p>
          <input 
            type="file" 
            id="ticket-file-upload" 
            className="hidden" 
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} 
            disabled={uploading}
          />
        </div>
        {anexos.length > 0 && (
          <div className="mt-2 space-y-1">
            {anexos.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="truncate">{a.name}</span>
                <button type="button" onClick={() => setAnexos(anexos.filter((_, idx) => idx !== i))}>
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={createMutation.isPending || uploading} className="w-full">
        {createMutation.isPending ? "Criando..." : "Criar Ticket"}
      </Button>
    </form>
  );
}