import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays } from 'npm:date-fns@3.6.0';

/**
 * WRAPPER INFOSIMPLES COM CACHE OBRIGATÓRIO
 * 
 * ROI: R$ 5/request → R$ 0 (cache hit) = -80% custo com hit rate 80%
 * Cache TTL: 24h (certidões mudam raramente)
 * Rate limit: 10 req/min por clínica
 * 
 * Usage:
 * const { data } = await base44.functions.invoke('gov/consultarCertidao', {
 *   tipo: 'receita_federal', // receita_federal, trt, tcu, inss, etc
 *   cnpj: '12345678000190',
 *   cpf: '12345678900', // ou cpf
 *   birthdate: '1990-01-01' // obrigatório se cpf
 * });
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;
const CACHE_TTL_HOURS = 24;

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { tipo, cnpj, cpf, birthdate } = payload;

    // Validação
    if (!tipo) {
      return Response.json({ error: 'Parâmetro "tipo" obrigatório' }, { status: 400 });
    }

    if (!cnpj && !cpf) {
      return Response.json({ error: 'CNPJ ou CPF obrigatório' }, { status: 400 });
    }

    if (cpf && !birthdate) {
      return Response.json({ 
        error: 'birthdate obrigatório para consulta por CPF (formato: yyyy-mm-dd)' 
      }, { status: 400 });
    }

    // RATE LIMITING: 10 req/min por clínica
    const umMinutoAtras = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const requestsRecentes = await base44.asServiceRole.entities.ConsumoRecurso.filter({
      clinica_id: user.clinica_id,
      recurso: 'infosimples_consulta',
      created_date: { $gte: umMinutoAtras }
    });

    if (requestsRecentes.length >= MAX_REQUESTS_PER_WINDOW) {
      return Response.json({ 
        error: 'Rate limit excedido',
        limite: `${MAX_REQUESTS_PER_WINDOW} consultas/minuto`,
        retry_after: 60
      }, { status: 429 });
    }

    // CACHE: Verificar se já consultamos isso recentemente
    const documento = cnpj || cpf;
    const cacheKey = `certidao:${tipo}:${documento.replace(/\D/g, '')}`;
    
    const agora = new Date();
    const cached = await base44.asServiceRole.entities.CacheIA.filter({
      chave: cacheKey,
      valido_ate: { $gte: agora.toISOString() }
    });

    if (cached.length > 0) {
      const latencia = Date.now() - startTime;
      console.log(`[InfoSimples] 💰 CACHE HIT - R$ 5,00 economizados - ${latencia}ms`);
      
      // AUDIT: Registrar economia
      await base44.asServiceRole.entities.ConsumoRecurso.create({
        clinica_id: user.clinica_id,
        recurso: 'infosimples_consulta_cached',
        quantidade: 1,
        unidade: 'consulta',
        custo_unitario_brl: 0, // ZERO - cache hit
        economia_brl: 5.00,
        mes_referencia: new Date().toISOString().substring(0, 7),
        metadata: {
          tipo,
          documento,
          cache_hit: true,
          latencia_ms: latencia
        }
      });

      return Response.json({
        success: true,
        cache_hit: true,
        economia_brl: 5.00,
        ...JSON.parse(cached[0].valor)
      });
    }

    // CACHE MISS: Consultar API InfoSimples
    const apiToken = Deno.env.get('INFOSIMPLES_API_KEY');
    if (!apiToken) {
      return Response.json({ error: 'INFOSIMPLES_API_KEY não configurado' }, { status: 500 });
    }

    const params = new URLSearchParams({
      token: apiToken,
      timeout: '120'
    });

    if (cnpj) params.append('cnpj', cnpj.replace(/\D/g, ''));
    if (cpf) {
      params.append('cpf', cpf.replace(/\D/g, ''));
      if (birthdate) params.append('birthdate', birthdate);
    }

    // Mapear tipo para endpoint InfoSimples
    const endpoints = {
      'receita_federal': 'receita-federal/pgfn',
      'trt': 'trt/certidao-negativa',
      'tcu': 'tcu/certidao-negativa',
      'inss': 'inss/certidao-negativa',
      'caixa': 'caixa/certidao-negativa'
    };

    const endpoint = endpoints[tipo];
    if (!endpoint) {
      return Response.json({ error: `Tipo "${tipo}" não suportado` }, { status: 400 });
    }

    const infosimplesResponse = await fetch(
      `https://api.infosimples.com/api/v2/consultas/${endpoint}/nova`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }
    );

    const resultado = await infosimplesResponse.json();

    if (resultado.code !== 200) {
      const latencia = Date.now() - startTime;
      
      // AUDIT: Registrar falha (sem custo)
      await base44.asServiceRole.entities.ConsumoRecurso.create({
        clinica_id: user.clinica_id,
        recurso: 'infosimples_consulta_falha',
        quantidade: 1,
        unidade: 'consulta',
        custo_unitario_brl: 0,
        mes_referencia: new Date().toISOString().substring(0, 7),
        metadata: {
          tipo,
          documento,
          erro: resultado.code_message,
          latencia_ms: latencia
        }
      });

      return Response.json({
        success: false,
        error: resultado.code_message || 'Erro ao consultar API',
        code: resultado.code
      }, { status: 200 });
    }

    if (!resultado.data || resultado.data.length === 0) {
      return Response.json({ success: false, error: 'Nenhum dado retornado' }, { status: 200 });
    }

    const certidaoData = resultado.data[0];

    // Download PDF e upload para Base44 storage
    let arquivoUrl = null;
    const pdfUrl = resultado.site_receipts?.[0]?.url || resultado.site_receipts?.[0] || certidaoData.site_receipt;

    if (pdfUrl) {
      try {
        const pdfResponse = await fetch(pdfUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer();
          const fileName = `CND_${tipo}_${documento.replace(/\D/g, '')}_${certidaoData.numero || Date.now()}.pdf`;
          const pdfFile = new File([pdfArrayBuffer], fileName, { type: 'application/pdf' });

          const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
          arquivoUrl = uploadResult.file_url;
        }
      } catch (uploadError) {
        console.warn('[InfoSimples] ⚠️ Erro ao upload PDF:', uploadError.message);
      }
    }

    const parseDataBR = (dataStr) => {
      if (!dataStr) return null;
      const [dia, mes, ano] = dataStr.split('/');
      return ano && mes && dia ? `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}` : null;
    };

    const response = {
      certidao: {
        numero_certidao: certidaoData.numero || certidaoData.codigo_controle,
        nome: certidaoData.nome,
        cpf_cnpj: certidaoData.cpf || certidaoData.cnpj,
        data_emissao: parseDataBR(certidaoData.data_emissao),
        data_validade: parseDataBR(certidaoData.validade),
        situacao: certidaoData.situacao || "REGULAR",
        arquivo_url: arquivoUrl,
        pdf_url_original: pdfUrl,
        observacoes: certidaoData.observacoes || ""
      },
      api_info: {
        billable: resultado.header.billable,
        price: resultado.header.price,
        elapsed_time: resultado.header.elapsed_time_in_milliseconds
      }
    };

    // CACHE: Salvar resultado por 24h
    const validoAte = addDays(agora, 1); // 24h
    await base44.asServiceRole.entities.CacheIA.create({
      chave: cacheKey,
      valor: JSON.stringify(response),
      valido_ate: validoAte.toISOString(),
      tipo_cache: 'infosimples',
      metadata: {
        tipo_certidao: tipo,
        documento,
        billable: resultado.header.billable,
        price: resultado.header.price
      }
    });

    const latencia = Date.now() - startTime;

    // AUDIT: Registrar custo REAL
    await base44.asServiceRole.entities.ConsumoRecurso.create({
      clinica_id: user.clinica_id,
      recurso: 'infosimples_consulta',
      quantidade: 1,
      unidade: 'consulta',
      custo_unitario_brl: resultado.header.billable ? parseFloat(resultado.header.price || 5.00) : 0,
      mes_referencia: new Date().toISOString().substring(0, 7),
      metadata: {
        tipo,
        documento,
        cache_hit: false,
        latencia_ms: latencia,
        billable: resultado.header.billable,
        certidao_numero: certidaoData.numero
      }
    });

    console.log(`[InfoSimples] 💸 API CALL - R$ ${resultado.header.price || '5.00'} - ${latencia}ms`);

    return Response.json({
      success: true,
      cache_hit: false,
      custo_brl: parseFloat(resultado.header.price || 5.00),
      ...response
    });

  } catch (error) {
    console.error('[InfoSimples] ❌ Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});