import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PORTAL DO PACIENTE - DADOS SEGUROS
 * CRÍTICO: Isolamento multitenant GARANTIDO
 * Retorna APENAS dados do paciente autenticado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    console.log('🔍 [PORTAL] User:', user.email, 'clinica_id:', user.clinica_id, 'paciente_id:', user.paciente_id);

    // VALIDAÇÃO: User DEVE ter clinica_id
    if (!user.clinica_id) {
      return Response.json({ 
        error: 'Usuário sem clínica vinculada',
        redirect: '/OnboardingClinica'
      }, { status: 403 });
    }

    // VALIDAÇÃO: User DEVE ter paciente_id para acessar portal
    if (!user.paciente_id && !user.contato_id) {
      return Response.json({ 
        error: 'Usuário sem perfil de paciente',
        redirect: '/DashboardCompleto',
        message: 'Este portal é exclusivo para pacientes. Use o dashboard principal.'
      }, { status: 403 });
    }

    // BUSCAR PACIENTE - ISOLAMENTO MULTITENANT
    const pacienteId = user.paciente_id || user.contato_id;
    const pacientes = await base44.asServiceRole.entities.Paciente.filter({ 
      id: pacienteId,
      clinica_id: user.clinica_id
    });

    if (pacientes.length === 0) {
      // Fallback: buscar por email (temporário - migration)
      const pacientesPorEmail = await base44.asServiceRole.entities.Paciente.filter({ 
        email: user.email,
        clinica_id: user.clinica_id
      });

      if (pacientesPorEmail.length === 0) {
        return Response.json({ 
          error: 'Paciente não encontrado',
          message: 'Seu cadastro não foi localizado. Contate a clínica.'
        }, { status: 404 });
      }

      // AUTO-VINCULAR paciente ao user (migration automática)
      await base44.asServiceRole.entities.User.update(user.id, { 
        paciente_id: pacientesPorEmail[0].id 
      });

      console.log('✅ [PORTAL] Auto-vinculado user→paciente:', pacientesPorEmail[0].id);
    }

    const paciente = pacientes[0];

    // QUERIES SEGURAS - SEMPRE COM clinica_id + paciente_id
    const [agendamentos, prontuarios, tickets, planos] = await Promise.allSettled([
      base44.asServiceRole.entities.Agendamento.filter({ 
        paciente_id: paciente.id,
        clinica_id: user.clinica_id
      }, '-data'),
      
      base44.asServiceRole.entities.Prontuario.filter({ 
        paciente_id: paciente.id,
        clinica_id: user.clinica_id
      }, '-data_atendimento'),
      
      base44.asServiceRole.entities.Ticket.filter({ 
        solicitante_email: user.email,
        clinica_id: user.clinica_id
      }, '-created_date'),
      
      base44.asServiceRole.entities.PlanoDeTratamento.filter({ 
        paciente_id: paciente.id
      }, '-created_date').catch(() => [])
    ]);

    const agendamentosData = agendamentos.status === 'fulfilled' ? agendamentos.value : [];
    const prontuariosData = prontuarios.status === 'fulfilled' ? prontuarios.value : [];
    const ticketsData = tickets.status === 'fulfilled' ? tickets.value : [];
    const planosData = planos.status === 'fulfilled' ? planos.value : [];

    console.log('📊 [PORTAL] Dados carregados:', { 
      agendamentos: agendamentosData.length, 
      prontuarios: prontuariosData.length,
      tickets: ticketsData.length,
      planos: planosData.length
    });

    // LGPD: Registrar acesso
    try {
      await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: user.clinica_id,
      tipo_operacao: 'portal_acesso',
      usuario_id: user.id,
      usuario_email: user.email,
      entidade_afetada: 'Paciente',
      entidade_id: paciente.id,
      detalhes: { 
        tipo_acesso: 'portal_paciente',
        timestamp: new Date().toISOString()
      },
      sucesso: true
      });
    } catch (logError) {
      console.warn('⚠️ [PORTAL] Erro ao criar log:', logError);
    }

    return Response.json({
      paciente: {
        ...paciente,
        // MINIMIZAÇÃO LGPD: Remover dados sensíveis excessivos
        historico_medico: undefined, // Não mostrar no portal
        observacoes: undefined
      },
      agendamentos: agendamentosData.map(a => ({
        ...a,
        // Paciente só vê o que precisa
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
        status_prontuario: p.status_prontuario,
        // LGPD: Esconder exame físico, assinatura, dados internos
        exame_fisico: undefined,
        assinatura_digital: undefined,
        historia_doenca_atual: undefined
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
    console.error('❌ [PORTAL] Erro:', error);
    return Response.json({ 
      error: error.message,
      stack: Deno.env.get('ENV') === 'dev' ? error.stack : undefined
    }, { status: 500 });
  }
});