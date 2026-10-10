import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, Edit, Trash2, TrendingUp, Search, Save, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function GestaoTemplates({ clinicaId }) {
  const queryClient = useQueryClient();
  const [modoEdicao, setModoEdicao] = useState(false);
  const [templateEditando, setTemplateEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    titulo: "",
    atalho: "",
    conteudo: "",
    categoria: "outro",
    tags: ""
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates-resposta", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      try {
        const result = await base44.entities.TemplateResposta.filter({ clinica_id: clinicaId }, '-uso_count');
        return result || [];
      } catch (error) {
        console.error('[GestaoTemplates] Erro ao carregar:', error);
        return [];
      }
    },
    enabled: !!clinicaId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  const criarMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TemplateResposta.create({
        ...data,
        clinica_id: clinicaId,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
        uso_count: 0,
        ativo: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates-resposta"]);
      resetForm();
      toast.success("✅ Template criado");
    }
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.TemplateResposta.update(id, {
        ...data,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates-resposta"]);
      resetForm();
      toast.success("✅ Template atualizado");
    }
  });

  const deletarMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.TemplateResposta.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["templates-resposta"]);
      toast.success("🗑️ Template excluído");
    }
  });

  const resetForm = () => {
    setForm({ titulo: "", atalho: "", conteudo: "", categoria: "outro", tags: "" });
    setModoEdicao(false);
    setTemplateEditando(null);
  };

  const handleEditar = (template) => {
    setForm({
      titulo: template.titulo,
      atalho: template.atalho || "",
      conteudo: template.conteudo,
      categoria: template.categoria,
      tags: template.tags?.join(', ') || ""
    });
    setTemplateEditando(template);
    setModoEdicao(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (templateEditando) {
      editarMutation.mutate({ id: templateEditando.id, data: form });
    } else {
      criarMutation.mutate(form);
    }
  };

  const templatesFiltrados = Array.isArray(templates) ? templates.filter(t =>
    !busca ||
    t?.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
    t?.conteudo?.toLowerCase().includes(busca.toLowerCase()) ||
    t?.atalho?.toLowerCase().includes(busca.toLowerCase())
  ) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#6d28d9' }}>Total Templates</p>
          <p className="text-2xl font-bold" style={{ color: '#4c1d95' }}>{templates.length}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#e6f7ed', border: '1px solid #b8e7ca' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#137333' }}>Usos Totais</p>
          <p className="text-2xl font-bold" style={{ color: '#0d5320' }}>
            {templates.reduce((sum, t) => sum + (t.uso_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Form */}
      {modoEdicao && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl space-y-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e8eaed' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm" style={{ color: '#202124' }}>
              {templateEditando ? 'Editar Template' : 'Novo Template'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 hover:bg-white rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5f6368' }}>Título *</label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Horário de Atendimento"
                required
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5f6368' }}>Atalho</label>
              <Input
                value={form.atalho}
                onChange={(e) => setForm({ ...form, atalho: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="Ex: horarios"
                className="rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5f6368' }}>Conteúdo *</label>
            <Textarea
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              placeholder="Escreva o conteúdo do template..."
              required
              className="rounded-lg resize-none"
              rows={4}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5f6368' }}>Categoria</label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="agendamento">📅 Agendamento</SelectItem>
                  <SelectItem value="financeiro">💰 Financeiro</SelectItem>
                  <SelectItem value="suporte">🛠️ Suporte</SelectItem>
                  <SelectItem value="comercial">💼 Comercial</SelectItem>
                  <SelectItem value="seguimento">📞 Seguimento</SelectItem>
                  <SelectItem value="outro">📋 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5f6368' }}>Tags (separadas por vírgula)</label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Ex: agendamento, horario, disponibilidade"
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={criarMutation.isPending || editarMutation.isPending}
              className="flex-1"
              icon={<Save className="w-4 h-4" />}
            >
              {templateEditando ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      )}

      {!modoEdicao && (
        <Button
          onClick={() => setModoEdicao(true)}
          icon={<Plus className="w-4 h-4" />}
          className="w-full"
        >
          Novo Template
        </Button>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar templates..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : templatesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">Nenhum template encontrado</p>
          </div>
        ) : (
          templatesFiltrados.map(template => {
            const categoriaConfig = {
              agendamento: { icon: '📅', bg: '#e0f2fe', color: '#075985' },
              financeiro: { icon: '💰', bg: '#e6f7ed', color: '#137333' },
              suporte: { icon: '🛠️', bg: '#fef9e5', color: '#854d0e' },
              comercial: { icon: '💼', bg: '#f5f3ff', color: '#6d28d9' },
              seguimento: { icon: '📞', bg: '#fef2f2', color: '#991b1b' },
              outro: { icon: '📋', bg: '#f8f9fa', color: '#5f6368' }
            };
            const config = categoriaConfig[template.categoria] || categoriaConfig.outro;

            return (
              <div key={template.id} className="border rounded-xl p-4" style={{ borderColor: '#e8eaed' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{config.icon}</span>
                      <h4 className="font-semibold text-sm" style={{ color: '#202124' }}>{template.titulo}</h4>
                      {template.atalho && (
                        <code className="text-xs px-2 py-0.5 rounded font-mono" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9' }}>
                          /{template.atalho}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{template.conteudo}</p>
                    <div className="flex items-center gap-3">
                      {template.uso_count > 0 && (
                        <span className="text-xs flex items-center gap-1" style={{ color: '#34a853' }}>
                          <TrendingUp className="w-3 h-3" />
                          {template.uso_count} uso(s)
                        </span>
                      )}
                      {template.tags?.length > 0 && (
                        <div className="flex gap-1">
                          {template.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: config.bg, color: config.color }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditar(template)}
                      className="p-2 hover:bg-purple-50 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" style={{ color: '#7E57FF' }} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir template?')) {
                          deletarMutation.mutate(template.id);
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#ea4335' }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dica de Uso */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-purple-800">
            <p className="font-semibold mb-1">💡 Como usar</p>
            <p>Digite <code className="px-1 bg-white rounded">/</code> no campo de resposta para abrir templates rapidamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}