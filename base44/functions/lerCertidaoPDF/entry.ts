import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url é obrigatório' }, { status: 400 });
    }

    // Usar IA para extrair dados do PDF
    const schema = {
      type: "object",
      properties: {
        numero_certidao: { type: "string" },
        orgao_emissor: { type: "string" },
        data_emissao: { type: "string" },
        data_validade: { type: "string" },
        titulo: { type: "string" },
        tipo_certidao: { type: "string" },
        resultado: { type: "string" },
        cpf_cnpj: { type: "string" },
        nome_titular: { type: "string" },
        situacao: { type: "string" }
      }
    };

    const resultado = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: schema
    });

    if (resultado.status === "error") {
      return Response.json({ 
        error: 'Erro ao extrair dados',
        details: resultado.details 
      }, { status: 400 });
    }

    const dados = resultado.output;

    // Normalizar datas brasileiras (dd/mm/yyyy -> yyyy-mm-dd)
    const parseDataBR = (dataStr) => {
      if (!dataStr) return "";
      const match = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [_, dia, mes, ano] = match;
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
      return dataStr;
    };

    return Response.json({
      success: true,
      dados: {
        numero_certidao: dados.numero_certidao || "",
        orgao_emissor: dados.orgao_emissor || "",
        data_emissao: parseDataBR(dados.data_emissao),
        data_validade: parseDataBR(dados.data_validade),
        titulo: dados.titulo || "",
        tipo_certidao: dados.tipo_certidao || "",
        resultado: dados.resultado?.toLowerCase().includes("negativa") ? "negativa" : 
                   dados.resultado?.toLowerCase().includes("positiva") ? "positiva" : 
                   dados.resultado?.toLowerCase().includes("nada consta") ? "nada_consta" : "",
        observacoes: `Nome/Titular: ${dados.nome_titular || ''}\nCPF/CNPJ: ${dados.cpf_cnpj || ''}\nSituação: ${dados.situacao || ''}`
      }
    });

  } catch (error) {
    console.error('Erro ao processar certidão:', error);
    return Response.json({ 
      error: 'Erro ao processar certidão',
      details: error.message 
    }, { status: 500 });
  }
});