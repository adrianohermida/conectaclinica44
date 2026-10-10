import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P1 - EDGE_CPF_DUP: Validar CPF único no DB (server-side)
 * CRÍTICO: Frontend pode ser manipulado, validação DEVE ser backend
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.clinica_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cpf, excluir_id } = await req.json();

    if (!cpf) {
      return Response.json({ error: 'CPF required' }, { status: 400 });
    }

    // Buscar CPF duplicado na clínica
    const contatosExistentes = await base44.entities.Contato.filter({
      clinica_id: user.clinica_id,
      cpf: cpf
    });

    // Filtrar excluindo o próprio ID (edição)
    const duplicados = contatosExistentes.filter(c => c.id !== excluir_id);

    if (duplicados.length > 0) {
      return Response.json({
        valido: false,
        erro: `CPF já cadastrado para: ${duplicados[0].nome_completo}`,
        contato_existente: {
          id: duplicados[0].id,
          nome: duplicados[0].nome_completo,
          telefone: duplicados[0].telefone
        }
      });
    }

    return Response.json({
      valido: true
    });

  } catch (error) {
    console.error('Erro ao validar CPF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});