import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BUSCAR FAQ PARA IA - Knowledge Base
 * Retorna artigos aprovados filtrados por contexto
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { pergunta, contexto } = await req.json();

    // Buscar artigos aprovados
    const artigos = await base44.asServiceRole.entities.ArtigoFAQ.filter({
      ativo: true,
      aprovado: true
    });

    // Buscar por similaridade (simplificado - usar embeddings em produção)
    const keywords = pergunta.toLowerCase().split(' ');
    
    const scored = artigos.map(art => {
      let score = 0;
      const texto = `${art.pergunta} ${art.resposta} ${art.tags?.join(' ')}`.toLowerCase();
      
      keywords.forEach(kw => {
        if (texto.includes(kw)) score++;
      });

      // Bonus se categoria/módulo match
      if (contexto && art.modulo_vinculado === contexto) score += 5;
      
      return { ...art, score };
    });

    const relevantes = scored
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return Response.json({ 
      artigos: relevantes,
      total: relevantes.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});