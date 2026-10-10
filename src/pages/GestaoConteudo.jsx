import React, { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, BookOpen, MessageSquare, Shield, Plus } from "lucide-react";
import ContentListTable from "@/components/conteudo/ContentListTable";
import ContentFormModal from "@/components/conteudo/ContentFormModal";
import ContentStatsBar from "@/components/conteudo/ContentStatsBar";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * HUB GESTÃO CONTEÚDO - Admin unificado
 * Gerencia: Blog, FAQ, Ajuda, Legal
 */
export default function GestaoConteudo() {
  const [activeTab, setActiveTab] = useState("faq");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: faqs = [] } = useQuery({
    queryKey: ['artigos-faq'],
    queryFn: () => base44.entities.ArtigoFAQ.list('-ordem')
  });

  const { data: ajuda = [] } = useQuery({
    queryKey: ['artigos-ajuda'],
    queryFn: () => base44.entities.ArtigoAjuda.list('-visualizacoes')
  });

  const { data: blog = [] } = useQuery({
    queryKey: ['blog-admin'],
    queryFn: () => base44.entities.Blog.list('-created_date')
  });

  const saveFAQMutation = useMutation({
    mutationFn: (data) => editando ? base44.entities.ArtigoFAQ.update(editando.id, data) : base44.entities.ArtigoFAQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artigos-faq']);
      setModalAberto(false);
      setEditando(null);
      toast.success("FAQ salvo!");
    }
  });

  const saveAjudaMutation = useMutation({
    mutationFn: (data) => editando ? base44.entities.ArtigoAjuda.update(editando.id, data) : base44.entities.ArtigoAjuda.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artigos-ajuda']);
      setModalAberto(false);
      setEditando(null);
      toast.success("Artigo salvo!");
    }
  });

  const deleteFAQMutation = useMutation({
    mutationFn: (id) => base44.entities.ArtigoFAQ.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['artigos-faq'])
  });

  const deleteAjudaMutation = useMutation({
    mutationFn: (id) => base44.entities.ArtigoAjuda.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['artigos-ajuda'])
  });

  const handleSave = (data) => {
    if (activeTab === "faq") {
      saveFAQMutation.mutate(data);
    } else if (activeTab === "ajuda") {
      saveAjudaMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (activeTab === "faq") deleteFAQMutation.mutate(id);
    else if (activeTab === "ajuda") deleteAjudaMutation.mutate(id);
  };

  const faqFields = [
    { key: 'secao', label: 'Seção', type: 'select', options: [
      { value: 'produto', label: 'Produto' },
      { value: 'tecnico', label: 'Técnico' },
      { value: 'comercial', label: 'Comercial' }
    ]},
    { key: 'categoria', label: 'Categoria', type: 'select', options: [
      { value: 'agenda', label: 'Agenda' },
      { value: 'pacientes', label: 'Pacientes' },
      { value: 'geral', label: 'Geral' }
    ]},
    { key: 'pergunta', label: 'Pergunta', type: 'text' },
    { key: 'resposta', label: 'Resposta Completa', type: 'editor' },
    { key: 'resposta_curta', label: 'Resposta Curta (Chatbot)', type: 'text' },
    { key: 'aprovado', label: 'Aprovado para IA', type: 'checkbox' }
  ];

  const ajudaFields = [
    { key: 'titulo', label: 'Título', type: 'text' },
    { key: 'slug', label: 'Slug', type: 'text' },
    { key: 'categoria', label: 'Categoria', type: 'select', options: [
      { value: 'primeiros_passos', label: 'Primeiros Passos' },
      { value: 'agenda', label: 'Agenda' },
      { value: 'troubleshooting', label: 'Troubleshooting' }
    ]},
    { key: 'conteudo', label: 'Conteúdo', type: 'editor' },
    { key: 'publicado', label: 'Publicado', type: 'checkbox' }
  ];

  const stats = [
    { icon: MessageSquare, value: faqs.length, label: 'FAQs', color: 'var(--brand-primary)' },
    { icon: BookOpen, value: ajuda.length, label: 'Artigos Ajuda', color: 'var(--brand-info)' },
    { icon: FileText, value: blog.length, label: 'Blog Posts', color: 'var(--brand-success)' },
    { icon: Shield, value: faqs.filter(f => f.aprovado).length, label: 'Aprovados IA', color: 'var(--brand-warning)' }
  ];

  return (
    <RouteGuard requireAuth>
      <PageHeader
        title="📚 Gestão de Conteúdo"
        description="Hub unificado: Blog, FAQ, Ajuda, Legal"
        action={
          <Button onClick={() => { setEditando(null); setModalAberto(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        }
      />

      <ContentStatsBar stats={stats} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="faq"><MessageSquare className="w-4 h-4 mr-2" />FAQ IA</TabsTrigger>
          <TabsTrigger value="ajuda"><BookOpen className="w-4 h-4 mr-2" />Ajuda</TabsTrigger>
          <TabsTrigger value="blog"><FileText className="w-4 h-4 mr-2" />Blog</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-6">
          <div className="pc-card p-6">
            <ContentListTable
              items={faqs}
              onEdit={(item) => { setEditando(item); setModalAberto(true); }}
              onDelete={handleDelete}
              columns={[
                { key: 'pergunta', label: 'Pergunta', render: (i) => i.pergunta },
                { key: 'categoria', label: 'Categoria', render: (i) => i.categoria },
                { key: 'aprovado', label: 'Status', render: (i) => i.aprovado ? '✅ Aprovado' : '⏳ Pendente' }
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="ajuda" className="mt-6">
          <div className="pc-card p-6">
            <ContentListTable
              items={ajuda}
              onEdit={(item) => { setEditando(item); setModalAberto(true); }}
              onDelete={handleDelete}
            />
          </div>
        </TabsContent>

        <TabsContent value="blog" className="mt-6">
          <div className="pc-card p-6">
            <p className="text-sm text-gray-600">Acesse <a href="/GestaoBlog" className="text-[#7E57FF] font-bold">GestaoBlog</a> para gerenciar artigos.</p>
          </div>
        </TabsContent>
      </Tabs>

      <ContentFormModal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null); }}
        onSave={handleSave}
        item={editando}
        fields={activeTab === "faq" ? faqFields : ajudaFields}
        editorMode="markdown"
      />
    </RouteGuard>
  );
}