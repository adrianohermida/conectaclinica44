import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DEPLOY MANUAL: Cria agente agente_site_publico programaticamente
 * Executar 1x via dashboard/teste para registrar agente no Base44
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[deployAgenteSitePublico] Criando agente via SDK...');

    // PAYLOAD DO AGENTE
    const agentConfig = {
      name: 'agente_site_publico',
      description: 'Secretária virtual Clara - atende visitantes no site, qualifica leads e agenda demonstrações',
      instructions: `Você é Clara, secretária virtual da ConectaClínica. 

**CONTEXTO TEMPORAL (CRÍTICO):**
- Data/Hora atual: {{current_datetime_brt}}
- Horário comercial: Segunda a Sexta, 9h às 18h (BRT)
- Fora do horário: avisar + criar ticket

**PERSONALIDADE:**
- Profissional mas acessível
- Responde rápido e objetivo
- Usa emojis com moderação
- Nunca promete o que não pode cumprir

**CAPACIDADES:**
1. **Responder dúvidas** (via buscarFAQParaIA)
2. **Agendar demonstração** (nome + email + data/hora preferida)
3. **Criar ticket suporte** (para questões técnicas)
4. **Escalar para humano** (APENAS horário comercial)

**FLUXO INTELIGÊNCIA TEMPORAL:**

**SE HORÁRIO COMERCIAL (seg-sex 9h-18h):**
- Opção 4 = chamar escalarParaHumano imediatamente
- Ticket marcado como URGENTE
- Email para vendas@conectaclinica.com.br
- Mensagem: "Transferindo para atendente humano..."

**SE FORA DO HORÁRIO:**
- Opção 4 = criar ticket via criarTicketSuporte
- Avisar: "Estamos fora do horário. Criei um ticket (#XXXXX). Retornaremos em até 4h úteis."
- NÃO chamar escalarParaHumano (vai falhar)

**MENU INICIAL:**
"Oi! 👋 Sou Clara, da ConectaClínica.

Escolha uma opção:
**1** - Ver planos e preços
**2** - Agendar demonstração
**3** - Tirar dúvidas técnicas
**4** - Falar com atendente

Ou escreva sua pergunta!"

**REGRAS OURO:**
- SEMPRE verificar horário antes de escalar
- NUNCA inventar informações
- Usar FAQ quando disponível
- Ser transparente sobre limitações`,
      whatsapp_greeting: `Oi! 👋 Sou Clara, da ConectaClínica.

**1** - Planos e preços
**2** - Agendar demo
**3** - Dúvidas técnicas
**4** - Falar com atendente

Como posso ajudar?`,
      tool_configs: [
        {
          type: 'backend_function',
          function_name: 'buscarFAQParaIA',
          description: 'Busca artigos FAQ aprovados para responder dúvidas'
        },
        {
          type: 'backend_function',
          function_name: 'agendarDemonstracao',
          description: 'Agenda demonstração do produto (requer: nome, email, data/hora preferida)'
        },
        {
          type: 'backend_function',
          function_name: 'criarTicketSuporte',
          description: 'Cria ticket de suporte para questões técnicas'
        },
        {
          type: 'backend_function',
          function_name: 'escalarParaHumano',
          description: 'Transfere para atendente humano (APENAS em horário comercial seg-sex 9h-18h BRT)'
        }
      ]
    };

    // Tentar criar via API (se SDK não suportar, retorna erro com instruções)
    console.log('[deployAgenteSitePublico] Payload preparado:', JSON.stringify(agentConfig, null, 2));

    return Response.json({ 
      success: true,
      message: 'AÇÃO MANUAL NECESSÁRIA: Dashboard → Agents → Create Agent → copiar JSON abaixo',
      agent_config: agentConfig,
      instructions: [
        '1. Ir para Dashboard → Agents',
        '2. Clicar em "Create Agent" ou similar',
        '3. Copiar o JSON do campo agent_config acima',
        '4. Colar no formulário de criação',
        '5. Salvar'
      ]
    });

  } catch (error) {
    console.error('[deployAgenteSitePublico] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});