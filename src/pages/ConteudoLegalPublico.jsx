import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Shield, Loader2 } from "lucide-react";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";

export default function ConteudoLegalPublico() {
  const [scrolled, setScrolled] = React.useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Extrair slug da URL
  const slug = new URLSearchParams(window.location.search).get('slug') || 
                window.location.pathname.split('/').pop();

  const { data: documento, isLoading } = useQuery({
    queryKey: ['conteudo-legal-publico', slug],
    queryFn: async () => {
      const docs = await base44.entities.ConteudoLegal.filter({ 
        slug,
        ativo: true,
        uso_tipo: 'publico'
      });
      return docs[0] || null;
    },
    staleTime: 15 * 60 * 1000
  });

  const titulo = documento?.titulo_custom || 
                 documento?.categoria_custom || 
                 'Documento Legal';

  if (isLoading) {
    return (
      <PublicPageWrapper>
        <PublicHeader scrolled={scrolled} />
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7E57FF]" />
        </div>
      </PublicPageWrapper>
    );
  }

  if (!documento) {
    return (
      <PublicPageWrapper>
        <PublicHeader scrolled={scrolled} />
        <div className="min-h-screen pt-20 px-4">
          <div className="max-w-4xl mx-auto py-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Documento não encontrado</h1>
            <p className="text-gray-600">O documento solicitado não existe ou foi removido.</p>
          </div>
        </div>
        <PublicFooter />
      </PublicPageWrapper>
    );
  }

  return (
    <PublicPageWrapper>
      <PublicHeader scrolled={scrolled} />
      
      <div className="min-h-screen pt-20 px-4" style={{ backgroundColor: '#F4F7FA' }}>
        <div className="max-w-4xl mx-auto py-12">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                <Shield className="w-6 h-6" style={{ color: '#7E57FF' }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#081828] mb-2">{titulo}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>Versão {documento.versao}</span>
                  {documento.metadata?.data_publicacao && (
                    <>
                      <span>•</span>
                      <span>
                        Atualizado em {new Date(documento.metadata.data_publicacao).toLocaleDateString('pt-BR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 prose prose-lg max-w-none">
            {documento.blocos
              .filter(b => b.visivel)
              .sort((a, b) => a.ordem - b.ordem)
              .map(bloco => (
                <div key={bloco.id} className="mb-8">
                  <h2 className="text-2xl font-bold text-[#202124] mb-4">{bloco.titulo}</h2>
                  <div 
                    dangerouslySetInnerHTML={{ __html: bloco.conteudo_html }}
                    className="text-gray-700 leading-relaxed"
                  />
                </div>
              ))}
          </div>

          {/* Footer Hash */}
          {documento.metadata?.hash_sha256 && (
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>Hash SHA-256: {documento.metadata.hash_sha256}</p>
            </div>
          )}
        </div>
      </div>

      <PublicFooter />
    </PublicPageWrapper>
  );
}