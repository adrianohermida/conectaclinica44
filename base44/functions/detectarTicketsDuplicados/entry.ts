import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Detecta tickets potencialmente duplicados baseado em:
 * - Mesmo email/telefone do solicitante
 * - Assunto similar (fuzzy match)
 * - Criados em intervalo de tempo próximo (24h)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clinica_id, ticket_id } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id required' }, { status: 400 });
    }

    // Buscar ticket de referência
    const ticketRef = ticket_id 
      ? await base44.entities.Ticket.filter({ id: ticket_id, clinica_id }).then(t => t[0])
      : null;

    // Buscar todos tickets ABERTOS da clínica
    const todosTickets = await base44.asServiceRole.entities.Ticket.filter({
      clinica_id,
      status: { $in: ['aberto', 'em_andamento', 'aguardando_cliente'] }
    });

    // Algoritmo de detecção
    const duplicatas = [];
    const jaProcessados = new Set();

    for (const ticket of todosTickets) {
      if (jaProcessados.has(ticket.id)) continue;
      
      const similares = todosTickets.filter(outro => {
        if (outro.id === ticket.id || jaProcessados.has(outro.id)) return false;

        // Critério 1: Mesmo solicitante (email OU telefone)
        const mesmoEmail = ticket.solicitante_email && 
          outro.solicitante_email === ticket.solicitante_email;
        const mesmoTelefone = ticket.solicitante_telefone && 
          outro.solicitante_telefone === ticket.solicitante_telefone;

        if (!mesmoEmail && !mesmoTelefone) return false;

        // Critério 2: Assunto similar (fuzzy)
        const assunto1 = (ticket.assunto || '').toLowerCase().trim();
        const assunto2 = (outro.assunto || '').toLowerCase().trim();
        const similaridade = calcularSimilaridade(assunto1, assunto2);
        
        if (similaridade < 0.6) return false;

        // Critério 3: Intervalo de 24h
        const diff = Math.abs(
          new Date(ticket.created_date).getTime() - 
          new Date(outro.created_date).getTime()
        );
        const horas = diff / (1000 * 60 * 60);
        
        return horas <= 24;
      });

      if (similares.length > 0) {
        const grupo = [ticket, ...similares];
        duplicatas.push({
          grupo_id: `dup_${ticket.id}`,
          tickets: grupo.map(t => ({
            id: t.id,
            numero_ticket: t.numero_ticket,
            assunto: t.assunto,
            status: t.status,
            canal: t.canal,
            created_date: t.created_date,
            solicitante_nome: t.solicitante_nome,
            solicitante_email: t.solicitante_email
          })),
          confianca: Math.max(...similares.map(s => 
            calcularSimilaridade(
              (ticket.assunto || '').toLowerCase(), 
              (s.assunto || '').toLowerCase()
            )
          ))
        });
        
        // Marcar como processados
        grupo.forEach(t => jaProcessados.add(t.id));
      }
    }

    return Response.json({
      success: true,
      total_duplicatas: duplicatas.length,
      grupos: duplicatas.sort((a, b) => b.confianca - a.confianca)
    });

  } catch (error) {
    console.error('[Detectar Duplicatas] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Similaridade de strings (Levenshtein simplificado)
function calcularSimilaridade(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}