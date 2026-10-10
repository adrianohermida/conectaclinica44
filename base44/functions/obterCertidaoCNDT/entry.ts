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
      'https://api.infosimples.com/api/v2/consultas/tst/cndt',
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

    // Download e upload do PDF
    let arquivoUrl = null;
    let pdfUrl = null;
    
    if (resultado.site_receipts) {
      if (Array.isArray(resultado.site_receipts) && resultado.site_receipts.length > 0) {
        const receipt = resultado.site_receipts[0];
        pdfUrl = typeof receipt === 'string' ? receipt : receipt?.url;
      } else if (typeof resultado.site_receipts === 'string') {
        pdfUrl = resultado.site_receipts;
      }
    }
    
    if (!pdfUrl && certidaoData.site_receipt) {
      pdfUrl = certidaoData.site_receipt;
    }

    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          const fileName = `CNDT_${(cnpj || cpf).replace(/\D/g, '')}_${Date.now()}.pdf`;
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
        numero_certidao: certidaoData.numero || certidaoData.codigo,
        nome: certidaoData.nome || certidaoData.razao_social,
        cpf_cnpj: certidaoData.cpf || certidaoData.cnpj,
        data_emissao: parseDataBR(certidaoData.data_emissao),
        data_validade: parseDataBR(certidaoData.data_validade || certidaoData.validade),
        situacao: certidaoData.situacao || "REGULAR",
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
    console.error('Erro na função obterCertidaoCNDT:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});