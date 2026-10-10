import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id } = await req.json();
    
    if (!documento_id) {
      return Response.json({ error: 'documento_id obrigatório' }, { status: 400 });
    }

    // Buscar documento
    const doc = await base44.asServiceRole.entities.DocumentoCompliance.get(documento_id);
    
    if (!doc) {
      return Response.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Extrair conteúdo via LLM com upload do arquivo
    const extracao = await base44.integrations.Core.InvokeLLM({
      prompt: `Você é um especialista em compliance, LGPD e normas ISO.

TAREFA: Analise este documento e extraia:

1. **Conteúdo completo** (texto integral para busca full-text)
2. **Resumo executivo** (máximo 500 palavras)
3. **Categorias** (escolha as mais relevantes):
   - politica_backup
   - politica_controle_acesso
   - politica_malware
   - politica_desenvolvimento_pessoas
   - politica_vulnerabilidades
   - politica_gestao_ativos
   - politica_provedor_servicos
   - politica_logs_auditoria
   - politica_protecao_dados
   - politica_seguranca_informacao
   - conformidade_melhores_praticas
   - normas_nacionais
   - normas_internacionais
   - outros

4. **Tags** (até 10 palavras-chave relevantes)
5. **Número de referência** (ex: ISO 27001, ABNT NBR, Lei 13.709/2018)
6. **Ano** (se identificável)
7. **Fonte** (ABNT, ISO, OECD, Governo Federal, etc)

IMPORTANTE:
- Se for PDF/DOCX, extraia TODO o texto
- Seja preciso nas categorias
- Tags devem ser objetivas (LGPD, GDPR, segurança, backup, etc)`,
      file_urls: [doc.arquivo_url],
      response_json_schema: {
        type: "object",
        properties: {
          conteudo_completo: { type: "string" },
          resumo: { type: "string" },
          categorias: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          numero_referencia: { type: "string" },
          ano: { type: "number" },
          fonte: { type: "string" }
        }
      }
    });

    // Atualizar documento
    await base44.asServiceRole.entities.DocumentoCompliance.update(documento_id, {
      indexado: true,
      conteudo_extraido: extracao.conteudo_completo?.slice(0, 50000), // Limitar
      resumo_ia: extracao.resumo,
      categorias_sugeridas_ia: extracao.categorias || [],
      tags: [...(doc.tags || []), ...(extracao.tags || [])].slice(0, 20),
      numero_referencia: extracao.numero_referencia || doc.numero_referencia,
      ano_publicacao: extracao.ano || doc.ano_publicacao,
      fonte: extracao.fonte || doc.fonte
    });

    return Response.json({
      success: true,
      documento_id,
      indexado: true,
      categorias_sugeridas: extracao.categorias,
      tags_extraidas: extracao.tags
    });

  } catch (error) {
    console.error('[indexarDocumentoIA] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});