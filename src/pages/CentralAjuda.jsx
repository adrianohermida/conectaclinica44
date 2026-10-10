import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import MetaTags from "@/components/seo/MetaTags";
import { useScrolled } from "@/components/hooks/useScrolled";
import ContentSearchBar from "@/components/conteudo/ContentSearchBar";
import ContentCategoryTabs from "@/components/conteudo/ContentCategoryTabs";
import ContentCard from "@/components/conteudo/ContentCard";
import ContentDetailPublic from "@/components/conteudo/ContentDetailPublic";
import { BookOpen, HelpCircle, AlertCircle, CheckCircle, LifeBuoy, MessageSquare } from "lucide-react";

export default function CentralAjuda() {
  const scrolled = useScrolled();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [itemSelecionado, setItemSelecionado] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  const { data: artigos = [] } = useQuery({
    queryKey: ['artigos-ajuda-interno'],
    queryFn: () => base44.entities.ArtigoAjuda.filter({ publicado: true, ativo: true }),
    initialData: []
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs-interno'],
    queryFn: () => base44.entities.ArtigoFAQ.filter({ aprovado: true, ativo: true }),
    initialData: []
  });

  const todosItens = [
    ...artigos.map(a => ({ ...a, _tipo: 'artigo' })),
    ...faqs.map(f => ({ ...f, _tipo: 'faq', titulo: f.pergunta, conteudo: f.resposta }))
  ];

  const categorias = [
    { value: "todas", label: "Todas", icon: BookOpen },
    { value: "primeiros_passos", label: "Primeiros Passos", icon: CheckCircle },
    { value: "agenda", label: "Agenda", icon: HelpCircle },
    { value: "pacientes", label: "Pacientes", icon: HelpCircle },
    { value: "troubleshooting", label: "Problemas", icon: AlertCircle }
  ];

  const itensFiltrados = todosItens.filter(item => {
    const matchCategoria = categoria === "todas" || item.categoria === categoria;
    const matchBusca = !busca || 
      item.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      item.pergunta?.toLowerCase().includes(busca.toLowerCase()) ||
      item.tags?.some(t => t.toLowerCase().includes(busca.toLowerCase()));
    return matchCategoria && matchBusca;
  });

  const marcarUtil = async (item) => {
    if (item._tipo === 'artigo') {
      await base44.entities.ArtigoAjuda.update(item.id, { util: (item.util || 0) + 1 });
    } else {
      await base44.entities.ArtigoFAQ.update(item.id, { util_count: (item.util_count || 0) + 1 });
    }
  };

  if (itemSelecionado) {
    return (
      <PublicPageWrapper>
        <div className="min-h-screen bg-white overflow-x-hidden">
          <PublicHeader scrolled={scrolled} />
          <div className="pt-20">
            <ContentDetailPublic
              item={itemSelecionado}
              onBack={() => setItemSelecionado(null)}
              onMarkUseful={marcarUtil}
            />
          </div>
          <PublicFooter />
        </div>
      </PublicPageWrapper>
    );
  }

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Central de Ajuda - ConectaClínica"
          description="Artigos, FAQs e documentação completa para usuários"
          keywords="ajuda, suporte, tutorial, FAQ"
        />
        <PublicHeader scrolled={scrolled} />

        <section className="pt-24 sm:pt-32 pb-8 overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h1 className="font-bold text-white mb-4 text-center break-words" style={{ fontSize: 'clamp(28px, 6vw, 48px)', lineHeight: '1.2' }}>
              Central de Ajuda
            </h1>
            <p className="text-center mb-6 break-words" style={{ color: 'var(--brand-text-disabled)', fontSize: 'clamp(16px, 3vw, 18px)' }}>
              Artigos, FAQs e documentação completa
            </p>
            
            <div className="flex justify-center">
              <Link to={createPageUrl("Helpdesk")}>
                <button 
                  className="font-medium px-6 py-3 rounded-full transition-all inline-flex items-center gap-2 min-h-[48px]"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Abrir Ticket de Suporte
                </button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-6">
              <ContentSearchBar
                value={busca}
                onChange={setBusca}
                placeholder="Pesquisar artigos e FAQs..."
              />
            </div>

            <div className="mb-6">
              <ContentCategoryTabs
                categories={categorias}
                active={categoria}
                onChange={setCategoria}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itensFiltrados.map(item => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onClick={setItemSelecionado}
                />
              ))}
            </div>

            {itensFiltrados.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--brand-text-tertiary)' }} />
                <p style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                  Nenhum resultado encontrado. Tente outros termos ou categorias.
                </p>
              </div>
            )}
          </div>
        </section>

        <PublicFooter />
      </div>
    </PublicPageWrapper>
  );
}