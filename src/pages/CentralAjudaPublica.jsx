import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MetaTags from "@/components/seo/MetaTags";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import ContentSearchBar from "@/components/conteudo/ContentSearchBar";
import { useScrolled } from "@/components/hooks/useScrolled";
import { 
  BookOpen, 
  HelpCircle, 
  LifeBuoy, 
  MessageSquare, 
  ChevronRight,
  Search,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";

export default function CentralAjudaPublica() {
  const [busca, setBusca] = useState("");
  const scrolled = useScrolled();

  const { data: artigos = [] } = useQuery({
    queryKey: ['artigos-ajuda-publico'],
    queryFn: () => base44.entities.ArtigoAjuda.filter({ publicado: true, ativo: true }),
    initialData: []
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs-publico'],
    queryFn: () => base44.entities.ArtigoFAQ.filter({ aprovado: true, ativo: true }),
    initialData: []
  });

  const categorias = [
    { 
      id: "primeiros_passos", 
      label: "Primeiros Passos", 
      icon: CheckCircle,
      artigos: artigos.filter(a => a.categoria === 'primeiros_passos').slice(0, 5)
    },
    { 
      id: "agenda", 
      label: "Agendamento", 
      icon: Clock,
      artigos: artigos.filter(a => a.categoria === 'agenda').slice(0, 5)
    },
    { 
      id: "pacientes", 
      label: "Pacientes", 
      icon: HelpCircle,
      artigos: artigos.filter(a => a.categoria === 'pacientes').slice(0, 5)
    }
  ];

  const faqsPopulares = faqs.sort((a, b) => (b.visualizacoes || 0) - (a.visualizacoes || 0)).slice(0, 6);

  const artigosFiltrados = busca 
    ? artigos.filter(a => 
        a.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        a.tags?.some(t => t.toLowerCase().includes(busca.toLowerCase()))
      )
    : [];

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Central de Ajuda - ConectaClínica"
          description="Encontre respostas rápidas sobre gestão de clínicas, agendamento, prontuários e mais."
          keywords="ajuda, suporte, tutorial, FAQ, central de ajuda"
        />

        <PublicHeader scrolled={scrolled} />

        {/* Hero com Busca */}
        <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="font-bold text-white mb-4 break-words" style={{ fontSize: 'clamp(28px, 6vw, 48px)', lineHeight: '1.2' }}>
              Como podemos ajudar?
            </h1>
            <p className="mb-8 break-words" style={{ color: 'var(--brand-text-disabled)', fontSize: 'clamp(16px, 3vw, 20px)' }}>
              Pesquise artigos e encontre respostas rápidas
            </p>

            {/* Search Bar - Destaque */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--brand-text-tertiary)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar artigos e FAQs..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-base focus:outline-none min-h-[56px]"
                style={{ 
                  backgroundColor: 'var(--brand-bg-primary)',
                  border: '2px solid var(--brand-border-primary)',
                  color: 'var(--brand-text-primary)'
                }}
                aria-label="Pesquisar na central de ajuda"
              />
            </div>
          </div>
        </section>

        {/* Resultados de Busca */}
        {busca && (
          <section className="py-8 border-b" style={{ backgroundColor: 'var(--brand-bg-secondary)', borderColor: 'var(--brand-border-primary)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="font-bold mb-4" style={{ color: 'var(--brand-text-primary)', fontSize: '20px' }}>
                {artigosFiltrados.length} resultado{artigosFiltrados.length !== 1 ? 's' : ''} encontrado{artigosFiltrados.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-3">
                {artigosFiltrados.map(artigo => (
                  <Link
                    key={artigo.id}
                    to={createPageUrl(`CentralAjuda?article=${artigo.id}`)}
                    className="block bg-white rounded-lg p-4 hover:shadow-md transition-all border"
                    style={{ borderColor: 'var(--brand-border-primary)' }}
                  >
                    <h3 className="font-bold mb-1" style={{ color: 'var(--brand-text-primary)', fontSize: '16px' }}>
                      {artigo.titulo}
                    </h3>
                    <p className="line-clamp-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                      {artigo.conteudo?.substring(0, 150)}...
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Categorias - Freshdesk Style */}
        {!busca && (
          <section className="py-12 sm:py-16" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--brand-text-primary)' }}>
                Navegue por Categoria
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categorias.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} className="bg-white rounded-xl p-6 shadow-sm border" style={{ borderColor: 'var(--brand-border-primary)' }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                          <Icon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <h3 className="font-bold" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>
                          {cat.label}
                        </h3>
                      </div>
                      
                      <ul className="space-y-2">
                        {cat.artigos.map(artigo => (
                          <li key={artigo.id}>
                            <Link
                              to={createPageUrl(`CentralAjuda?article=${artigo.id}`)}
                              className="flex items-start gap-2 py-2 hover:opacity-70 transition-opacity group"
                            >
                              <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--brand-text-tertiary)' }} />
                              <span className="text-sm" style={{ color: 'var(--brand-text-secondary)' }}>
                                {artigo.titulo}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      
                      <Link
                        to={createPageUrl(`CentralAjuda?category=${cat.id}`)}
                        className="inline-flex items-center gap-1 mt-4 font-medium text-sm hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Ver todos
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* FAQs Populares */}
        {!busca && faqsPopulares.length > 0 && (
          <section className="py-12 sm:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--brand-text-primary)' }}>
                Perguntas Frequentes
              </h2>
              
              <div className="space-y-4">
                {faqsPopulares.map(faq => (
                  <details key={faq.id} className="bg-white rounded-lg border overflow-hidden group" style={{ borderColor: 'var(--brand-border-primary)' }}>
                    <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none hover:bg-gray-50 transition-colors min-h-[60px]">
                      <span className="font-medium pr-4" style={{ color: 'var(--brand-text-primary)', fontSize: '16px' }}>
                        {faq.pergunta}
                      </span>
                      <ChevronRight className="w-5 h-5 flex-shrink-0 group-open:rotate-90 transition-transform" style={{ color: 'var(--brand-text-tertiary)' }} />
                    </summary>
                    <div className="px-6 pb-4 pt-2 border-t" style={{ borderColor: 'var(--brand-border-secondary)' }}>
                      <p style={{ color: 'var(--brand-text-secondary)', fontSize: '15px', lineHeight: '1.6' }}>
                        {faq.resposta}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Suporte */}
        <section className="py-16" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border text-center" style={{ borderColor: 'var(--brand-border-primary)' }}>
              <LifeBuoy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>
                Não encontrou o que procurava?
              </h2>
              <p className="mb-6" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                Nossa equipe está pronta para ajudar
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={createPageUrl("Helpdesk")} className="w-full sm:w-auto">
                  <button 
                    className="w-full sm:w-auto font-bold px-6 py-3 rounded-full transition-all min-h-[48px] inline-flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)' }}
                  >
                    <MessageSquare className="w-5 h-5" />
                    Abrir Ticket
                  </button>
                </Link>
                <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <button 
                    className="w-full sm:w-auto font-medium px-6 py-3 rounded-full transition-all min-h-[48px] border-2 inline-flex items-center justify-center gap-2"
                    style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)', backgroundColor: 'transparent' }}
                  >
                    <span className="text-lg">💬</span>
                    WhatsApp
                  </button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </PublicPageWrapper>
  );
}