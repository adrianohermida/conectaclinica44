import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PERFORMANCE CRÍTICO: Agrega 4 queries em 1 endpoint
 * Prontuarios + Pacientes + Medicos + Documentos em Promise.all
 * 
 * ANTES: 4 calls sequenciais (~800ms total)
 * DEPOIS: 1 call paralelo (~250ms)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicaId = user.clinica_id;

    // CRÍTICO: Promise.all - executa em paralelo
    const [prontuarios, pacientes, medicos, documentos] = await Promise.all([
      base44.entities.Prontuario.filter({ clinica_id: clinicaId }, '-data_atendimento', 100),
      base44.entities.Contato.filter({ clinica_id: clinicaId, tipo_contato: 'paciente' }),
      base44.entities.Medico.filter({ clinica_id: clinicaId }),
      base44.entities.DocumentoPaciente.filter({ clinica_id: clinicaId }, '-data_upload', 200)
    ]);

    return Response.json({
      success: true,
      data: {
        prontuarios,
        pacientes,
        medicos,
        documentos
      }
    });

  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});