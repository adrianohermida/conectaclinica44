import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * RENDER ENGINE: Templates notificações com variáveis dinâmicas
 * Uso: await renderTemplateNotificacao(clinica_id, tipo, variables)
 * Retorna: {titulo, corpo, acao_label, prioridade, canal, icone, cor}
 */

// Templates globais padrão
const templatesGlobais = {
  ticket_novo: {
    titulo_template: "Novo ticket {{numero_ticket}}",
    corpo_template: "{{solicitante_nome}} enviou: {{assunto}}",
    variaveis_disponiveis: ["numero_ticket", "solicitante_nome", "solicitante_email", "assunto"],
    acao_label: "Abrir ticket",
    prioridade_padrao: "media",
    icone: "MessageSquare",
    cor: "#7E57FF"
  },
  agendamento_confirmado: {
    titulo_template: "Nova consulta agendada",
    corpo_template: "{{paciente_nome}} agendou para {{data}} às {{horario}}",
    variaveis_disponiveis: ["paciente_nome", "data", "horario", "tipo_consulta"],
    acao_label: "Abrir agenda",
    prioridade_padrao: "media",
    icone: "Calendar",
    cor: "#7E57FF"
  },
  aprovacao_prontuario: {
    titulo_template: "Acesso cross-tenant solicitado",
    corpo_template: "{{solicitante_nome}} acessou prontuário de {{paciente_nome}} (médico: {{medico_responsavel}}). Justificativa: {{justificativa}}",
    variaveis_disponiveis: ["solicitante_nome", "paciente_nome", "medico_responsavel", "justificativa"],
    acao_label: "Ver prontuário",
    prioridade_padrao: "alta",
    icone: "Shield",
    cor: "#ea4335"
  },
  termo_pendente: {
    titulo_template: "Termo pendente de aceite",
    corpo_template: "{{termo_titulo}} requer sua aprovação antes de continuar usando o sistema",
    variaveis_disponiveis: ["termo_titulo", "termo_tipo", "data_limite"],
    acao_label: "Aceitar termo",
    prioridade_padrao: "urgente",
    icone: "FileText",
    cor: "#ea4335"
  },
  prontuario_pronto: {
    titulo_template: "Prontuário finalizado",
    corpo_template: "Dr(a). {{medico_nome}} finalizou prontuário de {{paciente_nome}}",
    variaveis_disponiveis: ["medico_nome", "paciente_nome", "data_atendimento"],
    acao_label: "Ver prontuário",
    prioridade_padrao: "baixa",
    icone: "FileText",
    cor: "#34a853"
  },
  ticket_respondido: {
    titulo_template: "Resposta no ticket {{numero_ticket}}",
    corpo_template: "{{atendente_nome}} respondeu seu ticket",
    variaveis_disponiveis: ["numero_ticket", "atendente_nome", "preview_resposta"],
    acao_label: "Ver resposta",
    prioridade_padrao: "media",
    icone: "MessageSquare",
    cor: "#34a853"
  }
};

function renderTemplate(template, variables) {
  let titulo = template.titulo_template;
  let corpo = template.corpo_template;

  // Substituir variáveis {{variavel}} por valores
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    titulo = titulo.replace(regex, value || '');
    corpo = corpo.replace(regex, value || '');
  });

  return {
    titulo,
    corpo,
    acao_label: template.acao_label || 'Ver detalhes',
    prioridade: template.prioridade_padrao || 'media',
    canal: template.canal_padrao || 'in_app',
    icone: template.icone || 'Bell',
    cor: template.cor || '#7E57FF'
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clinica_id, tipo, variables } = await req.json();

    if (!tipo || !variables) {
      return Response.json({ error: 'tipo e variables obrigatórios' }, { status: 400 });
    }

    // Buscar template customizado da clínica
    let template = null;
    if (clinica_id) {
      const templates = await base44.asServiceRole.entities.TemplateNotificacao.filter({
        clinica_id,
        tipo,
        ativo: true
      });
      template = templates[0];
    }

    // Fallback template global
    if (!template) {
      template = templatesGlobais[tipo];
    }

    if (!template) {
      return Response.json({ 
        error: `Template não encontrado para tipo: ${tipo}`,
        fallback: true,
        titulo: variables.titulo || 'Notificação',
        corpo: variables.corpo || 'Você tem uma nova notificação'
      }, { status: 404 });
    }

    const rendered = renderTemplate(template, variables);

    return Response.json({
      success: true,
      ...rendered
    });

  } catch (error) {
    console.error('[renderTemplateNotificacao] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});