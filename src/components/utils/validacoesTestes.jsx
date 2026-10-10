// FASE 4: Testes de validação e casos extremos
import { validarCPF, validarEmail, validarTelefone, validarCRM, validarDataFutura, verificarConflito } from './validacoes';

export const testesCasosPacientes = {
  // Casos válidos
  cpfValido: () => {
    const resultado = validarCPF("123.456.789-09");
    console.assert(resultado.valido, "CPF válido deveria passar");
  },
  
  emailValido: () => {
    const resultado = validarEmail("teste@prevenclin.com.br");
    console.assert(resultado.valido, "Email válido deveria passar");
  },
  
  telefoneValido: () => {
    const resultado = validarTelefone("(92) 98765-4321");
    console.assert(resultado.valido, "Telefone válido deveria passar");
  },
  
  // Casos inválidos
  cpfInvalido: () => {
    const casos = ["000.000.000-00", "111.111.111-11", "123.456.789-00", "abc.def.ghi-jk", ""];
    casos.forEach(cpf => {
      const resultado = validarCPF(cpf);
      console.assert(!resultado.valido, `CPF inválido "${cpf}" deveria falhar`);
    });
  },
  
  emailInvalido: () => {
    const casos = ["semArroba", "sem@dominio", "@semlocal.com", "espaço @email.com"];
    casos.forEach(email => {
      const resultado = validarEmail(email);
      console.assert(!resultado.valido, `Email inválido "${email}" deveria falhar`);
    });
  },
  
  telefoneInvalido: () => {
    const casos = ["123", "(92) 1234", "abc", ""];
    casos.forEach(tel => {
      const resultado = validarTelefone(tel);
      console.assert(!resultado.valido, `Telefone inválido "${tel}" deveria falhar`);
    });
  },
  
  emailOpcional: () => {
    const resultado = validarEmail("");
    console.assert(resultado.valido, "Email vazio deveria ser aceito (opcional)");
  }
};

export const testesCasosAgenda = {
  crmValido: () => {
    const resultado = validarCRM("AM12345");
    console.assert(resultado.valido, "CRM válido AM12345 deveria passar");
  },
  
  crmInvalido: () => {
    const casos = ["SP123", "AM123", "12345", "AMABCDE", ""];
    casos.forEach(crm => {
      const resultado = validarCRM(crm);
      console.assert(!resultado.valido, `CRM inválido "${crm}" deveria falhar`);
    });
  },
  
  dataFutura: () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataStr = amanha.toISOString().split('T')[0];
    const resultado = validarDataFutura(dataStr);
    console.assert(resultado.valido, "Data futura deveria passar");
  },
  
  dataPassada: () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataStr = ontem.toISOString().split('T')[0];
    const resultado = validarDataFutura(dataStr);
    console.assert(!resultado.valido, "Data passada deveria falhar");
  },
  
  conflitoHorario: () => {
    const agendamentos = [
      { data: "2025-12-10", horario: "10:00", medico: "Dr. Silva", status: "confirmado" }
    ];
    
    const novoAgendamento = {
      data: "2025-12-10",
      horario: "10:00",
      medico: "Dr. Silva"
    };
    
    const resultado = verificarConflito(agendamentos, novoAgendamento);
    console.assert(resultado.conflito, "Conflito de horário deveria ser detectado");
  },
  
  semConflito: () => {
    const agendamentos = [
      { data: "2025-12-10", horario: "10:00", medico: "Dr. Silva", status: "confirmado" }
    ];
    
    const novoAgendamento = {
      data: "2025-12-10",
      horario: "11:00",
      medico: "Dr. Silva"
    };
    
    const resultado = verificarConflito(agendamentos, novoAgendamento);
    console.assert(!resultado.conflito, "Não deveria haver conflito");
  }
};

export const executarTodosTestes = () => {
  console.log("🧪 EXECUTANDO TESTES - FASE 4");
  
  console.log("\n📋 Testes: Pacientes (CPF, Email, Telefone)");
  Object.values(testesCasosPacientes).forEach(teste => teste());
  
  console.log("\n📅 Testes: Agenda (CRM, Data Futura, Conflitos)");
  Object.values(testesCasosAgenda).forEach(teste => teste());
  
  console.log("\n✅ TESTES CONCLUÍDOS");
};