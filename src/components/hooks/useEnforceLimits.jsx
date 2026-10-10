import { useLimites } from "./useLimites";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Hook para ENFORÇAR limites de plano
 * Bloqueia operações quando limite atingido
 * Redireciona para upgrade
 * 
 * USO OBRIGATÓRIO em todos os creates de:
 * - Pacientes
 * - Agendamentos
 * - Usuários
 * - Documentos/Storage
 */
export function useEnforceLimits() {
  const { limites, podeAdicionar } = useLimites();
  const navigate = useNavigate();
  
  const atingiuLimite = (recurso) => {
    if (!limites) return false;
    return limites[recurso]?.atingido || false;
  };
  
  const percentualUso = (recurso) => {
    if (!limites) return 0;
    return limites[recurso]?.percentual || 0;
  };
  
  const uso = limites ? {
    pacientes: limites.pacientes?.usado || 0,
    usuarios: limites.usuarios?.usado || 0,
    agendamentos: limites.agendamentos?.usado || 0,
    storage: limites.storage?.usado || 0
  } : {};

  /**
   * Verifica se pode criar novo registro
   * @param {string} recurso - 'pacientes' | 'usuarios' | 'agendamentos' | 'storage'
   * @returns {boolean} - true se pode criar, false se bloqueado
   */
  const canCreate = (recurso) => {
    return !atingiuLimite(recurso);
  };

  /**
   * Retorna status UI preventivo
   * Para desabilitar botões ANTES do click
   * @param {string} recurso
   * @returns {{ disabled: boolean, tooltip: string, className: string }}
   */
  const getUIState = (recurso) => {
    const bloqueado = atingiuLimite(recurso);
    const percentual = percentualUso(recurso);
    const proximo = percentual >= 90;

    return {
      disabled: bloqueado,
      tooltip: bloqueado 
        ? `Limite de ${recurso} atingido. Faça upgrade para continuar.`
        : proximo
        ? `Atenção: ${percentual.toFixed(0)}% do limite usado`
        : null,
      className: bloqueado 
        ? "opacity-50 cursor-not-allowed"
        : proximo
        ? "border-orange-500"
        : ""
    };
  };

  /**
   * Verifica antes de criar - lança erro se bloqueado
   * @param {string} recurso
   * @throws {Error} com mensagem de upgrade
   */
  const enforceBeforeCreate = (recurso) => {
    if (atingiuLimite(recurso)) {
      const recursoLabel = {
        pacientes: 'pacientes',
        usuarios: 'usuários',
        agendamentos: 'agendamentos mensais',
        storage: 'armazenamento'
      }[recurso] || recurso;

      throw new Error(
        `Limite de ${recursoLabel} atingido. Faça upgrade do plano para continuar.`
      );
    }
  };

  /**
   * Mostra modal de upgrade e redireciona
   */
  const showUpgradePrompt = (recurso) => {
    const mensagem = `Você atingiu o limite do seu plano.

Recurso: ${recurso}
Uso atual: ${uso[recurso] || 0}/${limites[recurso] || 0}

Faça upgrade para continuar usando o PrevenClin sem limitações.`;

    if (window.confirm(mensagem + "\n\nDeseja ver os planos disponíveis?")) {
      navigate(createPageUrl("PlanosPrecos"));
    }
  };

  /**
   * Wrapper para mutations com enforcement
   */
  const withEnforcement = (recurso, mutationFn) => {
    return async (...args) => {
      enforceBeforeCreate(recurso);
      return mutationFn(...args);
    };
  };

  return {
    canCreate,
    enforceBeforeCreate,
    showUpgradePrompt,
    withEnforcement,
    getUIState,
    limites,
    uso,
    atingiuLimite,
    percentualUso
  };
}