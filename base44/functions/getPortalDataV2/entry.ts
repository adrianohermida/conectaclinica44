import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PORTAL DO PACIENTE V2 - ARQUITETURA LIMPA
 * Usa Contato (unificado) ao invés de Paciente (deprecated)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('🔍 [PORTAL V2] User:', user.email, 'contato_id:', user.contato_id);

    if (!user.clinica_id) {
      return Response.json({ 
        error: 'Usuário sem clínica',
        redirect: '/OnboardingClinica'
      }, { status: 403 });
    }

    // ARQUITETURA LIMPA: user.contato_id (unificado)
    const contatoId = user.contato_id || user.paciente_id; // Fallback temporário

    if (!contatoId) {
      return Response.json({ 
        error: 'Usuário sem perfil de paciente',
        redirect: '/DashboardCompleto'
      }, { status: 403 });
    }

    // BUSCAR CONTATO - Query unificada
    const contatos = await base44.asServiceRole.entities.Contato.filter({ 
      id: contatoId,
      clinica_id: user.clinica_id,
      tipo_contato: 'paciente'
    });

    if (contatos.length === 0) {
      // Fallback: buscar por user_id (vinculação direta)
      const contatosPorUser = await base44.asServiceRole.entities.Contato.filter({ 
        user_id: user.id,
        clinica_id: user.clinica_id,
        tipo_contato: 'paciente'
      });

      if (contatosPorUser.length === 0) {
        return Response.json({ 
          error: 'Paciente não encontrado',
          message: 'Execute migration: /functions/migrarPacientesParaContatos'
        }, { status: 404 });
      }

      // Auto-vincular
      await base44.asServiceRole.entities.User.update(user.id, { 
        contato_id: contatosPorUser[0].id 
      });

      console.log('✅ [PORTAL V2] Auto-vinculado user→contato:', contatosPorUser[0].id);
    }

    const contato = contatos[0];

    // QUERIES usando contato_id
    const [agendamentos, prontuarios, tickets, planos] = await Promise.allSettled([
      base44.asServiceRole.entities.Agendamento.filter({ 
        paciente_nome: contato.nome_completo, // Index existente
        clinica_id: user.clinica_id
      }, '-data'),
      
      base44.asServiceRole.entities.Prontuario.filter({ 
        paciente_nome: contato.nome_completo,
        clinica_id: user.clinica_id
      }, '-data_atendimento'),
      
      base44.asServiceRole.entities.Ticket.filter({ 
        solicitante_email: user.email,
        clinica_id: user.clinica_id
      }, '-created_date'),
      
      base44.asServiceRole.entities.PlanoDeTratamento.filter({ 
        paciente_nome: contato.nome_completo
      }, '-created_date').catch(() => [])
    ]);

    const agendamentosData = agendamentos.status === 'fulfilled' ? agendamentos.value : [];
    const prontuariosData = prontuarios.status === 'fulfilled' ? prontuarios.value : [];
    const ticketsData = tickets.status === 'fulfilled' ? tickets.value : [];
    const planosData = planos.status === 'fulfilled' ? planos.value : [];

    console.log('📊 [PORTAL V2] Dados:', { 
      agendamentos: agendamentosData.length, 
      prontuarios: prontuariosData.length,
      tickets: ticketsData.length,
      planos: planosData.length
    });

    // Log auditoria
    try {
      await base44.asServiceRole.entities.LogAuditoria.create({
        clinica_id: user.clinica_id,
        tipo_operacao: 'portal_acesso_v2',
        usuario_id: user.id,
        usuario_email: user.email,
        entidade_afetada: 'Contato',
        entidade_id: contato.id,
        detalhes: { tipo_acesso: 'portal_paciente' },
        sucesso: true
      });
    } catch (logError) {
      console.warn('⚠️ Log failed:', logError);
    }

    return Response.json({
      paciente: {
        ...contato,
        historico_medico: undefined,
        observacoes: undefined
      },
      agendamentos: agendamentosData.map(a => ({
        ...a,
        observacoes: undefined
      })),
      prontuarios: prontuariosData.map(p => ({
        id: p.id,
        data_atendimento: p.data_atendimento,
        hora_atendimento: p.hora_atendimento,
        medico_nome: p.medico_nome,
        tipo_atendimento: p.tipo_atendimento,
        hipotese_diagnostica: p.hipotese_diagnostica,
        conduta: p.conduta,
        status_prontuario: p.status_prontuario
      })),
      tickets: ticketsData,
      planos: planosData,
      stats: {
        total_consultas: prontuariosData.length,
        proximas_consultas: agendamentosData.filter(a => new Date(a.data) >= new Date() && a.status !== 'cancelado').length,
        tickets_abertos: ticketsData.filter(t => t.status === 'aberto' || t.status === 'em_andamento').length,
        planos_ativos: planosData.filter(p => p.status === 'em_andamento' || p.status === 'ativo').length
      }
    });

  } catch (error) {
    console.error('❌ [PORTAL V2] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});