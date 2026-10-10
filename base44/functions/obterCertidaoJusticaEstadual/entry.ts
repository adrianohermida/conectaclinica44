import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, cpf, nome, estado } = await req.json();

    if (!cnpj && !cpf && !nome) {
      return Response.json({ 
        error: 'Informe CNPJ, CPF ou Nome' 
      }, { status: 400 });
    }

    if (!estado) {
      return Response.json({ 
        error: 'Estado obrigatório' 
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
      estado: estado.toUpperCase(),
      timeout: '120'
    });

    if (cnpj) params.append('cnpj', cnpj.replace(/\D/g, ''));
    if (cpf) params.append('cpf', cpf.replace(/\D/g, ''));
    if (nome) params.append('nome', nome);

    const infosimplesResponse = await fetch(
      'https://api.infosimples.com/api/v2/consultas/tribunal/tj/certidao',
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

    let arquivoUrl = null;
    let pdfUrl = null;
    
    if (resultado.site_receipts) {
      if (Array.isArray(resultado.site_receipts) && resultado.site_receipts.length > 0) {
        pdfUrl = resultado.site_receipts[0];
      } else if (typeof resultado.site_receipts === 'string') {
        pdfUrl = resultado.site_receipts;
      }
    }

    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          const fileName = `TJ${estado}_${(cnpj || cpf || 'consulta').replace(/\D/g, '')}_${Date.now()}.pdf`;
          const pdfFile = new File([pdfArrayBuffer], fileName, { type: 'application/pdf' });

          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
            file: pdfFile
          });

          arquivoUrl = uploadResult.file_url;
        }
      } catch (uploadError) {
        console.error('Erro ao processar PDF:', uploadError);
      }
    }

    const parseDataBR = (dataStr) => {
      if (!dataStr) return null;
      const [dia, mes, ano] = dataStr.split('/');
      return ano && mes && dia ? `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}` : null;
    };

    return Response.json({
      success: true,
      certidao: {
        numero_certidao: resultado.data?.[0]?.numero || null,
        nome: resultado.data?.[0]?.nome || nome,
        cpf_cnpj: cnpj || cpf,
        situacao: resultado.data?.length > 0 ? "COM PROCESSOS" : "NADA CONSTA",
        total_processos: resultado.data?.length || 0,
        processos: resultado.data || [],
        data_emissao: parseDataBR(resultado.data?.[0]?.data_emissao) || new Date().toISOString().split('T')[0],
        data_validade: parseDataBR(resultado.data?.[0]?.data_validade),
        estado: estado.toUpperCase(),
        arquivo_url: arquivoUrl,
        pdf_url_original: pdfUrl
      },
      api_info: {
        billable: resultado.header.billable,
        price: resultado.header.price,
        elapsed_time: resultado.header.elapsed_time_in_milliseconds
      }
    });

  } catch (error) {
    console.error('Erro na função obterCertidaoJusticaEstadual:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});