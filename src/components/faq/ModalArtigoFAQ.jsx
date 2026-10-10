import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ModalArtigoFAQ({ artigo, onClose }) {
  const [form, setForm] = useState(artigo || {
    secao: 'produto',
    categoria: 'geral',
    pergunta: '',
    resposta: '',
    resposta_curta: '',
    tags: [],
    ativo: true
  });

  const queryClient = useQueryClient();

  const salvarMutation = useMutation({
    mutationFn: (data) => artigo 
      ? base44.entities.ArtigoFAQ.update(artigo.id, data)
      : base44.entities.ArtigoFAQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artigos-faq']);
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{artigo ? 'Editar' : 'Novo'} Artigo FAQ</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Seção*</label>
              <select value={form.secao} onChange={(e) => setForm({...form, secao: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="produto">Produto</option>
                <option value="tecnico">Técnico</option>
                <option value="comercial">Comercial</option>
                <option value="suporte">Suporte</option>
                <option value="compliance">Compliance</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="geral">Geral</option>
                <option value="agenda">Agenda</option>
                <option value="pacientes">Pacientes</option>
                <option value="prontuarios">Prontuários</option>
                <option value="telemedicina">Telemedicina</option>
                <option value="financeiro">Financeiro</option>
                <option value="planos">Planos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pergunta*</label>
            <Input value={form.pergunta} onChange={(e) => setForm({...form, pergunta: e.target.value})} placeholder="Como agendar uma consulta?" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resposta Completa* (Markdown)</label>
            <Textarea value={form.resposta} onChange={(e) => setForm({...form, resposta: e.target.value})} rows={6} placeholder="### Passo a passo..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Resposta Curta (Chatbot)</label>
            <Textarea value={form.resposta_curta} onChange={(e) => setForm({...form, resposta_curta: e.target.value})} rows={3} placeholder="Resposta rápida para IA..." />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags (separadas por vírgula)</label>
            <Input 
              value={form.tags?.join(', ') || ''} 
              onChange={(e) => setForm({...form, tags: e.target.value.split(',').map(t => t.trim())})} 
              placeholder="agendamento, consulta, horarios"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={() => salvarMutation.mutate(form)} loading={salvarMutation.isPending} className="flex-1">
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}