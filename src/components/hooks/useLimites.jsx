import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

export function useLimites() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000
  });

  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinica-atual"],
    queryFn: () => base44.entities.Clinica.filter({ admin_principal_email: user?.email }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const clinica = clinicas[0];

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-count"],
    queryFn: () => base44.entities.User.filter({ clinica_id: clinica?.id }),
    enabled: !!clinica,
    staleTime: 2 * 60 * 1000
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-count"],
    queryFn: () => base44.entities.Paciente.list(),
    enabled: !!clinica,
    staleTime: 2 * 60 * 1000
  });

  const limites = useMemo(() => {
    if (!clinica) return null;

    const uso = clinica.uso_atual || {};
    const limits = clinica.limites_plano || {};

    return {
      usuarios: {
        usado: usuarios.length,
        limite: limits.max_usuarios || 999,
        percentual: Math.round((usuarios.length / (limits.max_usuarios || 999)) * 100),
        atingido: usuarios.length >= (limits.max_usuarios || 999)
      },
      pacientes: {
        usado: pacientes.length,
        limite: limits.max_pacientes || 999999,
        percentual: Math.round((pacientes.length / (limits.max_pacientes || 999999)) * 100),
        atingido: pacientes.length >= (limits.max_pacientes || 999999)
      },
      agendamentos: {
        usado: uso.agendamentos_mes || 0,
        limite: limits.max_agendamentos_mes || 999999,
        percentual: Math.round(((uso.agendamentos_mes || 0) / (limits.max_agendamentos_mes || 999999)) * 100),
        atingido: (uso.agendamentos_mes || 0) >= (limits.max_agendamentos_mes || 999999)
      },
      storage: {
        usado: uso.storage_usado_gb || 0,
        limite: limits.storage_gb || 500,
        percentual: Math.round(((uso.storage_usado_gb || 0) / (limits.storage_gb || 500)) * 100),
        atingido: (uso.storage_usado_gb || 0) >= (limits.storage_gb || 500)
      },
      telemedicina: limits.telemedicina !== false,
      ia_assistida: limits.ia_assistida !== false,
      plano: clinica.plano_assinatura,
      status: clinica.status_assinatura
    };
  }, [clinica, usuarios, pacientes]);

  const podeAdicionar = (recurso) => {
    if (!limites) return true;
    if (limites.status !== "ativa" && limites.status !== "trial") return false;
    return !limites[recurso]?.atingido;
  };

  const mensagemLimite = (recurso) => {
    if (!limites || !limites[recurso]) return null;
    const { usado, limite, atingido } = limites[recurso];
    
    if (atingido) {
      return `Limite atingido: ${usado}/${limite}. Faça upgrade do plano para continuar.`;
    }
    if (limites[recurso].percentual >= 80) {
      return `Atenção: ${usado}/${limite} (${limites[recurso].percentual}% usado)`;
    }
    return null;
  };

  return {
    limites,
    clinica,
    podeAdicionar,
    mensagemLimite,
    isLoading: !clinica
  };
}