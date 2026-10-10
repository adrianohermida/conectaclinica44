import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import MetaTags from "@/components/seo/MetaTags";
import { Calendar, User, ArrowLeft, Tag } from "lucide-react";
import { useScrolled } from "@/components/hooks/useScrolled";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export default function BlogPost() {
  const scrolled = useScrolled();
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', postId],
    queryFn: async () => {
      const posts = await base44.entities.Blog.filter({ id: postId });
      if (posts.length > 0) {
        // Increment views
        await base44.entities.Blog.update(postId, { visualizacoes: (posts[0].visualizacoes || 0) + 1 });
        return posts[0];
      }
      return null;
    },
    enabled: !!postId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        <PublicHeader scrolled={scrolled} />
        {/* Hero Skeleton */}
        <section className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 animate-pulse overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="h-5 w-32 bg-gray-700 rounded mb-8" />
            <div className="h-12 sm:h-16 bg-gray-700 rounded w-3/4 mb-6" />
            <div className="flex flex-col xs:flex-row gap-4 overflow-hidden">
              <div className="h-5 w-40 bg-gray-700 rounded" />
              <div className="h-5 w-32 bg-gray-700 rounded" />
            </div>
          </div>
        </section>
        {/* Content Skeleton */}
        <section className="py-12 sm:py-16 animate-pulse overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 space-y-4 overflow-hidden">
              <div className="aspect-video bg-gray-200 rounded-xl" />
              <div className="space-y-3 overflow-hidden">
                <div className="h-5 bg-gray-200 rounded w-full" />
                <div className="h-5 bg-gray-200 rounded w-5/6" />
                <div className="h-5 bg-gray-200 rounded w-4/5" />
                <div className="h-5 bg-gray-200 rounded w-full" />
                <div className="h-5 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        </section>
        <PublicFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        <PublicHeader scrolled={scrolled} />
        <div className="flex flex-col items-center justify-center gap-6 px-3 sm:px-4 py-20 sm:py-32" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
            <Tag className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Artigo não encontrado</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">O artigo que você procura não existe ou foi removido</p>
            <Link to={createPageUrl("Blog")}>
              <button className="text-white font-medium px-6 py-3 rounded-full hover:opacity-90 transition-all min-h-[48px] inline-flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Ver todos os artigos
              </button>
            </Link>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MetaTags 
        title={`${post.titulo} - Blog ConectaClínica`}
        description={post.resumo}
        type="article"
        author={post.autor}
        publishedTime={new Date(post.data_publicacao || post.created_date).toISOString()}
        keywords={Array.isArray(post.tags) ? post.tags.join(", ") : ""}
        schema={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.titulo,
          "description": post.resumo,
          "author": {
            "@type": "Person",
            "name": post.autor
          },
          "datePublished": new Date(post.data_publicacao || post.created_date).toISOString(),
          "image": post.imagem_capa
        }}
      />
      <PublicHeader scrolled={scrolled} />

      {/* Post Hero */}
      <section className="pt-24 sm:pt-32 md:pt-40 pb-12 sm:pb-16 overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 overflow-hidden">
          <Link to={createPageUrl("Blog")} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors min-h-[48px]" style={{ fontSize: '14px' }}>
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span>Voltar ao Blog</span>
          </Link>
          <h1 className="font-bold text-white mb-6 break-words" style={{ fontSize: 'clamp(24px, 6vw, 48px)', lineHeight: '1.2' }}>{post.titulo}</h1>
          <div className="flex flex-col xs:flex-row flex-wrap items-start xs:items-center gap-4 text-gray-400 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate" style={{ fontSize: '14px' }}>{post.autor} {post.autor_cargo && `• ${post.autor_cargo}`}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate" style={{ fontSize: '14px' }}>{format(new Date(post.data_publicacao || post.created_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Post Content */}
      <section className="py-12 sm:py-16 overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 md:p-12 overflow-hidden">
            {post.imagem_capa && (
              <img 
                src={post.imagem_capa} 
                alt={post.titulo} 
                className="w-full rounded-lg sm:rounded-xl mb-6 sm:mb-8 max-w-full h-auto" 
                loading="lazy"
              />
            )}

            <ReactMarkdown 
              className="prose max-w-none break-words overflow-hidden"
              components={{
                h1: ({children}) => <h1 className="font-bold mb-6 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(24px, 5vw, 36px)', lineHeight: '1.2' }}>{children}</h1>,
                h2: ({children}) => <h2 className="font-bold mb-4 mt-8 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(20px, 4vw, 28px)', lineHeight: '1.3' }}>{children}</h2>,
                h3: ({children}) => <h3 className="font-bold mb-3 mt-6 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(18px, 3.5vw, 24px)', lineHeight: '1.4' }}>{children}</h3>,
                p: ({children}) => <p className="mb-4 leading-relaxed break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>{children}</p>,
                a: ({children, href}) => <a href={href} className="font-bold hover:opacity-80 transition-opacity break-all" style={{ color: 'var(--brand-primary)' }} target="_blank" rel="noopener noreferrer">{children}</a>,
                ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2 overflow-hidden">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2 overflow-hidden">{children}</ol>,
                li: ({children}) => <li className="break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>{children}</li>,
                blockquote: ({children}) => <blockquote className="border-l-4 pl-4 py-2 my-6 bg-gray-50 rounded-r-lg overflow-hidden" style={{ borderLeftColor: 'var(--brand-primary)' }}>{children}</blockquote>,
                code: ({inline, children}) => inline ? 
                  <code className="bg-gray-100 px-2 py-0.5 rounded break-all" style={{ color: 'var(--brand-primary)', fontSize: '14px' }}>{children}</code> : 
                  <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto" style={{ fontSize: '14px' }}>{children}</code>,
                img: ({src, alt}) => <img src={src} alt={alt} className="w-full rounded-xl my-6 max-w-full h-auto" loading="lazy" />
              }}
            >
              {post.conteudo}
            </ReactMarkdown>

            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 overflow-hidden" style={{ borderTop: '1px solid var(--brand-border-secondary)' }}>
                <div className="flex items-start gap-2 flex-wrap overflow-hidden">
                  <Tag className="w-4 h-4 text-gray-400 mt-1.5 flex-shrink-0" />
                  <div className="flex flex-wrap gap-2 flex-1 overflow-hidden">
                    {post.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-gray-100 rounded-full whitespace-nowrap" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px', fontWeight: '500' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center bg-white rounded-2xl shadow-lg p-8 overflow-hidden" style={{ borderTop: '4px solid var(--brand-primary)' }}>
            <h3 className="font-bold mb-3 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: 'clamp(18px, 4vw, 24px)' }}>Gostou do conteúdo?</h3>
            <p className="mb-6 break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>Modernize sua clínica com o ConectaClínica</p>
            <Link to={createPageUrl("Dashboard")}>
              <button aria-label="Começar teste grátis" className="font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] inline-flex items-center justify-center px-8" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)', fontSize: '16px' }}>
                Começar Agora Grátis
              </button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}