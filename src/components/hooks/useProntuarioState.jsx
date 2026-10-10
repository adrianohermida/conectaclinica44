import { useState } from "react";
import { format } from "date-fns";

/**
 * Hook centralizado para estado de Prontuários
 * Extrai lógica de estado do componente principal
 */
export function useProntuarioState() {
  const [panels, setPanels] = useState({
    main: false,
    prescricao: false,
    templates: false,
    historico: false,
    compartilhar: false,
    assinatura: false,
    iaDiagnostico: false,
    prescricaoIA: false,
    interacoes: false,
    resumo: false,
    relatorios: false,
    exames: false,
    busca: false,
    evolucao: false
  });

  const [selected, setSelected] = useState({
    prontuario: null,
    editing: null
  });

  const [formData, setFormData] = useState({
    paciente_nome: "",
    data_atendimento: format(new Date(), "yyyy-MM-dd"),
    medico_nome: "",
    medico_crm: "",
    tipo_atendimento: "consulta",
    motivo_consulta: "",
    queixa_principal: "",
    historia_doenca_atual: "",
    historia_patologica_pregressa: "",
    alergias: "",
    medicamentos_uso: [],
    exame_fisico: {
      estado_geral: "",
      pressao_arterial: "",
      frequencia_cardiaca: "",
      temperatura: "",
      peso: "",
      altura: ""
    },
    hipotese_diagnostica: "",
    conduta: "",
    plano_terapeutico: "",
    observacoes_complementares: ""
  });

  const [prescricaoData, setPrescricaoData] = useState({
    paciente_id: "",
    paciente_nome: "",
    paciente_cpf: "",
    medico_crm: "",
    medico_uf_crm: "AM",
    medico_nome: "",
    tipo_receita: "simples",
    medicamentos: [{
      medicamento: "",
      principio_ativo: "",
      concentracao: "",
      forma_farmaceutica: "",
      posologia: "",
      quantidade: "",
      via_administracao: "oral",
      duracao_tratamento: "",
      orientacoes: "",
      controlado: false,
      tarja: "sem_tarja"
    }],
    orientacoes_gerais: "",
    uso_continuo: false,
    validade_dias: 30,
    local_atendimento: "PrevenClin - Ponta Negra, Manaus/AM"
  });

  const openPanel = (panelName, prontuario = null) => {
    setPanels(prev => ({ ...prev, [panelName]: true }));
    if (prontuario) {
      setSelected(prev => ({ ...prev, prontuario }));
    }
  };

  const closePanel = (panelName) => {
    setPanels(prev => ({ ...prev, [panelName]: false }));
  };

  const closeAllPanels = () => {
    setPanels({
      main: false,
      prescricao: false,
      templates: false,
      historico: false,
      compartilhar: false,
      assinatura: false,
      iaDiagnostico: false,
      prescricaoIA: false,
      interacoes: false,
      resumo: false,
      relatorios: false,
      exames: false,
      busca: false,
      evolucao: false
    });
    setSelected({ prontuario: null, editing: null });
  };

  const resetFormData = () => {
    setFormData({
      paciente_nome: "",
      data_atendimento: format(new Date(), "yyyy-MM-dd"),
      medico_nome: "",
      medico_crm: "",
      tipo_atendimento: "consulta",
      motivo_consulta: "",
      queixa_principal: "",
      historia_doenca_atual: "",
      historia_patologica_pregressa: "",
      alergias: "",
      medicamentos_uso: [],
      exame_fisico: {
        estado_geral: "",
        pressao_arterial: "",
        frequencia_cardiaca: "",
        temperatura: "",
        peso: "",
        altura: ""
      },
      hipotese_diagnostica: "",
      conduta: "",
      plano_terapeutico: "",
      observacoes_complementares: ""
    });
  };

  return {
    panels,
    selected,
    formData,
    prescricaoData,
    setFormData,
    setPrescricaoData,
    setSelected,
    openPanel,
    closePanel,
    closeAllPanels,
    resetFormData
  };
}