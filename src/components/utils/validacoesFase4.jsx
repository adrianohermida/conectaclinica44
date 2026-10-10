import { base44 } from "@/api/base44Client";

// FASE 4: Validações de Edge Cases e Cenários Complexos

/**
 * Valida se paciente pode criar novo agendamento (limita múltiplos agendamentos simultâneos)
 */
export async function validarLimiteAgendamentosPaciente(pacienteId, agendamentos) {
  const agendamentosAtivos = agendamentos.filter(
    a => a.paciente_id === pacienteId && 
    (a.status === 'agendado' || a.status === 'confirmado')
  );
  
  if (agendamentosAtivos.length >= 5) {
    return {
      valido: false,
      erro: "Paciente possui 5+ agendamentos ativos. Conclua ou cancele antes de criar novos."
    };
  }
  
  return { valido: true };
}

/**
 * Valida se médico tem disponibilidade no horário (carga máxima)
 */
export function validarCargaMedico(medico, data, horario, agendamentos) {
  const agendamentosDia = agendamentos.filter(
    a => a.data === data && 
    a.medico === medico && 
    (a.status === 'agendado' || a.status === 'confirmado')
  );
  
  if (agendamentosDia.length >= 12) {
    return {
      valido: false,
      erro: `Dr(a). ${medico} já possui 12+ consultas neste dia. Capacidade excedida.`
    };
  }
  
  return { valido: true };
}

/**
 * Valida horário comercial (8h-18h)
 */
export function validarHorarioComercial(horario) {
  if (!horario) return { valido: true };
  
  const [hora] = horario.split(':').map(Number);
  
  if (hora < 8 || hora >= 18) {
    return {
      valido: false,
      erro: "Horário fora do período comercial (8h-18h)"
    };
  }
  
  return { valido: true };
}

/**
 * Valida intervalo mínimo entre consultas (30min)
 */
export function validarIntervaloMinimo(data, horario, medico, agendamentos) {
  if (!horario || !medico) return { valido: true };
  
  const [h, m] = horario.split(':').map(Number);
  const minutos = h * 60 + m;
  
  const conflito = agendamentos.find(a => {
    if (a.data !== data || a.medico !== medico) return false;
    if (a.status === 'cancelado') return false;
    
    const [ah, am] = (a.horario || '00:00').split(':').map(Number);
    const aMinutos = ah * 60 + am;
    
    const diff = Math.abs(minutos - aMinutos);
    return diff < 30;
  });
  
  if (conflito) {
    return {
      valido: false,
      erro: `Intervalo mínimo de 30min não respeitado. Conflito com consulta às ${conflito.horario}`
    };
  }
  
  return { valido: true };
}

/**
 * Valida se paciente menor de idade tem responsável
 */
export function validarResponsavelMenor(paciente) {
  if (!paciente.data_nascimento) return { valido: true };
  
  const hoje = new Date();
  const nascimento = new Date(paciente.data_nascimento);
  const idade = hoje.getFullYear() - nascimento.getFullYear();
  
  if (idade < 18 && !paciente.responsavel_nome) {
    return {
      valido: false,
      erro: "Paciente menor de 18 anos deve ter responsável cadastrado"
    };
  }
  
  return { valido: true };
}

/**
 * Valida completude de prontuário (campos essenciais)
 */
export function validarCompletudeProntuario(formData) {
  const camposEssenciais = {
    paciente_nome: "Nome do paciente",
    medico_nome: "Nome do médico",
    medico_crm: "CRM",
    queixa_principal: "Queixa principal",
    data_atendimento: "Data do atendimento"
  };
  
  const faltando = [];
  for (const [campo, label] of Object.entries(camposEssenciais)) {
    if (!formData[campo] || formData[campo].trim() === '') {
      faltando.push(label);
    }
  }
  
  if (faltando.length > 0) {
    return {
      valido: false,
      erro: `Campos obrigatórios não preenchidos: ${faltando.join(', ')}`
    };
  }
  
  return { valido: true };
}

/**
 * Valida se pode editar prontuário assinado
 */
export function validarEdicaoProntuarioAssinado(prontuario) {
  if (prontuario.status_prontuario === 'assinado') {
    return {
      valido: false,
      erro: "Prontuário assinado digitalmente não pode ser editado. Crie um adendo."
    };
  }
  
  return { valido: true };
}

/**
 * Valida prescrição antes de gerar
 */
export function validarPrescricao(prescricaoData) {
  if (!prescricaoData.medico_crm || !prescricaoData.paciente_nome) {
    return {
      valido: false,
      erro: "Dados do médico ou paciente incompletos"
    };
  }
  
  const medicamentosValidos = prescricaoData.medicamentos.filter(
    m => m.medicamento && m.posologia
  );
  
  if (medicamentosValidos.length === 0) {
    return {
      valido: false,
      erro: "Adicione pelo menos 1 medicamento com nome e posologia"
    };
  }
  
  return { valido: true };
}

/**
 * Verifica agendamentos antigos pendentes (>30 dias)
 */
export function identificarAgendamentosAntigos(agendamentos) {
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  
  return agendamentos.filter(a => {
    if (a.status === 'cancelado' || a.status === 'concluido') return false;
    const dataAgend = new Date(a.data);
    return dataAgend < limite;
  });
}

/**
 * Sugere limpeza de dados duplicados
 */
export function detectarDuplicadosSuspeitos(pacientes) {
  const grupos = {};
  
  pacientes.forEach(p => {
    const chave = `${p.cpf}_${p.email}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(p);
  });
  
  return Object.values(grupos).filter(g => g.length > 1);
}