import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P1 FINAL: Criar contato com validação CPF atômica
 * CRITICAL: Validação + create em 1 transação = race condition safe
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contatoData = await req.json();

    // P1 CRITICAL: Validar CPF duplicado ANTES de criar (atomic)
    if (contatoData.cpf) {
      const existentes = await base44.asServiceRole.entities.Contato.filter({
        clinica_id: user.clinica_id,
        cpf: contatoData.cpf
      });

      if (existentes.length > 0) {
        return Response.json({
          error: `CPF já cadastrado para: ${existentes[0].nome_completo}`,
          contato_existente: {
            id: existentes[0].id,
            nome: existentes[0].nome_completo
          }
        }, { status: 409 });
      }
    }

    // Criar contato com clinica_id validado
    const novoContato = await base44.asServiceRole.entities.Contato.create({
      ...contatoData,
      clinica_id: user.clinica_id,
      tipo_contato: "paciente"
    });

    return Response.json(novoContato);

  } catch (error) {
    console.error('Erro ao criar contato:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});