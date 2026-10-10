import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import ContentFormModal from "@/components/conteudo/ContentFormModal";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import PageHeader from "@/components/ui/PageHeader";

export default function GestaoBlog() {
  usePerformanceTracker('/GestaoBlog');
  const [panelAberto, setPanelAberto] = useState(false);
  const [artigoEditando, setArtigoEditando] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const { data: artigos = [], isLoading } = useOptimizedQuery({
    queryKey: ['blog-admin'],
    queryFn: () => base44.entities.Blog.list('-created_date')
  });

  const [form, setForm] = useState({
    titulo: "",
    slug: "",
    resumo: "",
    conteudo: "",
    categoria: "gestao",
    autor: "",
    publicado: false,
    imagem_capa: "",
    tags: []
  });

  const salvarArtigo = useMutation({
    mutationFn: (data) => {
      if (artigoEditando) {
        return base44.entities.Blog.update(artigoEditando.id, data);
      }
      return base44.entities.Blog.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-admin']);
      setPanelAberto(false);
      setArtigoEditando(null);
      toast.success("Artigo salvo!");
    }
  });

  const deletarArtigo = useMutation({
    mutationFn: (id) => base44.entities.Blog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['blog-admin']);
      toast.success("Artigo deletado");
    }
  });

  const novoArtigo = () => {
    setForm({
      titulo: "",
      slug: "",
      resumo: "",
      conteudo: "",
      categoria: "gestao",
      autor: "",
      publicado: false,
      imagem_capa: "",
      tags: []
    });
    setArtigoEditando(null);
    setPanelAberto(true);
  };

  const editarArtigo = (artigo) => {
    setForm(artigo);
    setArtigoEditando(artigo);
    setPanelAberto(true);
  };

  if (pageLoading || isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded mb-3" />
            ))}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Blog"
        description="Gestão de artigos"
        action={
          <button
            onClick={novoArtigo}
            aria-label="Criar novo artigo"
            className="font-bold rounded-full hover:opacity-90 min-h-[48px] px-6 inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)', fontSize: '14px' }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            Novo Artigo
          </button>
        }
      />

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead style={{ borderBottom: '1px solid #f1f3f4' }}>
              <tr>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Título</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Categoria</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Autor</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Status</th>
                <th className="text-left p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Views</th>
                <th className="text-right p-4 font-bold" style={{ color: '#5f6368', fontSize: '14px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {artigos.map(art => (
                <tr key={art.id} style={{ borderBottom: '1px solid #f8f9fa' }} className="hover:bg-gray-50">
                  <td className="p-4 font-bold break-words" style={{ color: '#202124', fontSize: '14px' }}>{art.titulo}</td>
                  <td className="p-4" style={{ color: '#5f6368', fontSize: '14px' }}>{art.categoria}</td>
                  <td className="p-4" style={{ color: '#5f6368', fontSize: '14px' }}>{art.autor}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1.5 rounded-full font-bold ${
                      art.publicado ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`} style={{ fontSize: '13px' }}>
                      {art.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="p-4" style={{ color: '#5f6368', fontSize: '14px' }}>
                    <Eye className="w-4 h-4 inline mr-1 flex-shrink-0" />
                    {art.visualizacoes || 0}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => editarArtigo(art)} aria-label="Editar artigo" className="p-2.5 hover:bg-purple-50 rounded-xl mr-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                      <Edit className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    </button>
                    <button onClick={() => deletarArtigo.mutate(art.id)} aria-label="Deletar artigo" className="p-2.5 hover:bg-red-50 rounded-xl min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ContentFormModal
        open={panelAberto}
        onClose={() => setPanelAberto(false)}
        onSave={(data) => salvarArtigo.mutate(data)}
        item={artigoEditando}
        fields={[
          { key: 'titulo', label: 'Título', type: 'text' },
          { key: 'resumo', label: 'Resumo', type: 'text' },
          { key: 'conteudo', label: 'Conteúdo', type: 'editor' },
          { key: 'categoria', label: 'Categoria', type: 'select', options: [
            { value: 'tecnologia', label: 'Tecnologia' },
            { value: 'medicina', label: 'Medicina' },
            { value: 'gestao', label: 'Gestão' },
            { value: 'ia', label: 'IA' },
            { value: 'telemedicina', label: 'Telemedicina' },
            { value: 'lgpd', label: 'LGPD' }
          ]},
          { key: 'autor', label: 'Autor', type: 'text' },
          { key: 'imagem_capa', label: 'URL Imagem Capa', type: 'text', placeholder: 'https://...' },
          { key: 'publicado', label: 'Publicar artigo', type: 'checkbox' }
        ]}
        editorMode="markdown"
      />
      </div>
    </RouteGuard>
  );
}