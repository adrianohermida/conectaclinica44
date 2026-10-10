import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Exportação completa de dados do paciente
 * LGPD Art. 18, IV - Direito à portabilidade
 * 
 * SEGURANÇA:
 * - Multi-tenant: valida clinica_id
 * - Rate limiting: máx 3 exportações/hora por clínica
 * - Autorização: staff da clínica OU próprio paciente
 * 
 * FORMATOS: JSON (padrão) ou CSV (query param ?format=csv)
 */

// Rate limiting em memória (produção: usar Redis)
const rateLimitStore = new Map();

function checkRateLimit(clinicaId) {
  const now = Date.now();
  const key = `export_${clinicaId}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + 3600000 };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 3600000;
  }

  if (record.count >= 3) {
    return { allowed: false, resetIn: Math.ceil((record.resetAt - now) / 60000) };
  }

  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { paciente_id } = await req.json();
    const url = new URL(req.url);
    const formato = url.searchParams.get('format') || 'json';

    if (!paciente_id) {
      return Response.json({ error: 'paciente_id obrigatório' }, { status: 400 });
    }

    // ARQUITETURA V2: Buscar Contato
    const [paciente] = await base44.asServiceRole.entities.Contato.filter({ 
      id: paciente_id,
      tipo_contato: 'paciente'
    });
    
    if (!paciente) {
      return Response.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    // MULTI-TENANT: Validar acesso
    const isStaffDaClinica = user.clinica_id === paciente.clinica_id;
    const isProprioTitular = user.id === paciente.user_id;

    if (!isStaffDaClinica && !isProprioTitular) {
      return Response.json({ 
        error: 'Acesso negado. Você não tem permissão para exportar dados deste paciente.' 
      }, { status: 403 });
    }

    // RATE LIMITING (apenas para staff, paciente sem limite)
    if (isStaffDaClinica && !isProprioTitular) {
      const rateCheck = checkRateLimit(user.clinica_id);
      if (!rateCheck.allowed) {
        return Response.json({ 
          error: `Limite de exportações excedido. Tente novamente em ${rateCheck.resetIn} minutos.`,
          limite: '3 exportações por hora'
        }, { status: 429 });
      }
    }

    // Buscar dados do paciente (filtrar por clinica_id para garantir multi-tenant)
    const [
      agendamentos,
      prontuarios,
      prescricoes,
      documentos,
      planos,
      vendas,
      jornadas
    ] = await Promise.all([
      base44.asServiceRole.entities.Agendamento.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.Prontuario.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.PrescricaoEletronica.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.DocumentoPaciente.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.PlanoTratamento.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.Venda.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      }),
      base44.asServiceRole.entities.JornadaPaciente.filter({ 
        clinica_id: paciente.clinica_id,
        paciente_id 
      })
    ]);

    // Log de auditoria (LGPD Art. 37)
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id: paciente.clinica_id,
      usuario_email: user.email,
      usuario_nome: user.full_name,
      acao: "exportacao_dados",
      entidade: "Contato",
      registro_id: paciente_id,
      detalhes: {
        motivo: "Portabilidade de dados (LGPD Art. 18, IV)",
        tipo_solicitante: isProprioTitular ? 'titular' : 'staff',
        formato: formato.toUpperCase(),
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        timestamp: new Date().toISOString()
      },
      nivel_sensibilidade: "alta"
    });

    const exportacao = {
      metadata: {
        exportacao_id: `EXP${Date.now()}`,
        data_exportacao: new Date().toISOString(),
        paciente_id,
        paciente_nome: paciente.nome_completo,
        solicitante: user.email,
        tipo_solicitante: isProprioTitular ? 'titular' : 'staff',
        base_legal: "LGPD Art. 18, IV - Direito à portabilidade",
        formato: formato.toUpperCase()
      },
      dados_cadastrais: {
        ...paciente,
        _entidade: "Contato"
      },
      historico_clinico: {
        agendamentos: agendamentos.map(a => ({ ...a, _entidade: "Agendamento" })),
        prontuarios: prontuarios.map(p => ({ ...p, _entidade: "Prontuario" })),
        prescricoes: prescricoes.map(p => ({ ...p, _entidade: "PrescricaoEletronica" })),
        planos_tratamento: planos.map(p => ({ ...p, _entidade: "PlanoTratamento" }))
      },
      documentos: documentos.map(d => ({ ...d, _entidade: "DocumentoPaciente" })),
      financeiro: {
        vendas: vendas.map(v => ({ ...v, _entidade: "Venda" }))
      },
      jornada: jornadas.map(j => ({ ...j, _entidade: "JornadaPaciente" })),
      totais: {
        total_agendamentos: agendamentos.length,
        total_prontuarios: prontuarios.length,
        total_prescricoes: prescricoes.length,
        total_documentos: documentos.length,
        total_vendas: vendas.length
      }
    };

    // Retornar CSV se solicitado
    if (formato === 'csv') {
      const csv = gerarCSV(exportacao);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="paciente_${paciente.nome_completo.replace(/\s/g, '_')}_${Date.now()}.csv"`
        }
      });
    }

    // Retornar JSON (padrão)
    return Response.json(exportacao, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="paciente_${paciente.nome_completo.replace(/\s/g, '_')}_${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    return Response.json({ 
      error: 'Erro ao exportar dados',
      detalhes: error.message 
    }, { status: 500 });
  }
});

