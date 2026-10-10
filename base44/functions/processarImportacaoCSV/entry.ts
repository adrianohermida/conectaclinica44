import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { parse } from 'npm:csv-parse/sync';

/**
 * PROCESSAMENTO IMPORTAÇÃO CSV - Background Job
 * 
 * Processa CSV/XLS em lotes de 50 registros
 * Atualiza job em tempo real
 * Notifica usuário ao concluir
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    const jobs = await base44.asServiceRole.entities.ImportacaoJob.filter({ id: job_id });
    if (jobs.length === 0) {
      return Response.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    const job = jobs[0];

    // Atualizar status
    await base44.asServiceRole.entities.ImportacaoJob.update(job_id, {
      status: 'processando',
      data_inicio: new Date().toISOString()
    });

    // Baixar arquivo
    const fileRes = await fetch(job.arquivo_url);
    const csvText = await fileRes.text();

    // Parse CSV (suporta , ; \t)
    const registros = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: [',', ';', '\t'],
      trim: true
    });

    const total = registros.length;
    let sucesso = 0;
    let erros = 0;
    const errosDetalhes = [];

    // Processar em lotes de 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
      const lote = registros.slice(i, i + BATCH_SIZE);

      for (const [idx, reg] of lote.entries()) {
        try {
          const payload = { ...reg, clinica_id: user.clinica_id };
          
          if (job.tipo_entidade === 'Contato') {
            await base44.asServiceRole.entities.Contato.create(payload);
          } else if (job.tipo_entidade === 'Produto') {
            await base44.asServiceRole.entities.Produto.create(payload);
          } else if (job.tipo_entidade === 'Prontuario') {
            await base44.asServiceRole.entities.Prontuario.create(payload);
          }

          sucesso++;
        } catch (err) {
          erros++;
          errosDetalhes.push({ linha: i + idx + 2, erro: err.message });
        }
      }

      // Atualizar progresso
      await base44.asServiceRole.entities.ImportacaoJob.update(job_id, {
        processados: i + lote.length,
        sucesso,
        erros
      });
    }

    // Finalizar
    await base44.asServiceRole.entities.ImportacaoJob.update(job_id, {
      status: erros > 0 ? 'erro' : 'concluido',
      total_registros: total,
      processados: total,
      sucesso,
      erros,
      erros_detalhes: errosDetalhes,
      data_fim: new Date().toISOString()
    });

    // Notificar usuário
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Importação ${job.tipo_entidade} concluída`,
      body: `
        <h2>Importação Finalizada</h2>
        <p><strong>Total:</strong> ${total}</p>
        <p><strong>Sucesso:</strong> ${sucesso}</p>
        <p><strong>Erros:</strong> ${erros}</p>
      `
    }).catch(() => {});

    return Response.json({ success: true, sucesso, erros });

  } catch (error) {
    console.error('Erro importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});