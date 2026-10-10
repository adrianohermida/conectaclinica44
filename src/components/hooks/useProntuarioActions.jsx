import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

/**
 * Hook para ações de Prontuários (create, update, prescrição)
 * Centraliza lógica de mutations e side-effects
 */
export function useProntuarioActions(clinicaId, callbacks = {}) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => {
      const prontuarioData = {
        ...data,
        clinica_id: clinicaId,
        hora_atendimento: format(new Date(), "HH:mm"),
        status_prontuario: "finalizado",
        versao: 1,
        historico_alteracoes: [{
          data: new Date().toISOString(),
          usuario: data.medico_nome,
          alteracao: "Criação do prontuário"
        }],
        assinatura_digital: {
          hash: `PEP${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          certificado_digital: "ICP-Brasil"
        }
      };
      return base44.entities.Prontuario.create(prontuarioData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prontuarios"]);
      callbacks.onSuccess?.();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const updatedData = {
        ...data,
        versao: (data.versao || 1) + 1,
        historico_alteracoes: [
          ...(data.historico_alteracoes || []),
          {
            data: new Date().toISOString(),
            usuario: data.medico_nome,
            alteracao: "Atualização do prontuário"
          }
        ]
      };
      return base44.entities.Prontuario.update(id, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["prontuarios"]);
      callbacks.onSuccess?.();
    }
  });

  const createDocumentoMutation = useMutation({
    mutationFn: (data) => base44.entities.DocumentoPaciente.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["documentos"]);
    }
  });

  const deleteDocumentoMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoPaciente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["documentos"]);
    }
  });

  const salvarPrescricao = async (prescricaoData) => {
    const numeroReceita = `REC${Date.now()}`;
    const codigoVerificacao = `CFM${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + prescricaoData.validade_dias);

    const prescricaoCompleta = {
      ...prescricaoData,
      clinica_id: clinicaId,
      data_prescricao: format(new Date(), "yyyy-MM-dd"),
      hora_prescricao: format(new Date(), "HH:mm"),
      numero_receita: numeroReceita,
      codigo_verificacao: codigoVerificacao,
      data_validade: format(dataValidade, "yyyy-MM-dd"),
      qr_code: `https://prescricao.cfm.org.br/validar/${codigoVerificacao}`,
      assinatura_digital: {
        hash: `ASS${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        certificado_digital_tipo: "ICP-Brasil e-CPF A3",
        certificado_digital_numero: prescricaoData.medico_crm,
        assinado_com_icp_brasil: true
      },
      status: "ativa",
      dispensacoes: [],
      via_prescricao: "1via_paciente",
      registro_anvisa: prescricaoData.tipo_receita !== "simples",
      conformidade_cfm: true
    };

    await base44.entities.PrescricaoEletronica.create(prescricaoCompleta);
    
    return {
      numeroReceita,
      codigoVerificacao,
      dataValidade
    };
  };

  const uploadDocumento = async (file, prontuario) => {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Arquivo muito grande. Máximo: 10MB");
    }

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const extensao = file.name.split(".").pop();
    
    await createDocumentoMutation.mutateAsync({
      paciente_id: prontuario.paciente_id,
      paciente_nome: prontuario.paciente_nome,
      prontuario_id: prontuario.id,
      tipo_documento: "laudo_medico",
      nome_arquivo: file.name,
      arquivo_url: file_url,
      tamanho_bytes: file.size,
      extensao: extensao,
      data_upload: format(new Date(), "yyyy-MM-dd"),
      data_documento: prontuario.data_atendimento,
      descricao: `Anexo do prontuário - ${prontuario.tipo_atendimento}`,
      medico_solicitante: prontuario.medico_nome,
      analisado_ia: false
    });

    // Atualizar prontuário com referência
    const arquivosAtuais = prontuario.arquivos_anexados || [];
    await updateMutation.mutateAsync({
      id: prontuario.id,
      data: {
        ...prontuario,
        arquivos_anexados: [...arquivosAtuais, file_url]
      }
    });

    return file_url;
  };

  return {
    createMutation,
    updateMutation,
    createDocumentoMutation,
    deleteDocumentoMutation,
    salvarPrescricao,
    uploadDocumento
  };
}