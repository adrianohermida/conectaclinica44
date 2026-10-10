import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, tipo_documento, estado } = await req.json();

    if (!cnpj || !tipo_documento || !estado) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: cnpj, tipo_documento, estado' 
      }, { status: 400 });
    }

    // Usar IA para gerar instruções de solicitação
    const prompt = `Como solicitar ${tipo_documento} na Junta Comercial do estado ${estado} para CNPJ ${cnpj}?

Forneça:
1. Link direto para o portal da Junta Comercial
2. Passo a passo resumido
3. Documentos necessários
4. Prazo médio de entrega
5. Custo aproximado`;

    const instrucoes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          portal_url: { type: "string" },
          passos: {
            type: "array",
            items: { type: "string" }
          },
          documentos_necessarios: {
            type: "array",
            items: { type: "string" }
          },
          prazo_dias: { type: "number" },
          custo_estimado: { type: "string" },
          observacoes: { type: "string" }
        }
      }
    });

    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + (instrucoes.prazo_dias || 15));

    // Registrar solicitação na nova entidade
    const solicitacao = await base44.asServiceRole.entities.SolicitacaoJunta.create({
      tipo_documento: tipo_documento,
      cnpj: cnpj,
      junta_comercial: `Junta Comercial do ${estado}`,
      estado: estado,
      data_solicitacao: new Date().toISOString().split('T')[0],
      prazo_estimado: instrucoes.prazo_dias || 15,
      data_prevista_entrega: dataPrevista.toISOString().split('T')[0],
      status: "pendente",
      responsavel: user.full_name,
      custo_estimado: instrucoes.custo_estimado || "Consultar portal",
      portal_url: instrucoes.portal_url,
      instrucoes: instrucoes.passos?.join('\n') || "",
      documentos_necessarios: instrucoes.documentos_necessarios || [],
      historico: [{
        data: new Date().toISOString(),
        acao: "Solicitação criada",
        usuario: user.full_name,
        observacao: "Gerado via automação"
      }],
      observacoes: instrucoes.observacoes || ""
    });

    return Response.json({
      success: true,
      solicitacao_id: solicitacao.id,
      instrucoes: instrucoes,
      message: "Solicitação registrada. Siga as instruções para obter o documento."
    });

  } catch (error) {
    console.error('Erro ao solicitar documento:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});