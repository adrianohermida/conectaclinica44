import React from "react";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import MetaTags from "@/components/seo/MetaTags";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useScrolled } from "@/components/hooks/useScrolled";
import { FileText, Calendar } from "lucide-react";

export default function TermosUso() {
  const scrolled = useScrolled();

  const { data: conteudoLegal, isLoading } = useQuery({
    queryKey: ['conteudo-legal-termos-uso'],
    queryFn: async () => {
      const docs = await base44.entities.ConteudoLegal.filter({ 
        tipo_documento: 'termos_uso', 
        ativo: true 
      });
      return docs[0];
    },
    staleTime: 5 * 60 * 1000
  });

  const blocos = conteudoLegal?.blocos || [];

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Termos de Uso - ConectaClínica"
          description="Termos e condições de uso da plataforma ConectaClínica"
          keywords="termos de uso, termos, condições, legal"
        />
        <PublicHeader scrolled={scrolled} />
        
        <PublicHero 
          title="Termos de Uso" 
          subtitle="Transparência total sobre o uso da plataforma"
        />

        <section className="py-12 sm:py-16" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {isLoading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : blocos.length > 0 ? (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border space-y-8" style={{ borderColor: 'var(--brand-border-primary)' }}>
                {conteudoLegal?.metadata?.data_publicacao && (
                  <div className="flex items-center gap-4 text-sm pb-6 border-b" style={{ color: 'var(--brand-text-secondary)', borderColor: 'var(--brand-border-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Última atualização: {new Date(conteudoLegal.metadata.data_publicacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span>•</span>
                    <span>Versão {conteudoLegal.versao}</span>
                  </div>
                )}

                {blocos.filter(b => b.visivel).sort((a, b) => a.ordem - b.ordem).map(bloco => (
                  <div key={bloco.id}>
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>{bloco.titulo}</h2>
                    <div
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: bloco.conteudo_html }}
                      style={{ color: 'var(--brand-text-primary)' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--brand-text-disabled)' }} />
                <p style={{ color: 'var(--brand-text-secondary)', fontSize: '18px' }}>
                  Termos de Uso não disponíveis no momento
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