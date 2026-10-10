import React, { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Plus, Sparkles, Brain } from "lucide-react";
import ContentListTable from "@/components/conteudo/ContentListTable";
import ContentFormModal from "@/components/conteudo/ContentFormModal";
import ContentFilters from "@/components/conteudo/ContentFilters";
import ContentApprovalBadge from "@/components/conteudo/ContentApprovalBadge";
import ListaFeedbacksIA from "@/components/faq/ListaFeedbacksIA";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GestaoFAQ() {
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("all");
  const queryClient = useQueryClient();

  const { data: artigos = [] } = useQuery({
    queryKey: ['artigos-faq'],
    queryFn: () => base44.entities.ArtigoFAQ.list('-ordem')
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['feedbacks-pendentes'],
    queryFn: () => base44.entities.FeedbackUsuario.filter({ status: 'pendente_aprovacao' })
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editando 
      ? base44.entities.ArtigoFAQ.update(editando.id, data)
      : base44.entities.ArtigoFAQ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['artigos-faq']);
      setModalAberto(false);
      setEditando(null);
      toast.success("FAQ salvo!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ArtigoFAQ.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['artigos-faq'])
  });

  const aprovarMutation = useMutation({
    mutationFn: async (id) => {
      const user = await base44.auth.me();
      return base44.entities.ArtigoFAQ.update(id, { aprovado: true, aprovado_por: user.email });
    },
    onSuccess: () => queryClient.invalidateQueries(['artigos-faq'])
  });

  const categorias = [
    { value: 'all', label: 'Todas' },
    { value: 'agenda', label: 'Agenda' },
    { value: 'pacientes', label: 'Pacientes' },
    { value: 'prontuarios', label: 'Prontuários' },
    { value: 'geral', label: 'Geral' }
  ];

  const filtered = (artigos || []).filter(a => 
    (categoria === 'all' || a.categoria === categoria) &&
    (!busca || a.pergunta?.toLowerCase().includes(busca.toLowerCase()))
  );

  const fields = [
    { key: 'secao', label: 'Seção', type: 'select', options: [
      { value: 'produto', label: 'Produto' },
      { value: 'tecnico', label: 'Técnico' },
      { value: 'comercial', label: 'Comercial' }
    ]},
    { key: 'categoria', label: 'Categoria', type: 'select', options: categorias.filter(c => c.value !== 'all') },
    { key: 'pergunta', label: 'Pergunta', type: 'text' },
    { key: 'resposta', label: 'Resposta', type: 'editor' },
    { key: 'resposta_curta', label: 'Resposta Curta', type: 'text' },
    { key: 'aprovado', label: 'Aprovado IA', type: 'checkbox' }
  ];

  return (
    <RouteGuard requireAuth>
      <PageHeader
        title="📚 Gestão FAQ"
        description="Knowledge base para IA e Central de Ajuda"
        action={
          <div className="flex gap-2">
            <Link to={createPageUrl("DashboardInteligenciaFAQ")}>
              <Button variant="outline">
                <Brain className="w-4 h-4 mr-2" />
                Inteligência
              </Button>
            </Link>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo FAQ
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="pc-card p-4">
            <ContentFilters
              busca={busca}
              onBuscaChange={setBusca}
              categoria={categoria}
              onCategoriaChange={setCategoria}
              categorias={categorias}
              placeholder="Pesquisar FAQs..."
            />
          </div>

          {feedbacks.length > 0 && (
            <div className="pc-card p-4 mt-4 bg-yellow-50 border-2 border-yellow-500">
              <p className="text-xs font-bold text-yellow-800 mb-2">
                🤖 {feedbacks.length} Sugestões IA
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="pc-card">
            <ContentListTable
              items={filtered}
              onEdit={(item) => { setEditando(item); setModalAberto(true); }}
              onDelete={(id) => deleteMutation.mutate(id)}
              columns={[
                { key: 'pergunta', label: 'Pergunta', render: (i) => (
                  <div className="flex items-center gap-2">
                    <ContentApprovalBadge aprovado={i.aprovado} origem={i.origem} />
                    <span>{i.pergunta}</span>
                  </div>
                )},
                { key: 'categoria', label: 'Categoria', render: (i) => i.categoria }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ListaFeedbacksIA feedbacks={feedbacks} />
      </div>

      <ContentFormModal
        open={modalAberto}
        onClose={() => { setModalAberto(false); setEditando(null); }}
        onSave={(data) => saveMutation.mutate(data)}
        item={editando}
        fields={fields}
        editorMode="markdown"
      />
    </RouteGuard>
  );
}