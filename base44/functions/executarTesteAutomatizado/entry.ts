import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { teste_id } = await req.json();

    if (!teste_id) {
      return Response.json({ error: 'teste_id é obrigatório' }, { status: 400 });
    }

    // Buscar o teste automatizado
    const testes = await base44.asServiceRole.entities.TesteAPIAutomatizado.filter({ id: teste_id });
    
    if (!testes || testes.length === 0) {
      return Response.json({ error: 'Teste não encontrado' }, { status: 404 });
    }

    const teste = testes[0];
    const startTime = Date.now();

    try {
      // Executar o teste chamando a função testarConector
      const response = await base44.asServiceRole.functions.invoke('testarConector', {
        conector_id: teste.conector_id,
        parametros: teste.parametros_teste
      });

      const responseTime = Date.now() - startTime;
      const sucesso = response.data?.success || false;

      // Salvar resultado do teste
      await base44.asServiceRole.entities.TesteAPI.create({
        conector_id: teste.conector_id,
        conector_nome: teste.conector_nome,
        tipo_teste: 'automatico',
        parametros_enviados: teste.parametros_teste,
        resposta_recebida: response.data,
        status_http: response.data?.status || 200,
        sucesso: sucesso,
        tempo_resposta_ms: responseTime,
        erro_mensagem: response.data?.error?.message,
        ambiente: 'production'
      });

      // Atualizar estatísticas do teste
      const novoTotal = (teste.total_execucoes || 0) + 1;
      const novosSucessos = (teste.total_sucessos || 0) + (sucesso ? 1 : 0);
      const novasFalhas = (teste.total_falhas || 0) + (sucesso ? 0 : 1);
      const novaTaxaSucesso = (novosSucessos / novoTotal) * 100;

      await base44.asServiceRole.entities.TesteAPIAutomatizado.update(teste_id, {
        ultima_execucao: new Date().toISOString(),
        total_execucoes: novoTotal,
        total_sucessos: novosSucessos,
        total_falhas: novasFalhas,
        taxa_sucesso: novaTaxaSucesso
      });

      // Se falhou e notificação está habilitada, criar incidente e enviar emails
      if (!sucesso && teste.notificar_falha) {
        // Criar incidente automático
        const incidente = await base44.asServiceRole.entities.IncidenteAPI.create({
          conector_id: teste.conector_id,
          conector_nome: teste.conector_nome,
          severidade: novasFalhas >= 3 ? 'alta' : 'media',
          status: 'aberto',
          tipo_erro: 'erro_dados',
          titulo: `Falha no teste automatizado: ${teste.nome_teste}`,
          descricao: `O teste automatizado "${teste.nome_teste}" falhou.\n\nParâmetros: ${JSON.stringify(teste.parametros_teste)}\n\nErro: ${response.data?.error?.message || 'Erro desconhecido'}`,
          erro_mensagem: response.data?.error?.message,
          consultas_afetadas: 1,
          data_inicio: new Date().toISOString()
        });

        // Enviar notificações por email
        if (teste.emails_notificacao && teste.emails_notificacao.length > 0) {
          for (const email of teste.emails_notificacao) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `⚠️ Teste API Falhou: ${teste.conector_nome}`,
                body: `
                  <h2>Falha no Teste Automatizado</h2>
                  <p><strong>Teste:</strong> ${teste.nome_teste}</p>
                  <p><strong>Conector:</strong> ${teste.conector_nome}</p>
                  <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                  <p><strong>Erro:</strong> ${response.data?.error?.message || 'Erro desconhecido'}</p>
                  <p><strong>Incidente criado:</strong> #${incidente.id}</p>
                  <hr/>
                  <p>Um incidente foi criado automaticamente no sistema. Por favor, verifique o módulo de Gerenciamento de Incidentes.</p>
                `
              });
            } catch (emailError) {
              console.error('Erro ao enviar email:', emailError);
            }
          }
        }
      }

      return Response.json({
        success: true,
        teste_executado: teste.nome_teste,
        resultado: sucesso ? 'sucesso' : 'falha',
        tempo_resposta_ms: responseTime
      });

    } catch (error) {
      // Falha na execução do teste
      const responseTime = Date.now() - startTime;
      
      await base44.asServiceRole.entities.TesteAPI.create({
        conector_id: teste.conector_id,
        conector_nome: teste.conector_nome,
        tipo_teste: 'automatico',
        parametros_enviados: teste.parametros_teste,
        resposta_recebida: { error: error.message },
        status_http: 500,
        sucesso: false,
        tempo_resposta_ms: responseTime,
        erro_mensagem: error.message,
        erro_stack: error.stack,
        ambiente: 'production'
      });

      const novoTotal = (teste.total_execucoes || 0) + 1;
      const novasFalhas = (teste.total_falhas || 0) + 1;
      const novosSucessos = teste.total_sucessos || 0;
      const novaTaxaSucesso = (novosSucessos / novoTotal) * 100;

      await base44.asServiceRole.entities.TesteAPIAutomatizado.update(teste_id, {
        ultima_execucao: new Date().toISOString(),
        total_execucoes: novoTotal,
        total_sucessos: novosSucessos,
        total_falhas: novasFalhas,
        taxa_sucesso: novaTaxaSucesso
      });

      // Criar incidente se notificação habilitada
      if (teste.notificar_falha) {
        await base44.asServiceRole.entities.IncidenteAPI.create({
          conector_id: teste.conector_id,
          conector_nome: teste.conector_nome,
          severidade: 'alta',
          status: 'aberto',
          tipo_erro: 'indisponibilidade',
          titulo: `Erro crítico no teste: ${teste.nome_teste}`,
          descricao: `Falha crítica ao executar teste.\n\nErro: ${error.message}`,
          erro_mensagem: error.message,
          consultas_afetadas: 1,
          data_inicio: new Date().toISOString()
        });

        if (teste.emails_notificacao && teste.emails_notificacao.length > 0) {
          for (const email of teste.emails_notificacao) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `🚨 Erro Crítico: ${teste.conector_nome}`,
                body: `
                  <h2>Erro Crítico no Teste Automatizado</h2>
                  <p><strong>Teste:</strong> ${teste.nome_teste}</p>
                  <p><strong>Conector:</strong> ${teste.conector_nome}</p>
                  <p><strong>Erro:</strong> ${error.message}</p>
                  <p>Um incidente foi criado automaticamente. Verifique o sistema.</p>
                `
              });
            } catch {}
          }
        }
      }

      throw error;
    }

  } catch (error) {
    console.error('Erro ao executar teste automatizado:', error);
    return Response.json({ 
      error: 'Erro ao executar teste',
      details: error.message 
    }, { status: 500 });
  }
});