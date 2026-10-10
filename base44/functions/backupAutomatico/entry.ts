import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar se é chamada agendada (cron) ou manual
    const { manual = false } = await req.json().catch(() => ({}));
    
    const timestamp = new Date().toISOString();
    const dataFormatada = timestamp.split('T')[0];
    
    // Buscar todas as entidades principais
    const [
      pacientes,
      prontuarios,
      agendamentos,
      medicamentos,
      vendas,
      certidoes,
      planosTratamento,
      documentos
    ] = await Promise.all([
      base44.asServiceRole.entities.Paciente.list(),
      base44.asServiceRole.entities.Prontuario.list(),
      base44.asServiceRole.entities.Agendamento.list(),
      base44.asServiceRole.entities.Medicamento.list(),
      base44.asServiceRole.entities.Venda.list(),
      base44.asServiceRole.entities.CertidaoRegularidade.list(),
      base44.asServiceRole.entities.PlanoTratamento.list(),
      base44.asServiceRole.entities.DocumentoPaciente.list()
    ]);

    // Criar backup JSON
    const backup = {
      timestamp,
      versao: "1.0",
      total_registros: pacientes.length + prontuarios.length + agendamentos.length + 
                       medicamentos.length + vendas.length + certidoes.length + 
                       planosTratamento.length + documentos.length,
      entidades: {
        pacientes,
        prontuarios,
        agendamentos,
        medicamentos,
        vendas,
        certidoes,
        planosTratamento,
        documentos: documentos.map(d => ({
          ...d,
          arquivo_url: d.arquivo_url // Manter URL para restauração
        }))
      }
    };

    const backupJSON = JSON.stringify(backup, null, 2);
    const encoder = new TextEncoder();
    const backupBlob = encoder.encode(backupJSON);

    // Salvar backup
    const fileName = `backup_prevenclin_${dataFormatada}_${Date.now()}.json`;
    const file = new File([backupBlob], fileName, { type: 'application/json' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Registrar log de auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      tipo_acao: "backup_sistema",
      entidade: "Sistema",
      descricao: `Backup automático realizado: ${backup.total_registros} registros`,
      usuario: "Sistema Automático",
      ip_origem: "backup-service",
      timestamp: timestamp,
      dados_antes: {},
      dados_depois: { arquivo_backup: file_url, total_registros: backup.total_registros },
      nivel_criticidade: "info",
      modulo: "Backup"
    });

    return Response.json({
      success: true,
      backup_url: file_url,
      total_registros: backup.total_registros,
      timestamp,
      entidades_backup: Object.keys(backup.entidades).map(key => ({
        entidade: key,
        quantidade: backup.entidades[key].length
      }))
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});