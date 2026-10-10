import React from "react";
import ReactMarkdown from "react-markdown";
import { ThumbsUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * VISUALIZAÇÃO DETALHADA PÚBLICA - Blog/FAQ/Ajuda
 */
export default function ContentDetailPublic({ item, onBack, onMarkUseful }) {
  const titulo = item.titulo || item.pergunta;
  const conteudo = item.conteudo || item.resposta;
  const isHTML = item.conteudo_html;

  return (
    <div className="max-w-4xl mx-auto px-4 py-24">
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="bg-white rounded-2xl shadow-sm p-8 border" style={{ borderColor: 'var(--brand-border-primary)' }}>
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--brand-text-primary)' }}>
          {titulo}
        </h1>

        {isHTML ? (
          <div dangerouslySetInnerHTML={{ __html: conteudo }} className="prose max-w-none" />
        ) : (
          <ReactMarkdown className="prose max-w-none">
            {conteudo}
          </ReactMarkdown>
        )}

        {onMarkUseful && (
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--brand-border-primary)' }}>
            <p className="text-sm text-gray-600 mb-3">Este conteúdo foi útil?</p>
            <Button variant="outline" onClick={() => onMarkUseful(item)}>
              <ThumbsUp className="w-4 h-4 mr-2" />
              Sim, ajudou! ({item.util || item.util_count || 0})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}