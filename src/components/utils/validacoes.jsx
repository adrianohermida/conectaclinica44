// Validações essenciais - FASE 1

export const validarCPF = (cpf) => {
  if (!cpf) return { valido: false, erro: "CPF obrigatório" };
  
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) {
    return { valido: false, erro: "CPF deve ter 11 dígitos" };
  }
  
  if (/^(\d)\1+$/.test(cpfLimpo)) {
    return { valido: false, erro: "CPF inválido" };
  }
  
  // Validação dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;
  
  if (digito1 !== parseInt(cpfLimpo.charAt(9))) {
    return { valido: false, erro: "CPF inválido (dígito 1)" };
  }
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto >= 10 ? 0 : resto;
  
  if (digito2 !== parseInt(cpfLimpo.charAt(10))) {
    return { valido: false, erro: "CPF inválido (dígito 2)" };
  }
  
  return { valido: true };
};

export const validarEmail = (email) => {
  if (!email) return { valido: true }; // Email opcional
  
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valido: false, erro: "Email inválido" };
  }
  
  return { valido: true };
};

export const validarTelefone = (telefone) => {
  if (!telefone) return { valido: false, erro: "Telefone obrigatório" };
  
  const telefoneLimpo = telefone.replace(/\D/g, '');
  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    return { valido: false, erro: "Telefone inválido (10-11 dígitos)" };
  }
  
  return { valido: true };
};

export const validarCRM = (crm) => {
  if (!crm) return { valido: false, erro: "CRM obrigatório" };
  
  // Formato: AM + 5-6 dígitos (ex: AM12345 ou AM123456)
  const regex = /^AM\d{5,6}$/i;
  if (!regex.test(crm)) {
    return { valido: false, erro: "CRM inválido. Formato: AM + 5-6 dígitos" };
  }
  
  return { valido: true };
};

export const validarDataFutura = (data) => {
  if (!data) return { valido: false, erro: "Data obrigatória" };
  
  const dataAgendamento = new Date(data);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  if (dataAgendamento < hoje) {
    return { valido: false, erro: "Não é possível agendar no passado" };
  }
  
  return { valido: true };
};

export const verificarConflito = (agendamentos, novoAgendamento) => {
  const conflito = agendamentos.find(ag => 
    ag.data === novoAgendamento.data &&
    ag.horario === novoAgendamento.horario &&
    ag.medico === novoAgendamento.medico &&
    ag.status !== 'cancelado' &&
    ag.id !== novoAgendamento.id // Permitir edição do mesmo agendamento
  );
  
  if (conflito) {
    return { 
      conflito: true, 
      erro: `Conflito: ${conflito.medico} já tem consulta às ${conflito.horario}` 
    };
  }
  
  return { conflito: false };
};