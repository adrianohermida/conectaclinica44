import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from "npm:date-fns@3.6.0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cnpj, cei } = await req.json();

    if (!cnpj && !cei) {
      return Response.json({ 
        error: 'Parâmetro obrigatório ausente: cnpj ou cei' 
      }, { status: 400 });
    }

    const apiToken = Deno.env.get('INFOSIMPLES_API_KEY');
    if (!apiToken) {
      return Response.json({ 
        error: 'INFOSIMPLES_API_KEY não configurado' 
      }, { status: 500 });
    }

    // Fazer requisição para API da Infosimples
    const params = new URLSearchParams({
      token: apiToken,
      timeout: '300'
    });

    if (cnpj) params.append('cnpj', cnpj.replace(/\D/g, ''));
    if (cei) params.append('cei', cei.replace(/\D/g, ''));

    const infosimplesResponse = await fetch(
      'https://api.infosimples.com/api/v2/consultas/caixa/regularidade',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      }
    );

    const resultado = await infosimplesResponse.json();

    // Verificar se houve sucesso
    if (resultado.code !== 200) {
      let errorMessage = 'Resultado sem sucesso. Leia abaixo para saber mais:\n';
      errorMessage += `Código: ${resultado.code} (${resultado.code_message || 'Erro desconhecido'})`;
      if (resultado.errors && resultado.errors.length > 0) {
        errorMessage += '\n' + resultado.errors.join('; ');
      }
      
      return Response.json({
        success: false,
        error: errorMessage,
        code: resultado.code,
        errors: resultado.errors || []
      }, { status: 200 });
    }

    // Verificar se há dados
    if (!resultado.data || resultado.data.length === 0) {
      return Response.json({
        success: false,
        error: 'Nenhum dado retornado pela API'
      }, { status: 200 });
    }

    const certidaoData = resultado.data[0];

    // Fazer download do PDF e upload para o Base44
    let arquivoUrl = null;
    
    // Procurar PDF em site_receipts (array ou string)
    let pdfUrl = null;
    if (resultado.site_receipts) {
      if (Array.isArray(resultado.site_receipts) && resultado.site_receipts.length > 0) {
        // Se for array, procurar primeiro item com URL
        const receipt = resultado.site_receipts[0];
        pdfUrl = typeof receipt === 'string' ? receipt : receipt?.url;
      } else if (typeof resultado.site_receipts === 'string') {
        pdfUrl = resultado.site_receipts;
      }
    }
    
    // Fallback para site_receipt no próprio certidaoData
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

        if (!pdfResponse.ok) {
          console.error(`HTTP error ao baixar PDF! status: ${pdfResponse.status}`);
        } else {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          const fileName = `CRF_FGTS_${(cnpj || cei).replace(/\D/g, '')}_${certidaoData.crf || Date.now()}.pdf`;
          const pdfFile = new File([pdfArrayBuffer], fileName, { type: 'application/pdf' });

          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
            file: pdfFile
          });

          arquivoUrl = uploadResult.file_url;
        }
      } catch (uploadError) {
        console.error('Erro ao processar PDF:', uploadError);
        // Não bloqueia a operação se houver erro no PDF
      }
    }

    // Processar data de validade
    const parseDataBR = (dataStr) => {
      if (!dataStr) return null;
      const parts = dataStr.split('/');
      if (parts.length !== 3) return null;
      const [dia, mes, ano] = parts;
      if (!dia || !mes || !ano) return null;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    };

    // Buscar data de validade em múltiplos campos possíveis
    const dataValidade = parseDataBR(certidaoData.validade_fim_data || certidaoData.validade || certidaoData.data_validade) || format(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
    const dataEmissao = parseDataBR(certidaoData.validade_inicio_data || certidaoData.data_emissao) || format(new Date(), "yyyy-MM-dd");

    // Retornar dados estruturados
    return Response.json({
      success: true,
      certidao: {
        numero_certidao: certidaoData.crf,
        situacao: certidaoData.situacao,
        razao_social: certidaoData.razao_social,
        inscricao: certidaoData.inscricao,
        endereco: certidaoData.endereco,
        data_emissao: dataEmissao,
        data_validade: dataValidade,
        data_consulta: certidaoData.datahora,
        arquivo_url: arquivoUrl,
        pdf_url_original: pdfUrl,
        historico: certidaoData.historico_lista || []
      },
      api_info: {
        billable: resultado.header.billable,
        price: resultado.header.price,
        elapsed_time: resultado.header.elapsed_time_in_milliseconds
      }
    });

  } catch (error) {
    console.error('Erro na função obterCertidaoCaixa:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});