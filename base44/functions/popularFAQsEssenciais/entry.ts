import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULAR FAQs ESSENCIAIS - Seed inicial
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const faqs = [
      {
        secao: 'produto',
        categoria: 'agenda',
        pergunta: 'Como agendar uma consulta?',
        resposta: '1. Acesse o módulo **Agenda**\n2. Clique em **Novo Agendamento**\n3. Selecione paciente, médico, data/hora\n4. Confirme',
        resposta_curta: 'Vá em Agenda → Novo Agendamento → preencha os dados.',
        tags: ['agendamento', 'consulta', 'marcar'],
        aprovado: true,
        ordem: 1
      },
      {
        secao: 'tecnico',
        categoria: 'whatsapp',
        pergunta: 'Como configurar WhatsApp?',
        resposta: '1. Vá em **Admin → Integrações**\n2. Configure Twilio (Account SID + Auth Token)\n3. Ative agente IA\n4. Conecte número verificado',
        resposta_curta: 'Configure Twilio em Admin → Integrações.',
        tags: ['whatsapp', 'twilio', 'configuracao'],
        aprovado: true,
        ordem: 2
      },
      {
        secao: 'suporte',
        categoria: 'financeiro',
        pergunta: 'Como trocar de plano?',
        resposta: 'Vá em **Admin → Minha Assinatura** → Trocar Plano → Escolha novo plano → Confirme. Mudança é imediata, crédito proporcional.',
        resposta_curta: 'Admin → Minha Assinatura → Trocar Plano',
        tags: ['plano', 'upgrade', 'assinatura'],
        aprovado: true,
        ordem: 3
      },
      {
        secao: 'compliance',
        categoria: 'geral',
        pergunta: 'ConectaClínica é LGPD compliant?',
        resposta: '✅ Sim. Todos dados são criptografados, logs de acesso rastreados, consentimento obrigatório, DPO disponível.',
        resposta_curta: 'Sim, 100% LGPD compliant com criptografia e auditoria.',
        tags: ['lgpd', 'privacidade', 'seguranca'],
        aprovado: true,
        ordem: 4
      },
      {
        secao: 'produto',
        categoria: 'telemedicina',
        pergunta: 'Como fazer teleconsulta?',
        resposta: '1. Agende consulta tipo **Telemedicina**\n2. No horário, acesse **Telemedicina** → Sala Virtual\n3. Iniciar chamada',
        resposta_curta: 'Agende consulta tipo Telemedicina → Acesse Sala Virtual no horário.',
        tags: ['telemedicina', 'videochamada', 'online'],
        aprovado: true,
        ordem: 5
      }
    ];

    await base44.asServiceRole.entities.ArtigoFAQ.bulkCreate(faqs);

    return Response.json({ 
      success: true,
      total: faqs.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});