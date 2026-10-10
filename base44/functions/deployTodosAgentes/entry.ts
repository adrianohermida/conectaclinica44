import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DEPLOY COMPLETO: Cria todos agentes de uma vez
 * Garante consistência total
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[deployTodosAgentes] Iniciando deploy completo...');

    const appId = Deno.env.get('BASE44_APP_ID');
    const apiKey = Deno.env.get('BASE44_API_KEY');
    let baseUrl = Deno.env.get('BASE44_BASE_URL') || 'https://base44.app';
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

    if (!appId || !apiKey) {
      return Response.json({ error: 'Secrets não configurados' }, { status: 500 });
    }

    const agentes = [
      {
        name: 'agendamento_consultas',
        description: 'Secretária virtual Clara - atende visitantes públicos no site ConectaClínica',
        instructions: `Você é Clara, secretária virtual da ConectaClínica.

**CONTEXTO:**
- Horário: seg-sex 9h-18h BRT
- Público: visitantes site (NÃO autenticados)

**MENU:**
"Oi! 👋 Sou Clara.

**1** - Planos
**2** - Agendar demo
**3** - Dúvidas
**4** - Atendente

Como posso ajudar?"

**REGRAS:**
- Escalar apenas em horário comercial
- Criar ticket fora do horário
- Transparente sobre limitações`,
        whatsapp_greeting: "Oi! 👋 Clara da ConectaClínica.\n\n1-Planos 2-Demo 3-Dúvidas 4-Atendente",
        tool_configs: [
          { type: 'backend_function', function_name: 'buscarFAQParaIA' },
          { type: 'backend_function', function_name: 'agendarDemonstracao' },
          { type: 'backend_function', function_name: 'criarTicketSuporte' },
          { type: 'backend_function', function_name: 'escalarParaHumano' }
        ]
      },
      {
        name: 'triagem_paciente',
        description: 'Agente multicanal - portal, WhatsApp, dashboard com contexto automático',
        instructions: `Assistente inteligente multicanal.

**CONTEXTO AUTOMÁTICO:**
- Dashboard: acesso admin
- Portal paciente: apenas dados próprios
- WhatsApp: auto-identifica por número

**CAPACIDADES:**
- Agendar/remarcar/cancelar
- Consultar prontuários (se autorizado)
- Sugerir horários baseado em histórico
- Triagem urgência

**SEGURANÇA:**
- Validar identidade sempre
- Isolamento por clinica_id
- Zero exposição de dados alheios`,
        whatsapp_greeting: "Olá! 👋\n\n📅 Agendar\n📋 Meus agendamentos\n💊 Dúvidas\n\nComo posso ajudar?",
        tool_configs: [
          { entity_name: 'Agendamento', allowed_operations: ['create', 'read', 'update', 'delete'] },
          { entity_name: 'Contato', allowed_operations: ['create', 'read', 'update'] },
          { entity_name: 'Prontuario', allowed_operations: ['read'] },
          { entity_name: 'Medico', allowed_operations: ['read'] },
          { entity_name: 'Produto', allowed_operations: ['read'] },
          { entity_name: 'FAQ', allowed_operations: ['read'] }
        ]
      }
    ];

    const resultados = [];

    for (const agentConfig of agentes) {
      console.log(`[deployTodosAgentes] Criando: ${agentConfig.name}`);

      const response = await fetch(`${baseUrl}/api/apps/${appId}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(agentConfig)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[deployTodosAgentes] Erro ${agentConfig.name}:`, error);
        resultados.push({
          name: agentConfig.name,
          status: 'error',
          error: error
        });
      } else {
        const agente = await response.json();
        console.log(`[deployTodosAgentes] ✅ ${agentConfig.name} criado`);
        resultados.push({
          name: agentConfig.name,
          status: 'success',
          id: agente.id || agente.name
        });
      }
    }

    const sucessos = resultados.filter(r => r.status === 'success').length;
    const falhas = resultados.filter(r => r.status === 'error').length;

    return Response.json({
      success: falhas === 0,
      total: agentes.length,
      sucessos,
      falhas,
      resultados
    });

  } catch (error) {
    console.error('[deployTodosAgentes] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});