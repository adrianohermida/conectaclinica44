import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DragDropUpload from "./DragDropUpload";
import AnexosList from "./AnexosList";

export default function TicketFormFields({ form, setForm, anexos, setAnexos }) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Assunto *</label>
        <Input
          value={form.assunto}
          onChange={(e) => setForm({ ...form, assunto: e.target.value })}
          placeholder="Ex: Dúvida sobre agendamento"
          required
          className="rounded-xl min-h-[48px] border-gray-200"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Mensagem *</label>
        <Textarea
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          placeholder={form.tipo === 'email' ? "Escreva sua mensagem..." : "Descreva o problema..."}
          required
          className="rounded-xl resize-none border-gray-200"
          rows={6}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Anexos</label>
        <DragDropUpload 
          onFilesUploaded={(uploadedFiles) => setAnexos([...anexos, ...uploadedFiles])}
          maxFiles={5}
          maxSizeMB={10}
        />
        <AnexosList anexos={anexos} onRemove={(idx) => setAnexos(anexos.filter((_, i) => i !== idx))} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
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
          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Canal</label>
          <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
            <SelectTrigger className="rounded-xl min-h-[48px] border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ zIndex: 999999 }}>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
              <SelectItem value="widget">🌐 Widget</SelectItem>
              <SelectItem value="interno">🏢 Interno</SelectItem>
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
    </>
  );
}