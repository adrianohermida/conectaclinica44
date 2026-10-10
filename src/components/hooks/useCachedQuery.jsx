import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook otimizado para queries com cache estratégico
 * 
 * DIA 1 - CACHE STRATEGY:
 * - Entidades estáticas: 10min stale
 * - Listas dinâmicas: 5min stale
 * - Dados críticos: 2min stale
 * - Invalidação seletiva (não global)
 */

export function useCachedQuery(entityName, filters = {}, options = {}) {
  const {
    cacheLevel = "dynamic", // "static" | "dynamic" | "critical"
    enabled = true,
    ...otherOptions
  } = options;

  // ESTRATÉGIA DE CACHE
  const cacheConfig = {
    static: {
      staleTime: 10 * 60 * 1000, // 10min
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    },
    dynamic: {
      staleTime: 5 * 60 * 1000, // 5min
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: "always"
    },
    critical: {
      staleTime: 2 * 60 * 1000, // 2min
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always"
    }
  };

  const config = cacheConfig[cacheLevel];

  return useQuery({
    queryKey: [entityName, filters],
    queryFn: async () => {
      if (Object.keys(filters).length === 0) {
        return base44.entities[entityName].list("-updated_date", 500);
      }
      return base44.entities[entityName].filter(filters, "-updated_date", 500);
    },
    enabled,
    ...config,
    ...otherOptions
  });
}

/**
 * Hooks especializados por entidade com cache otimizado
 */

// ESTÁTICAS (10min cache)
export function useMedicos(clinicaId, enabled = true) {
  return useCachedQuery("Medico", clinicaId ? { clinica_id: clinicaId, ativo: true } : {}, {
    cacheLevel: "static",
    enabled: enabled && !!clinicaId
  });
}

export function useProdutos(clinicaId, enabled = true) {
  return useCachedQuery("Produto", clinicaId ? { clinica_id: clinicaId, ativo: true } : {}, {
    cacheLevel: "static",
    enabled: enabled && !!clinicaId
  });
}

export function useClinica(clinicaId, enabled = true) {
  return useQuery({
    queryKey: ["clinica", clinicaId],
    queryFn: () => base44.entities.Clinica.filter({ id: clinicaId }),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: enabled && !!clinicaId,
    refetchOnWindowFocus: false,
    select: (data) => data[0]
  });
}

// DINÂMICAS (5min cache)
export function useProntuarios(clinicaId, pacienteId = null, enabled = true) {
  const filters = { clinica_id: clinicaId };
  if (pacienteId) filters.paciente_id = pacienteId;

  return useCachedQuery("Prontuario", filters, {
    cacheLevel: "dynamic",
    enabled: enabled && !!clinicaId
  });
}

export function useAgendamentos(clinicaId, filters = {}, enabled = true) {
  return useCachedQuery("Agendamento", { clinica_id: clinicaId, ...filters }, {
    cacheLevel: "dynamic",
    enabled: enabled && !!clinicaId
  });
}

export function useContatos(clinicaId, tipo = null, enabled = true) {
  const filters = { clinica_id: clinicaId };
  if (tipo) filters.tipo_contato = tipo;

  return useCachedQuery("Contato", filters, {
    cacheLevel: "dynamic",
    enabled: enabled && !!clinicaId
  });
}

export function useDocumentos(clinicaId, pacienteId = null, enabled = true) {
  const filters = { clinica_id: clinicaId };
  if (pacienteId) filters.paciente_id = pacienteId;

  return useCachedQuery("DocumentoPaciente", filters, {
    cacheLevel: "dynamic",
    enabled: enabled && !!clinicaId
  });
}

export function useTickets(clinicaId, contatoId = null, enabled = true) {
  const filters = { clinica_id: clinicaId };
  if (contatoId) filters.contato_id = contatoId;

  return useCachedQuery("Ticket", filters, {
    cacheLevel: "critical",
    enabled: enabled && !!clinicaId
  });
}

export function useVendas(clinicaId, pacienteId = null, enabled = true) {
  const filters = { clinica_id: clinicaId };
  if (pacienteId) filters.paciente_id = pacienteId;

  return useCachedQuery("Venda", filters, {
    cacheLevel: "dynamic",
    enabled: enabled && !!clinicaId
  });
}