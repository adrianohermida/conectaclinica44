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

    const apiKey = Deno.env.get('INFOSIMPLES_API_KEY');

    if (!apiKey) {
      return Response.json({
        success: false,
        error: 'INFOSIMPLES_API_KEY não configurado'
      });
    }

    const params = new URLSearchParams();
    params.append('token', apiKey);
    params.append('timeout', '300');
    if (cnpj) params.append('cnpj', cnpj);
    if (cpf) params.append('cpf', cpf);

    const response = await fetch(
      'https://api.infosimples.com/api/v2/consultas/sefaz/am/certidao-debitos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }
    );

    const resultado = await response.json();

    if (resultado.code !== 200) {
      return Response.json({
        success: false,
        error: resultado.code_message || 'Erro na consulta',
        code: resultado.code,
        errors: resultado.errors
      });
    }

    const certidao = resultado.data[0];

    if (!certidao) {
      return Response.json({
        success: false,
        error: 'Nenhum dado retornado pela SEFAZ'
      });
    }

    let arquivoUrl = null;

    // Download e upload do PDF se disponível
    if (resultado.site_receipts && resultado.site_receipts.length > 0) {
      const pdfUrl = resultado.site_receipts.find(r => r.url && r.url.includes('.pdf'))?.url;
      
      if (pdfUrl) {
        try {
          const pdfResponse = await fetch(pdfUrl);
          const pdfBlob = await pdfResponse.blob();
          const fileName = `sefaz_am_${cnpj || cpf}_${certidao.certidao_codigo || Date.now()}.pdf`;
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
            file: pdfFile
          });

          arquivoUrl = uploadResult.file_url;
        } catch (uploadError) {
          console.error('Erro ao fazer upload do PDF:', uploadError);
        }
      }
    }

    return Response.json({
      success: true,
      certidao: {
        numero_certidao: certidao.certidao_codigo,
        data_emissao: certidao.emissao_data,
        data_validade: certidao.validade_data,
        situacao: certidao.conseguiu_emitir_certidao_negativa ? "REGULAR" : "IRREGULAR",
        mensagem: certidao.mensagem,
        cpf_cnpj: cnpj || cpf,
        arquivo_url: arquivoUrl
      },
      api_info: {
        price: resultado.header.price,
        requested_at: resultado.header.requested_at
      }
    });

  } catch (error) {
    console.error('Erro ao consultar SEFAZ AM:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});