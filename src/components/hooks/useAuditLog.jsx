import { base44 } from "@/api/base44Client";

/**
 * LGPD Art. 46: Hook para registrar acessos a dados sensíveis
 * Rastreabilidade obrigatória em prontuários, financeiro, documentos
 */
export function useAuditLog() {
  const registrarAcesso = async (entityType, entityId, acao, detalhes = {}) => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      await base44.entities.LogAuditoria.create({
        usuario_id: user.id,
        usuario_nome: user.full_name,
        usuario_email: user.email,
        clinica_id: user.clinica_id,
        entidade_tipo: entityType,
        entidade_id: entityId,
        acao: acao, // 'visualizar', 'editar', 'criar', 'deletar', 'exportar'
        detalhes: JSON.stringify(detalhes),
        ip: 'client', // Backend irá sobrescrever com IP real
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[useAuditLog] Erro ao registrar:', error);
      // Não bloquear operação se log falhar
    }
  };

  return { registrarAcesso };
}