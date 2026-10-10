import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePacientes() {
  return useQuery({
    queryKey: ["pacientes"],
    queryFn: () => base44.entities.Paciente.list("-created_date"),
    staleTime: 5 * 60 * 1000
  });
}

export function useMedicos() {
  return useQuery({
    queryKey: ["medicos"],
    queryFn: () => base44.entities.Medico.list(),
    staleTime: 5 * 60 * 1000
  });
}

export function useProntuarios(limit = 100) {
  return useQuery({
    queryKey: ["prontuarios", limit],
    queryFn: () => base44.entities.Prontuario.list("-data_atendimento", limit),
    staleTime: 2 * 60 * 1000
  });
}

export function useAgendamentos() {
  return useQuery({
    queryKey: ["agendamentos"],
    queryFn: () => base44.entities.Agendamento.list("-data"),
    staleTime: 2 * 60 * 1000
  });
}

export function useMedicamentos() {
  return useQuery({
    queryKey: ["medicamentos"],
    queryFn: () => base44.entities.Medicamento.list("-created_date"),
    staleTime: 5 * 60 * 1000
  });
}

export function useProdutos() {
  return useQuery({
    queryKey: ["produtos"],
    queryFn: () => base44.entities.Produto.list("-created_date"),
    staleTime: 5 * 60 * 1000
  });
}

export function useVendas() {
  return useQuery({
    queryKey: ["vendas"],
    queryFn: () => base44.entities.Venda.list("-data_venda"),
    staleTime: 2 * 60 * 1000
  });
}

export function useContasReceber() {
  return useQuery({
    queryKey: ["contasReceber"],
    queryFn: () => base44.entities.ContaReceber.list("-data_vencimento"),
    staleTime: 2 * 60 * 1000
  });
}

export function useContasPagar() {
  return useQuery({
    queryKey: ["contasPagar"],
    queryFn: () => base44.entities.ContaPagar.list("-data_vencimento"),
    staleTime: 2 * 60 * 1000
  });
}

export function useCertidoes() {
  return useQuery({
    queryKey: ["certidoes"],
    queryFn: () => base44.entities.CertidaoRegularidade.list("-data_validade"),
    staleTime: 5 * 60 * 1000
  });
}

export function useCRUD(entityName) {
  const queryClient = useQueryClient();
  const queryKey = [entityName.toLowerCase()];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => queryClient.invalidateQueries(queryKey)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => queryClient.invalidateQueries(queryKey)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => queryClient.invalidateQueries(queryKey)
  });

  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
}