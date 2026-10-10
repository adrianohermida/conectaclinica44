import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, cpf } = await req.json();

    if (!cnpj && !cpf) {
      return Response.json({ 
        error: 'Informe CNPJ ou CPF' 
      }, { status: 400 });
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_KEY');
    if (!apiToken) {
      return Response.json({ 
        error: 'INFOSIMPLES_API_KEY não configurado' 
      }, { status: 500 });
    }

    const params = new URLSearchParams({
      token: apiToken,
      timeout: '120'
    });

    if (cnpj) params.append('cnpj', cnpj.replace(/\D/g, ''));
    if (cpf) params.append('cpf', cpf.replace(/\D/g, ''));

    const infosimplesResponse = await fetch(
      'https://api.infosimples.com/api/v2/consultas/receita-federal/situacao-cadastral-cnpj',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      }
    );

    const resultado = await infosimplesResponse.json();

    if (resultado.code !== 200) {
      return Response.json({
        success: false,
        error: resultado.code_message || 'Erro ao consultar API',
        code: resultado.code,
        errors: resultado.errors || []
      }, { status: 200 });
    }

    if (!resultado.data || resultado.data.length === 0) {
      return Response.json({
        success: false,
        error: 'Nenhum dado retornado pela API'
      }, { status: 200 });
    }

    const certidaoData = resultado.data[0];

    const parseDataBR = (dataStr) => {
      if (!dataStr) return null;
      const [dia, mes, ano] = dataStr.split('/');
      return ano && mes && dia ? `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}` : null;
    };

    return Response.json({
      success: true,
      certidao: {
        numero_certidao: certidaoData.cnpj || certidaoData.cpf,
        nome: certidaoData.razao_social || certidaoData.nome,
        cpf_cnpj: certidaoData.cnpj || certidaoData.cpf,
        situacao: certidaoData.situacao_cadastral || "ATIVA",
        data_situacao: parseDataBR(certidaoData.data_situacao_cadastral),
        data_emissao: new Date().toISOString().split('T')[0],
        arquivo_url: null
      },
      api_info: {
        billable: resultado.header.billable,
        price: resultado.header.price,
        elapsed_time: resultado.header.elapsed_time_in_milliseconds
      }
    });

  } catch (error) {
    console.error('Erro na função obterCertidaoINSS:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});