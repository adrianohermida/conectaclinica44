import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agendamento_id } = await req.json();

    if (!agendamento_id) {
      return Response.json({ error: 'agendamento_id obrigatório' }, { status: 400 });
    }

    // Buscar agendamento
    const agendamentos = await base44.asServiceRole.entities.AgendamentoConsulta.filter({ id: agendamento_id });
    
    if (agendamentos.length === 0) {
      return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const agendamento = agendamentos[0];

    if (!agendamento.ativo) {
      return Response.json({ error: 'Agendamento desativado' }, { status: 400 });
    }

    // Mapear tipo de consulta para função
    const funcoes = {
      'fgts': 'obterCertidaoCaixa',
      'receita_federal': 'obterCertidaoReceitaFederal',
      'trt11': 'obterCertidaoTRT11',
      'tcu': 'obterCertidaoTCU',
      'prefeitura': 'obterCertidaoPrefeitura',
      'sefaz': 'obterCertidaoSefaz',
      'tst_falencia': 'obterCertidaoTST'
    };

    const nomeFuncao = funcoes[agendamento.tipo_consulta];

    if (!nomeFuncao) {
      throw new Error(`Tipo de consulta não suportado: ${agendamento.tipo_consulta}`);
    }

    try {
      // Executar consulta
      const response = await base44.asServiceRole.functions.invoke(nomeFuncao, agendamento.parametros_consulta);
      const resultado = response.data;

      // Atualizar certidão existente se houver
      if (agendamento.certidao_id) {
        const certidoes = await base44.asServiceRole.entities.CertidaoRegularidade.filter({ id: agendamento.certidao_id });
        
        if (certidoes.length > 0 && resultado.success && resultado.certidao) {
          const cert = resultado.certidao;
          
          await base44.asServiceRole.entities.CertidaoRegularidade.update(agendamento.certidao_id, {
            numero_certidao: cert.numero_certidao || certidoes[0].numero_certidao,
            data_emissao: cert.data_emissao || certidoes[0].data_emissao,
            data_validade: cert.data_validade || certidoes[0].data_validade,
            status: cert.situacao === "REGULAR" || cert.situacao === "NADA CONSTA" ? "vigente" : "irregular",
            arquivo_url: cert.arquivo_url || certidoes[0].arquivo_url,
            ultima_consulta: new Date().toISOString()
          });

          // Registrar no histórico
          await base44.asServiceRole.entities.HistoricoCertidao.create({
            certidao_id: agendamento.certidao_id,
            certidao_titulo: agendamento.certidao_titulo,
            orgao_emissor: agendamento.orgao_emissor,
            data_emissao: cert.data_emissao,
            data_validade: cert.data_validade,
            numero_certidao: cert.numero_certidao,
            resultado: cert.situacao === "REGULAR" ? "negativa" : "positiva",
            arquivo_url: cert.arquivo_url,
            tipo_registro: "consulta_automatica",
            observacoes: `Agendamento automático. Custo: R$ ${resultado.api_info?.price || '0'}`
          });
        }
      }

      // Calcular próxima execução
      const calcularProximaExecucao = () => {
        const agora = new Date();
        const [horas, minutos] = (agendamento.horario || "08:00").split(":");
        const proxima = new Date(agora);
        proxima.setHours(parseInt(horas), parseInt(minutos), 0, 0);

        switch (agendamento.frequencia) {
          case 'diaria':
            if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
            break;
          case 'semanal':
            proxima.setDate(proxima.getDate() + ((agendamento.dia_semana - agora.getDay() + 7) % 7));
            if (proxima <= agora) proxima.setDate(proxima.getDate() + 7);
            break;
          case 'quinzenal':
            if (proxima <= agora) proxima.setDate(proxima.getDate() + 15);
            break;
          case 'mensal':
            proxima.setDate(agendamento.dia_mes || 1);
            if (proxima <= agora) proxima.setMonth(proxima.getMonth() + 1);
            break;
        }

        return proxima.toISOString();
      };

      // Atualizar agendamento
      await base44.asServiceRole.entities.AgendamentoConsulta.update(agendamento.id, {
        ultima_execucao: new Date().toISOString(),
        proxima_execucao: calcularProximaExecucao(),
        status_ultima_execucao: resultado.success ? "sucesso" : "erro",
        erro_ultima_execucao: resultado.success ? null : resultado.error,
        total_execucoes: (agendamento.total_execucoes || 0) + 1
      });

      // Enviar notificação se configurado
      if (agendamento.notificar_resultado && agendamento.emails_notificacao) {
        const emails = agendamento.emails_notificacao.split(',').map(e => e.trim());
        
        for (const email of emails) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject: `Consulta Automática: ${agendamento.certidao_titulo}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #0B7A9E;">Resultado da Consulta Automática</h2>
                <p><strong>Certidão:</strong> ${agendamento.certidao_titulo}</p>
                <p><strong>Órgão:</strong> ${agendamento.orgao_emissor}</p>
                <p><strong>Status:</strong> ${resultado.success ? '✅ Sucesso' : '❌ Erro'}</p>
                ${resultado.success && resultado.certidao ? `
                  <p><strong>Situação:</strong> ${resultado.certidao.situacao}</p>
                  <p><strong>Validade:</strong> ${resultado.certidao.data_validade || 'N/A'}</p>
                ` : `
                  <p style="color: red;"><strong>Erro:</strong> ${resultado.error}</p>
                `}
                <p style="margin-top: 20px; color: #666; font-size: 12px;">
                  Consulta executada automaticamente em ${new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            `
          });
        }
      }

      return Response.json({
        success: true,
        resultado: resultado,
        proxima_execucao: calcularProximaExecucao()
      });

    } catch (error) {
      // Atualizar com erro
      await base44.asServiceRole.entities.AgendamentoConsulta.update(agendamento.id, {
        ultima_execucao: new Date().toISOString(),
        status_ultima_execucao: "erro",
        erro_ultima_execucao: error.message,
        total_execucoes: (agendamento.total_execucoes || 0) + 1
      });

      throw error;
    }

  } catch (error) {
    console.error('Erro ao executar agendamento:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});