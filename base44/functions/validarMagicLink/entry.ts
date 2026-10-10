import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token } = await req.json();
    
    if (!token) {
      return Response.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    // Decodificar token
    let decoded;
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      return Response.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Validar expiração (24h)
    if (decoded.exp < Date.now()) {
      return Response.json({ error: 'Token expirado' }, { status: 401 });
    }

    // Buscar contato por email
    const contatos = await base44.asServiceRole.entities.Contato.filter({ 
      email: decoded.email 
    });

    if (contatos.length === 0) {
      return Response.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const contato = contatos[0];

    // Buscar dados do portal
    const [agendamentos, prontuarios, documentos] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({ 
        paciente_id: contato.id 
      }, '-data', 10),
      base44.asServiceRole.entities.Prontuario.filter({ 
        paciente_id: contato.id 
      }, '-data_atendimento', 10),
      base44.asServiceRole.entities.DocumentoPaciente.filter({ 
        paciente_id: contato.id 
      }, '-created_date', 10)
    ]);

    return Response.json({
      success: true,
      contato: {
        id: contato.id,
        nome_completo: contato.nome_completo,
        email: contato.email,
        telefone: contato.telefone,
        data_nascimento: contato.data_nascimento
      },
      dados: {
        agendamentos,
        prontuarios,
        documentos
      }
    });
  } catch (error) {
    console.error('Erro validação magic link:', error);
    return Response.json({ 
      error: 'Erro ao validar acesso',
      details: error.message 
    }, { status: 500 });
  }
});