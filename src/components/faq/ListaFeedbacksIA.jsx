import React from "react";
import { Button } from "@/components/ui/Button";
import { Sparkles, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ListaFeedbacksIA({ feedbacks }) {
  const queryClient = useQueryClient();

  const aprovarMutation = useMutation({
    mutationFn: async (feedback) => {
      const user = await base44.auth.me();
      
      // Criar artigo FAQ
      const artigo = await base44.entities.ArtigoFAQ.create({
        secao: 'suporte',
        categoria: 'geral',
        pergunta: feedback.pergunta,
        resposta: feedback.resposta_humana || feedback.resposta_ia,
        resposta_curta: feedback.resposta_ia,
        tags: [],
        aprovado: true,
        aprovado_por: user.email,
        origem: 'ia_sugerida'
      });

      // Atualizar feedback
      await base44.entities.FeedbackUsuario.update(feedback.id, {
        status: 'publicado_faq',
        convertido_faq: true,
        artigo_faq_id: artigo.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feedbacks-pendentes']);
      queryClient.invalidateQueries(['artigos-faq']);
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: (id) => base44.entities.FeedbackUsuario.update(id, { status: 'rejeitado' }),
    onSuccess: () => queryClient.invalidateQueries(['feedbacks-pendentes'])
  });

  return (
    <div className="pc-card p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        Sugestões IA Pendentes ({feedbacks.length})
      </h2>

      <div className="space-y-4">
        {feedbacks.map(f => (
          <div key={f.id} className="border rounded-lg p-4 bg-purple-50">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-bold">{f.pergunta}</p>
                <p className="text-xs text-gray-500 mt-1">De: {f.usuario_email || 'Anônimo'} • {new Date(f.created_date).toLocaleDateString()}</p>
              </div>
              <span className={`pc-badge ${
                f.sentimento === 'positivo' ? 'pc-badge-success' :
                f.sentimento === 'negativo' ? 'pc-badge-error' : 'pc-badge-neutral'
              }`}>
                {f.sentimento}
              </span>
            </div>

            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-gray-600 mb-1">RESPOSTA IA:</p>
              <p className="text-sm">{f.resposta_ia}</p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={() => aprovarMutation.mutate(f)} loading={aprovarMutation.isPending}>
                <ThumbsUp className="w-3 h-3 mr-1" />
                Aprovar e Publicar
              </Button>
              <Button size="sm" variant="danger" onClick={() => rejeitarMutation.mutate(f.id)}>
                <ThumbsDown className="w-3 h-3 mr-1" />
                Rejeitar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}