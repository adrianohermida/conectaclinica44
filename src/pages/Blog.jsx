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
import { Building2, Calendar, User, ArrowRight, Tag } from "lucide-react";
import { useScrolled } from "@/components/hooks/useScrolled";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ContentSearchBar from "@/components/conteudo/ContentSearchBar";
import ContentCategoryTabs from "@/components/conteudo/ContentCategoryTabs";

export default function Blog() {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const scrolled = useScrolled();

  const { data: artigos = [], isLoading } = useQuery({
    queryKey: ['blog-artigos'],
    queryFn: () => base44.entities.Blog.filter({ publicado: true }),
    initialData: []
  });

  const categorias = [
    { value: "todos", label: "Todos" },
    { value: "tecnologia", label: "Tecnologia" },
    { value: "medicina", label: "Medicina" },
    { value: "gestao", label: "Gestão" },
    { value: "ia", label: "IA" },
    { value: "telemedicina", label: "Telemedicina" },
    { value: "lgpd", label: "LGPD" },
    { value: "tutorial", label: "Tutorial" }
  ];

  const artigosFiltrados = artigos
    .filter(a => categoriaFiltro === "todos" || a.categoria === categoriaFiltro)
    .filter(a => !busca || a.titulo.toLowerCase().includes(busca.toLowerCase()) || a.resumo?.toLowerCase().includes(busca.toLowerCase()));

  const artigoDestaque = artigosFiltrados[0];
  const outrosArtigos = artigosFiltrados.slice(1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-32 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mx-auto mb-4" />
          <div className="h-6 bg-gray-200 rounded w-96 mx-auto mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
                <div className="aspect-video bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-16" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicPageWrapper>
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MetaTags 
        title="Blog ConectaClínica - Conteúdo sobre Gestão de Clínicas"
        description="Artigos, tutoriais e novidades sobre gestão de clínicas médicas, telemedicina, IA na saúde e transformação digital."
        keywords="blog saúde, gestão clínica, telemedicina, IA médica, prontuário eletrônico"
      />

      <PublicHeader scrolled={scrolled} />
      <PublicHero title="Blog ConectaClínica" subtitle="Conteúdo estratégico para médicos e gestores de clínicas">
        <div className="max-w-2xl mx-auto mt-8">
          <ContentSearchBar
            value={busca}
            onChange={setBusca}
            placeholder="Pesquisar artigos..."
          />
        </div>
      </PublicHero>

      {/* Filtros */}
      <section className="py-6 overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)', borderBottom: '1px solid var(--brand-border-secondary)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <ContentCategoryTabs
            categories={categorias}
            active={categoriaFiltro}
            onChange={setCategoriaFiltro}
          />
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-16 overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 overflow-hidden">
          {isLoading ? (
            <div className="space-y-8">
              {/* Skeleton Destaque */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-video bg-gray-200" />
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                    <div className="flex gap-4">
                      <div className="h-4 bg-gray-200 rounded w-20" />
                      <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Skeleton Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                    <div className="aspect-video bg-gray-200" />
                    <div className="p-4 sm:p-6 space-y-3">
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                      <div className="h-6 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-5/6" />
                      <div className="flex justify-between pt-4">
                        <div className="h-3 bg-gray-200 rounded w-20" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : artigosFiltrados.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                <Tag className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Nenhum artigo encontrado</h3>
              <p className="text-sm sm:text-base text-gray-600">Tente buscar por outros termos ou categorias</p>
            </div>
          ) : (
            <>
              {/* Destaque */}
              {artigoDestaque && (
                <Link to={createPageUrl(`BlogPost?id=${artigoDestaque.id}`)} className="block mb-12">
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
                      <div className="aspect-video flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(to bottom right, var(--brand-primary), var(--brand-primary-600))' }}>
                        {artigoDestaque.imagem_capa ? (
                          <img src={artigoDestaque.imagem_capa} alt={artigoDestaque.titulo} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-white font-bold" style={{ fontSize: 'clamp(48px, 10vw, 64px)' }}>📰</span>
                        )}
                      </div>
                      <div className="p-6 md:p-8 flex flex-col justify-center overflow-hidden min-w-0">
                        <div className="flex items-center gap-3 mb-4 flex-wrap overflow-hidden">
                          <span className="px-3 py-1.5 rounded-full font-bold text-white whitespace-nowrap" style={{ backgroundColor: 'var(--brand-primary)', fontSize: '13px' }}>
                            DESTAQUE
                          </span>
                          <span className="capitalize truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '14px' }}>{artigoDestaque.categoria}</span>
                        </div>
                        <h2 className="font-bold mb-4 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(20px, 4vw, 28px)', lineHeight: '1.3' }}>
                          {artigoDestaque.titulo}
                        </h2>
                        <p className="mb-6 line-clamp-3 break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px', lineHeight: '1.5' }}>
                          {artigoDestaque.resumo}
                        </p>
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 overflow-hidden">
                          <span className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-text-tertiary)' }} />
                            <span className="truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '14px' }}>{artigoDestaque.autor}</span>
                          </span>
                          {artigoDestaque.data_publicacao && (
                            <span className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-text-tertiary)' }} />
                              <span className="truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '14px' }}>{format(new Date(artigoDestaque.data_publicacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 overflow-hidden">
                {outrosArtigos.map(artigo => (
                  <Link key={artigo.id} to={createPageUrl(`BlogPost?id=${artigo.id}`)} className="block">
                    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all h-full flex flex-col overflow-hidden" style={{ borderColor: 'var(--brand-border-primary)', border: '1px solid' }}>
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                        {artigo.imagem_capa ? (
                          <img src={artigo.imagem_capa} alt={artigo.titulo} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span style={{ fontSize: 'clamp(40px, 8vw, 56px)' }}>📝</span>
                        )}
                      </div>
                      <div className="p-5 sm:p-6 flex-1 flex flex-col overflow-hidden min-w-0">
                        <span className="font-bold uppercase mb-2 truncate" style={{ color: 'var(--brand-primary)', fontSize: '13px' }}>
                          {artigo.categoria}
                        </span>
                        <h3 className="font-bold mb-3 line-clamp-2 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(16px, 3vw, 20px)', lineHeight: '1.3' }}>
                          {artigo.titulo}
                        </h3>
                        <p className="mb-4 line-clamp-3 flex-1 break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                          {artigo.resumo}
                        </p>
                        <div className="flex items-center justify-between pt-4 gap-2 overflow-hidden" style={{ borderTop: '1px solid var(--brand-border-secondary)' }}>
                          <span className="truncate flex-1 min-w-0" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>{artigo.autor}</span>
                          {artigo.data_publicacao && (
                            <span className="whitespace-nowrap flex-shrink-0" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>{format(new Date(artigo.data_publicacao), "dd/MM/yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="max-w-4xl mx-auto text-center px-3 sm:px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 break-words">
            Pronto para modernizar sua clínica?
          </h2>
          <Link to={createPageUrl("Dashboard")}>
            <button className="text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-full text-base sm:text-lg hover:opacity-90 transition-all min-h-[48px] inline-flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <span className="whitespace-nowrap">Começar Agora Grátis</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            </button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
    </PublicPageWrapper>
  );
}