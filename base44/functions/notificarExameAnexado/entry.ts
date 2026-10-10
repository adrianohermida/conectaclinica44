import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: Notificar quando exame/documento anexado
 * Trigger: DocumentoPaciente created com tipo="exame"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documento_id } = await req.json();
    const documento = await base44.entities.DocumentoCompliance.filter({ id: documento_id })[0];
    
    if (!documento || documento.vinculado_a?.tipo !== 'paciente') {
      return Response.json({ error: 'Documento inválido' }, { status: 400 });
    }

    const paciente = await base44.entities.Contato.filter({ id: documento.vinculado_a.id })[0];
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    if (!paciente?.email) {
      return Response.json({ error: 'Paciente sem email' }, { status: 400 });
    }

    const resultado = await enviarEmail({
      tipo: 'exame_anexado',
      para: paciente.email,
      assunto: `Novo documento disponível - ${clinica.nome}`,
      variaveis: {
        paciente_nome: paciente.nome,
        clinica_nome: clinica.nome,
        documento_tipo: documento.categoria === 'exame' ? 'Exame' : 'Documento',
        documento_nome: documento.titulo,
        data: new Date(documento.created_date).toLocaleDateString('pt-BR'),
        link_visualizar: `https://app.conectaclinica.com.br/portal/documentos/${documento.id}`
      }
    });

    return Response.json(resultado);
  } catch (error) {
    console.error('[NotificarExame] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});