// Gerador de CSV
function gerarCSV(exportacao) {
  const linhas = [];
  
  // Cabeçalho
  linhas.push('EXPORTAÇÃO DE DADOS - LGPD ART. 18, IV');
  linhas.push(`Data: ${exportacao.metadata.data_exportacao}`);
  linhas.push(`Paciente: ${exportacao.metadata.paciente_nome}`);
  linhas.push(`Solicitante: ${exportacao.metadata.solicitante}`);
  linhas.push('');
  
  // Dados Cadastrais
  linhas.push('=== DADOS CADASTRAIS ===');
  linhas.push(`Nome,${exportacao.dados_cadastrais.nome_completo || ''}`);
  linhas.push(`CPF,${exportacao.dados_cadastrais.cpf || ''}`);
  linhas.push(`Email,${exportacao.dados_cadastrais.email || ''}`);
  linhas.push(`Telefone,${exportacao.dados_cadastrais.telefone || ''}`);
  linhas.push(`WhatsApp,${exportacao.dados_cadastrais.whatsapp || ''}`);
  linhas.push(`Data Nascimento,${exportacao.dados_cadastrais.data_nascimento || ''}`);
  linhas.push(`Endereço,${exportacao.dados_cadastrais.endereco_completo || ''}`);
  linhas.push('');
  
  // Agendamentos
  linhas.push('=== AGENDAMENTOS ===');
  linhas.push('Data,Horário,Tipo,Especialidade,Médico,Status');
  exportacao.historico_clinico.agendamentos.forEach(a => {
    linhas.push(`${a.data},${a.horario},${a.tipo_consulta},${a.especialidade || ''},${a.medico || ''},${a.status}`);
  });
  linhas.push('');
  
  // Prontuários
  linhas.push('=== PRONTUÁRIOS ===');
  linhas.push('Data,Médico,Tipo Atendimento,Hipótese Diagnóstica');
  exportacao.historico_clinico.prontuarios.forEach(p => {
    const hipotese = (p.hipotese_diagnostica || '').replace(/,/g, ';');
    linhas.push(`${p.data_atendimento},${p.medico_nome},${p.tipo_atendimento},${hipotese}`);
  });
  linhas.push('');
  
  // Prescrições
  linhas.push('=== PRESCRIÇÕES ===');
  linhas.push('Data,Médico,Observações');
  exportacao.historico_clinico.prescricoes.forEach(p => {
    const obs = (p.observacoes || '').replace(/,/g, ';');
    linhas.push(`${p.data_prescricao || p.created_date},${p.medico_nome || ''},${obs}`);
  });
  linhas.push('');
  
  // Vendas/Financeiro
  linhas.push('=== HISTÓRICO FINANCEIRO ===');
  linhas.push('Data,Valor Total,Forma Pagamento,Status');
  exportacao.financeiro.vendas.forEach(v => {
    linhas.push(`${v.data_venda},R$ ${v.valor_final},${v.forma_pagamento},${v.status_pagamento}`);
  });
  linhas.push('');
  
  // Totais
  linhas.push('=== RESUMO ===');
  linhas.push(`Total de Agendamentos,${exportacao.totais.total_agendamentos}`);
  linhas.push(`Total de Prontuários,${exportacao.totais.total_prontuarios}`);
  linhas.push(`Total de Prescrições,${exportacao.totais.total_prescricoes}`);
  linhas.push(`Total de Documentos,${exportacao.totais.total_documentos}`);
  linhas.push(`Total de Vendas,${exportacao.totais.total_vendas}`);
  
  return linhas.join('\n');
}