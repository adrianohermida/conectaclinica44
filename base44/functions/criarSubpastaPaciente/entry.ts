import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRIAR SUBPASTA AUTOMÁTICA POR PACIENTE
 * Padrão: "Paciente - CPF - Nome Completo"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paciente_id, clinica_id } = await req.json();

    // Buscar paciente/contato
    const contatos = await base44.entities.Contato.filter({ id: paciente_id });
    const paciente = contatos[0];

    if (!paciente) {
      return Response.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // Verificar se já existe pasta para esse paciente
    const pastasExistentes = await base44.entities.PastaCompliance.filter({
      nome: `Paciente - ${paciente.cpf || 'SEM_CPF'} - ${paciente.nome_completo}`
    });

    if (pastasExistentes.length > 0) {
      return Response.json({ 
        pasta_id: pastasExistentes[0].id,
        ja_existia: true 
      });
    }

    // Buscar pasta raiz "Pacientes" ou criar
    let pastaRaizPacientes = (await base44.entities.PastaCompliance.filter({ 
      nome: 'Pacientes',
      pasta_pai_id: null 
    }))[0];

    if (!pastaRaizPacientes) {
      pastaRaizPacientes = await base44.entities.PastaCompliance.create({
        nome: 'Pacientes',
        pasta_pai_id: null,
        cor: '#7E57FF',
        ordem: 0
      });
    }

    // Criar subpasta do paciente
    const novaPasta = await base44.entities.PastaCompliance.create({
      nome: `Paciente - ${paciente.cpf || 'SEM_CPF'} - ${paciente.nome_completo}`,
      pasta_pai_id: pastaRaizPacientes.id,
      descricao: `Documentos clínicos de ${paciente.nome_completo}`,
      cor: '#7E57FF',
      ordem: 0
    });

    return Response.json({ 
      pasta_id: novaPasta.id,
      ja_existia: false,
      nome: novaPasta.nome
    });
  } catch (error) {
    console.error('[criarSubpastaPaciente] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});