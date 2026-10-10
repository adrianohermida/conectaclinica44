import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Salva conversa do widget para análise posterior
 * Detecta intenção, resultado, sentimento e gaps
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      sessao_id,
      mensagens,
      lead_id,
      resultado,
      converteu_em,
      tempo_total_conversa_seg,
      tempo_resposta_media_ms,
      custo_openai_usd
    } = await req.json();

    if (!sessao_id || !mensagens || mensagens.length === 0) {
      return Response.json({ error: 'sessao_id e mensagens são obrigatórios' }, { status: 400 });
    }

    // Detectar intenção predominante
    const intencao = detectarIntencao(mensagens);
    
    // Detectar sentimento
    const sentimento = detectarSentimento(mensagens);
    
    // Identificar perguntas sem resposta
    const perguntasSemResposta = identificarGaps(mensagens);
    
    // Extrair objeções
    const objecoes = extrairObjecoes(mensagens);

    // Salvar conversa
    const conversa = await base44.asServiceRole.entities.ConversaWidget.create({
      sessao_id,
      lead_id,
      mensagens,
      resultado: resultado || 'em_andamento',
      converteu_em,
      intencao_detectada: intencao,
      sentimento,
      tempo_resposta_media_ms,
      tempo_total_conversa_seg,
      perguntas_sem_resposta: perguntasSemResposta,
      objecoes_registradas: objecoes,
      custo_openai_usd,
      analisado_por_ia: false
    });

    return Response.json({
      success: true,
      conversa_id: conversa.id,
      metadata: {
        intencao,
        sentimento,
        gaps: perguntasSemResposta.length,
        objecoes: objecoes.length
      }
    });

  } catch (error) {
    console.error('Erro ao salvar conversa:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectarIntencao(mensagens) {
  const textoCompleto = mensagens
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  // Palavras-chave por intenção
  const patterns = {
    comercial: ['preço', 'quanto custa', 'plano', 'trial', 'gratuito', 'contratar', 'comprar'],
    demo: ['demonstração', 'demo', 'mostrar', 'ver funcionando', 'conhecer'],
    suporte: ['problema', 'erro', 'não funciona', 'bug', 'ajuda', 'suporte'],
    duvida: ['como funciona', 'dúvida', 'pergunta', 'o que é', 'explica']
  };

  for (const [intencao, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => textoCompleto.includes(kw))) {
      return intencao;
    }
  }

  return 'outro';
}

function detectarSentimento(mensagens) {
  const textoUsuario = mensagens
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  const negativas = ['ruim', 'péssimo', 'não gostei', 'frustrado', 'difícil', 'complicado', 'não entendi'];
  const positivas = ['ótimo', 'excelente', 'gostei', 'perfeito', 'obrigado', 'adorei'];

  const countNeg = negativas.filter(p => textoUsuario.includes(p)).length;
  const countPos = positivas.filter(p => textoUsuario.includes(p)).length;

  if (countNeg > countPos && countNeg > 0) return 'negativo';
  if (countPos > countNeg && countPos > 0) return 'positivo';
  if (countNeg > 2) return 'frustrado';
  
  return 'neutro';
}

function identificarGaps(mensagens) {
  const gaps = [];
  
  for (let i = 0; i < mensagens.length; i++) {
    const msg = mensagens[i];
    if (msg.role === 'user') {
      const proximaIA = mensagens[i + 1];
      
      // Se IA respondeu com "não sei" ou "não encontrei"
      if (proximaIA && proximaIA.role === 'assistant') {
        const respostaIA = proximaIA.content.toLowerCase();
        if (
          respostaIA.includes('não encontrei') ||
          respostaIA.includes('não sei') ||
          respostaIA.includes('não tenho essa informação') ||
          (proximaIA.tool_calls?.some(tc => tc.name === 'buscarFAQParaIA' && tc.status === 'completed') && 
           respostaIA.length < 100) // Resposta curta após buscar FAQ = não encontrou
        ) {
          gaps.push(msg.content);
        }
      }
    }
  }
  
  return gaps;
}

function extrairObjecoes(mensagens) {
  const objecoes = [];
  const objecoesPatterns = [
    { pattern: /muito caro|caro demais|preço alto/i, tipo: 'preço' },
    { pattern: /não preciso|não quero|não tenho interesse/i, tipo: 'interesse' },
    { pattern: /já uso|já tenho|tenho outro/i, tipo: 'concorrência' },
    { pattern: /muito complicado|difícil|não entendo/i, tipo: 'complexidade' },
    { pattern: /não agora|depois|mais tarde/i, tipo: 'timing' }
  ];

  for (let i = 0; i < mensagens.length; i++) {
    const msg = mensagens[i];
    if (msg.role === 'user') {
      for (const { pattern, tipo } of objecoesPatterns) {
        if (pattern.test(msg.content)) {
          const respostaIA = mensagens[i + 1];
          const resolveu = respostaIA && 
                          (respostaIA.content.toLowerCase().includes('entendo') ||
                           respostaIA.content.toLowerCase().includes('na verdade'));
          
          objecoes.push({
            objecao: msg.content,
            tipo,
            resposta_ia: respostaIA?.content || '',
            resolveu
          });
        }
      }
    }
  }
  
  return objecoes;
}