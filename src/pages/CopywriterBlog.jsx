import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Send, Sparkles, Calendar, TrendingUp, FileText } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function CopywriterBlog() {
  usePerformanceTracker('/CopywriterBlog');
  const [conversationId, setConversationId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState("");
  const [gerando, setGerando] = useState(false);
  const queryClient = useQueryClient();

  const { data: artigos = [] } = useOptimizedQuery({
    queryKey: ['blog-stats'],
    queryFn: () => base44.entities.Blog.list('-created_date', 10)
  });

  const criarConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: "copywriter_blog",
      metadata: { name: "Sessão Copywriter", tipo: "blog_automation" }
    });
    setConversationId(conv.id);
    return conv;
  };

  const gerarArtigoAutomatico = async () => {
    setGerando(true);
    try {
      let conv = conversationId ? await base44.agents.getConversation(conversationId) : await criarConversation();
      
      await base44.agents.addMessage(conv, {
        role: "user",
        content: `Crie um artigo de blog otimizado para SEO sobre gestão de clínicas médicas. 

Requisitos:
- Título atrativo com palavra-chave (ex: "Como Automatizar Agendamentos em Clínicas Médicas")
- Resumo de 120-160 caracteres
- Conteúdo: 1000-1500 palavras, educacional e prático
- Incluir dados/estatísticas quando possível
- CTA sutil para ConectaClínica no final
- Tom: profissional, acessível, orientado a resultados
- Categoria: escolha entre tecnologia, medicina, gestao, ia, telemedicina, lgpd

Use dados reais sobre transformação digital em saúde, benefícios de IA, ROI comprovado.

Após criar o conteúdo, publique no banco de dados (entity Blog) com:
- publicado: true
- data_publicacao: hoje
- autor: "Equipe ConectaClínica"
- visualizacoes: 0`
      });

      setMensagens(prev => [...prev, { role: "user", content: "Gerando artigo..." }]);
      
      queryClient.invalidateQueries(['blog-stats']);
      setGerando(false);
      setMensagens(prev => [...prev, { role: "assistant", content: "✅ Artigo criado e publicado com sucesso!" }]);
    } catch (e) {
      setGerando(false);
      alert("Erro ao gerar artigo: " + e.message);
    }
  };

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
      <PageHeader
        title="Copywriter IA"
        description="Conteúdo automatizado"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Copywriter Blog" }
        ]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats */}
        <Card>
          <div className="p-6">
            <FileText className="w-8 h-8 mb-3" style={{ color: '#7E57FF' }} />
            <div className="text-3xl font-bold text-[#081828] mb-1">{artigos.length}</div>
            <div className="text-sm text-gray-600">Artigos Publicados</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6">
            <TrendingUp className="w-8 h-8 mb-3" style={{ color: '#34a853' }} />
            <div className="text-3xl font-bold text-[#081828] mb-1">
              {artigos.reduce((acc, a) => acc + (a.visualizacoes || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Visualizações Totais</div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <Calendar className="w-8 h-8 mb-3" style={{ color: '#f59e0b' }} />
            <div className="text-3xl font-bold text-[#081828] mb-1">
              {artigos.filter(a => {
                const created = new Date(a.created_date);
                const today = new Date();
                return created.toDateString() === today.toDateString();
              }).length}
            </div>
            <div className="text-sm text-gray-600">Publicados Hoje</div>
          </div>
        </Card>
      </div>

      {/* Geração */}
      <Card>
        <div className="p-8 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4" style={{ color: '#7E57FF' }} />
          <h2 className="text-2xl font-bold text-[#081828] mb-3">Gerador de Artigos com IA</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            O agente Copywriter pesquisa tendências, identifica palavras-chave de alto volume e cria artigos 
            otimizados para SEO que atraem clínicas médicas organicamente.
          </p>
          
          <button
            onClick={gerarArtigoAutomatico}
            disabled={gerando}
            className="text-white font-bold px-8 py-4 rounded-full hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
            style={{ backgroundColor: '#7E57FF' }}
          >
            {gerando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando artigo...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Artigo Agora
              </>
            )}
          </button>

          {mensagens.length > 0 && (
            <div className="mt-8 space-y-2 max-w-xl mx-auto">
              {mensagens.map((msg, idx) => (
                <div key={idx} className={`text-sm p-3 rounded-lg ${
                  msg.role === 'assistant' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
                }`}>
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Últimos Artigos */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold text-[#081828] mb-4">Últimos Artigos Gerados</h3>
          <div className="space-y-3">
            {artigos.slice(0, 5).map(artigo => (
              <div key={artigo.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#7E57FF' }} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-[#081828] truncate">{artigo.titulo}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{new Date(artigo.created_date).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>{artigo.visualizacoes || 0} views</span>
                    <span>•</span>
                    <span className="capitalize">{artigo.categoria}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>
    </RouteGuard>
  );
}