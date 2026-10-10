import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import axios from 'npm:axios';

/**
 * CONSULTA CRM ATIVO - CFM via Infosimples
 * COMPLIANCE: Resolução CFM 1.643/2002 e legislação correlata
 * Registra auditoria obrigatória + custo por chamada
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inscricao, uf, justificativa } = await req.json();

    if (!inscricao || !uf) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: inscricao, uf' 
      }, { status: 400 });
    }

    // COMPLIANCE: Justificativa obrigatória para auditoria
    if (!justificativa) {
      return Response.json({ 
        error: 'Justificativa obrigatória para consulta CRM (compliance CFM)' 
      }, { status: 400 });
    }

    const token = Deno.env.get("INFOSIMPLES_API_KEY");
    if (!token) {
      return Response.json({ error: 'INFOSIMPLES_API_KEY não configurada' }, { status: 500 });
    }

    // Chamada à API Infosimples
    const timestamp_inicio = Date.now();
    const response = await axios.post(
      'https://api.infosimples.com/api/v2/consultas/cfm/cadastro',
      {
        inscricao,
        uf,
        token,
        timeout: "300"
      }
    );

    const res = response.data;
    const timestamp_fim = Date.now();
    const duracao_ms = timestamp_fim - timestamp_inicio;

    // VALIDAÇÃO: Códigos de sucesso
    if (res.code !== 200 && res.code !== 201) {
      let mensagem = 'Consulta CFM sem sucesso:\n';
      mensagem += `Código: ${res.code} (${res.code_message})\n`;
      mensagem += res.errors ? res.errors.join('; ') : '';

      // REGISTRO DE FALHA (sem cobrança)
      await base44.asServiceRole.entities.LogAuditoria.create({
        clinica_id: user.clinica_id,
        tipo_operacao: 'CONSULTA_CRM_FALHA',
        usuario_id: user.id,
        usuario_email: user.email,
        detalhes: {
          inscricao,
          uf,
          justificativa,
          erro: mensagem,
          response_code: res.code
        },
        timestamp: new Date().toISOString()
      });

      return Response.json({ error: mensagem, code: res.code }, { status: 400 });
    }

    // EXTRAÇÃO DE DADOS
    const medico = res.data && res.data[0] ? res.data[0] : null;
    
    if (!medico) {
      return Response.json({ 
        error: 'Nenhum médico encontrado para este CRM/UF',
        code: res.code 
      }, { status: 404 });
    }

    // COMPLIANCE: Validar situação ativa
    const situacao_regular = medico.situacao === 'Regular';

    // CUSTO DA CHAMADA
    const preco_chamada = parseFloat(res.header?.price || '0.04');

    // REGISTRO DE AUDITORIA (OBRIGATÓRIO CFM)
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: user.clinica_id,
      tipo_operacao: 'CONSULTA_CRM_CFM',
      usuario_id: user.id,
      usuario_email: user.email,
      detalhes: {
        inscricao,
        uf,
        justificativa,
        nome_medico: medico.nome,
        situacao: medico.situacao,
        situacao_regular,
        especialidades: medico.especialidade_lista,
        inscricao_data: medico.inscricao_data,
        preco_chamada,
        duracao_ms,
        provider: 'Infosimples',
        site_receipt: res.site_receipts?.[0] || null
      },
      timestamp: new Date().toISOString()
    });

    // REGISTRO DE CONSUMO FINANCEIRO
    try {
      await base44.asServiceRole.entities.ConsumoRecurso.create({
        clinica_id: user.clinica_id,
        tipo_recurso: 'api_cfm',
        quantidade: 1,
        custo_unitario: preco_chamada,
        custo_total: preco_chamada,
        provider: 'Infosimples',
        detalhes: {
          inscricao,
          uf,
          nome_medico: medico.nome
        },
        data_consumo: new Date().toISOString()
      });
    } catch (consumoError) {
      console.error('Erro ao registrar consumo:', consumoError);
      // Não bloqueia a resposta, mas loga o erro
    }

    return Response.json({
      success: true,
      situacao_regular,
      medico: {
        nome: medico.nome,
        inscricao: medico.inscricao,
        uf: medico.endereco_uf,
        situacao: medico.situacao,
        especialidades: medico.especialidade_lista,
        inscricao_data: medico.inscricao_data,
        inscricao_tipo: medico.inscricao_tipo,
        ano_formatura: medico.ano_formatura,
        instituicao_graduacao: medico.instituicao_graduacao
      },
      compliance: {
        situacao_regular,
        alerta: !situacao_regular ? 'CRM em situação irregular - prescrição bloqueada' : null
      },
      auditoria: {
        timestamp: new Date().toISOString(),
        duracao_ms,
        custo: preco_chamada
      },
      site_receipt: res.site_receipts?.[0] || null
    });

  } catch (error) {
    console.error('Erro consultarCrmAtivoCFM:', error);
    return Response.json({ 
      error: error.message, 
      stack: error.stack 
    }, { status: 500 });
  }
});