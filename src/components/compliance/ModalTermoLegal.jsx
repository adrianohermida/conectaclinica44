import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertCircle, FileText, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

/**
 * MODAL DE TERMO LEGAL - Com Rastreabilidade MP 2.200/2
 * 
 * SUBSTITUI: NotificacaoObrigatoria (hardcoded)
 * ADICIONA: Hash, IP, certificado de auditoria
 */

export default function ModalTermoLegal({ termo, onConfirm, onClose }) {
  const [aceito, setAceito] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [consentimentoMetadados, setConsentimentoMetadados] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // FIX CRÍTICO: Obrigatório = sem botão "pular"
  const podeRecusar = !termo.obrigatorio;

  const queryClient = useQueryClient();

  const registrarAceiteMutation = useMutation({
    mutationFn: async () => {
      if (!consentimentoMetadados) {
        throw new Error('Consentimento LGPD obrigatório');
      }

      console.log('📝 Registrando aceite:', { termo_id: termo.id });

      const response = await base44.functions.invoke('registrarAceiteTermo', {
        termo_id: termo.id,
        versao: termo.versao,
        aceito: true,
        consentimento_coleta: consentimentoMetadados,
        tipo_aceite: 'modal',
        scroll_percent: scrolledToBottom ? 100 : 0,
        tempo_leitura_segundos: 0
      });

      console.log('✅ Aceite registrado:', response.data);
      return response.data;

      // UPGRADE: Oferecer assinatura ICP-Brasil se clínica tiver créditos
      if (response.data.aceite_id && termo.tipo === 'termo_uso') {
        setTimeout(async () => {
          try {
            const creditosResp = await base44.entities.CreditoAssinaturaDigital.filter({
              clinica_id: user?.clinica_id,
              ativo: true
            });
            
            const totalCreditos = creditosResp.reduce((sum, c) => 
              sum + (c.quantidade_adquirida - c.quantidade_utilizada), 0
            );

            if (totalCreditos > 0) {
              const upgrade = confirm(
                `✨ UPGRADE DISPONÍVEL\n\n` +
                `Você possui ${totalCreditos} créditos de assinatura digital.\n` +
                `Deseja enviar este termo para assinatura com certificado ICP-Brasil?\n\n` +
                `Benefícios:\n` +
                `• Validade jurídica plena (MP 2.200/2)\n` +
                `• Certificado por Autoridade Certificadora\n` +
                `• Reconhecimento automático em tribunais\n\n` +
                `Custo: 1 crédito`
              );

              if (upgrade) {
                // Gerar certificado PDF e enviar para assinatura
                const certResp = await base44.functions.invoke('gerarCertificadoAuditoria', {
                  aceite_id: response.data.aceite_id
                });

                await base44.functions.invoke('enviarAssinaturaDigital', {
                  documento_nome: `Aceite - ${termo.titulo}`,
                  documento_tipo: 'termo_legal',
                  arquivo_url: certResp.data.certificado_url,
                  signatarios: [{ nome: user.full_name, email: user.email, action: 'SIGN' }],
                  aceite_termo_id: response.data.aceite_id
                });

                toast.success('📧 Email de assinatura digital enviado!');
              }
            }
          } catch (err) {
            console.error('Erro ao oferecer upgrade ICP:', err);
          }
        }, 2000);
      }

      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Aceite confirmado:', data);
      
      // BRUTAL FIX: Invalidar + refetch FORÇADO
      queryClient.invalidateQueries({ queryKey: ["termos-pendentes-cfm"] });
      queryClient.invalidateQueries({ queryKey: ["termos-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["aceites-termos"] });
      queryClient.refetchQueries({ queryKey: ["termos-pendentes-cfm"] });
      
      toast.success("✅ Termo aceito! Certificado gerado.");
      
      if (onConfirm) onConfirm();
    },
    onError: (error) => {
      console.error('❌ Erro ao registrar aceite:', error);
      toast.error("Erro: " + error.message);
    }
  });

  const handleRecusar = () => {
    if (!termo.obrigatorio) {
      // Termo opcional - pode fechar
      toast.info("Você pode aceitar depois no ícone 🔔");
      onClose?.();
    } else {
      // Termo obrigatório - logout
      if (confirm('⚠️ Este termo é OBRIGATÓRIO.\n\nSem aceite, você será desconectado do sistema.\n\nDeseja realmente recusar?')) {
        toast.error('Acesso negado. Redirecionando...');
        setTimeout(() => {
          base44.auth.logout();
        }, 1500);
      }
    }
  };

  const handleScroll = (e) => {
    const element = e.target;
    // FIX BRUTAL: threshold 100px para facilitar
    const threshold = 100;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + threshold;
    setScrolledToBottom(isScrolledToBottom);
  };
  
  // Auto-detectar scroll (caso conteúdo seja curto)
  useEffect(() => {
    const timer = setTimeout(() => {
      const contentEl = document.querySelector('[data-termo-content]');
      if (contentEl && contentEl.scrollHeight - contentEl.clientHeight < 100) {
        setScrolledToBottom(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [termo]);

  const handleConfirm = () => {
    if (!aceito) {
      toast.error("Você precisa confirmar o aceite antes de prosseguir");
      return;
    }

    if (!consentimentoMetadados) {
      toast.error("Consentimento para coleta de metadados é obrigatório (LGPD)");
      return;
    }

    if (!scrolledToBottom) {
      toast.error("Role até o final para confirmar a leitura completa");
      return;
    }

    registrarAceiteMutation.mutate();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !termo.obrigatorio) {
            onClose?.();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white shadow-2xl w-full mx-auto flex flex-col overflow-hidden"
          style={{ 
            maxWidth: 'min(900px, calc(100vw - 16px))',
            maxHeight: 'min(92vh, calc(100vh - 16px))',
            borderRadius: 'clamp(16px, 4vw, 24px)'
          }}
        >
          {/* Header - Fully Responsive */}
          <div className="px-3 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 border-b flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0" style={{ 
            background: 'linear-gradient(135deg, #7E57FF 0%, #6d28d9 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white truncate" style={{ fontSize: 'clamp(14px, 4vw, 20px)' }}>{termo.titulo}</h2>
                <p className="text-white/80 truncate" style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}>
                  {termo.obrigatorio ? 'Leitura obrigatória' : 'Informativo'}
                </p>
              </div>
            </div>
            {!termo.obrigatorio && (
              <button
                onClick={handleRecusar}
                className="p-2 hover:bg-white/20 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>

          {/* Content - Fully Responsive Scroll */}
          <div
            data-termo-content
            onScroll={handleScroll}
            className="px-3 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 overflow-y-auto flex-1"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#7E57FF #f1f1f1',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div 
              className="prose prose-sm max-w-none leading-relaxed"
              style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }}
              dangerouslySetInnerHTML={{ __html: termo.conteudo_html }}
            />
          </div>

          {/* Footer - Fully Responsive + Postpone Option */}
          <div className="px-3 sm:px-5 md:px-6 py-4 sm:py-5 border-t bg-gray-50 flex-shrink-0" style={{ borderTop: '1px solid #e8eaed' }}>
            {!scrolledToBottom && (
              <div className="mb-3 sm:mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-800 leading-relaxed" style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}>
                  <strong>Role até o final</strong> para habilitar
                </p>
              </div>
            )}

            {/* Checkbox 1: Li e Concordo - IMPROVED Touch Target */}
            <label 
              htmlFor="aceite-termo" 
              className="flex items-start gap-3 mb-3 sm:mb-4 cursor-pointer group"
              style={{ minHeight: '48px' }}
            >
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  id="aceite-termo"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                  disabled={!scrolledToBottom}
                  className="cursor-pointer accent-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 group-hover:ring-2 group-hover:ring-purple-300"
                  style={{ 
                    width: 'clamp(18px, 5vw, 22px)',
                    height: 'clamp(18px, 5vw, 22px)',
                    minWidth: '18px',
                    minHeight: '18px'
                  }}
                />
              </div>
              <span className="text-gray-700 flex-1 leading-relaxed font-medium" style={{ fontSize: 'clamp(13px, 3.5vw, 15px)' }}>
                Li e concordo com os termos acima.
              </span>
            </label>

            {/* Checkbox 2: Consentimento LGPD - IMPROVED */}
            <label 
              htmlFor="consentimento-metadados"
              className="flex items-start gap-3 mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg bg-yellow-50 border border-yellow-200 cursor-pointer group"
              style={{ minHeight: '48px' }}
            >
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  id="consentimento-metadados"
                  checked={consentimentoMetadados}
                  onChange={(e) => setConsentimentoMetadados(e.target.checked)}
                  disabled={!aceito}
                  className="cursor-pointer accent-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 group-hover:ring-2 group-hover:ring-purple-300"
                  style={{ 
                    width: 'clamp(18px, 5vw, 22px)',
                    height: 'clamp(18px, 5vw, 22px)',
                    minWidth: '18px',
                    minHeight: '18px'
                  }}
                />
              </div>
              <span className="text-gray-700 flex-1 leading-relaxed" style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}>
                <strong>Consentimento LGPD:</strong> Autorizo a coleta de <strong>endereço IP, timestamp e navegador</strong> para 
                fins de auditoria e compliance (MP 2.200/2). Estes dados são essenciais para garantir a 
                autenticidade do aceite eletrônico.
              </span>
            </label>

            <div className="flex items-center gap-2 mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <p className="text-blue-800 leading-relaxed" style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}>
                <strong>MP 2.200/2:</strong> Certificado digital de auditoria com cadeia de custódia.
              </p>
            </div>

            {/* Botões de Ação - LÓGICA JURÍDICA CORRETA */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              {/* TERMO OPCIONAL: Pode postergar */}
              {!termo.obrigatorio && (
                <button
                  onClick={handleRecusar}
                  className="w-full sm:w-auto px-5 rounded-full font-medium border transition-all min-h-[48px] flex items-center justify-center gap-2 touch-manipulation hover:bg-gray-100"
                  style={{ 
                    borderColor: '#e8eaed', 
                    color: '#5f6368',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)'
                  }}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  Aceitar Depois
                </button>
              )}

              {/* TERMO OBRIGATÓRIO: Logout brutal */}
              {termo.obrigatorio && (
                <button
                  onClick={handleRecusar}
                  className="w-full sm:w-auto px-5 rounded-full font-medium border-2 transition-all min-h-[48px] flex items-center justify-center gap-2 touch-manipulation hover:bg-red-50"
                  style={{ 
                    borderColor: '#ea4335', 
                    color: '#ea4335',
                    fontSize: 'clamp(13px, 3.5vw, 15px)',
                    padding: 'clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px)'
                  }}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  Recusar e Sair
                </button>
              )}

              {/* Botão ACEITAR */}
              <button
                onClick={handleConfirm}
                disabled={!aceito || !consentimentoMetadados || !scrolledToBottom || registrarAceiteMutation.isPending}
                className="w-full sm:flex-1 rounded-full font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
                style={{
                  background: aceito && consentimentoMetadados && scrolledToBottom ? 'linear-gradient(135deg, #7E57FF 0%, #6d28d9 100%)' : '#cbd5e1',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 24px)'
                }}
              >
                {registrarAceiteMutation.isPending ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="border-2 border-white border-t-transparent rounded-full"
                      style={{ width: 'clamp(18px, 4vw, 20px)', height: 'clamp(18px, 4vw, 20px)' }}
                    />
                    <span className="truncate">Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="flex-shrink-0" style={{ width: 'clamp(18px, 4vw, 20px)', height: 'clamp(18px, 4vw, 20px)' }} />
                    <span className="truncate">Aceitar e Continuar</span>
                  </>
                )}
              </button>
            </div>

            {/* Aviso Obrigatório */}
            {termo.obrigatorio && (
              <p className="text-center text-red-600 mt-3 px-2 leading-relaxed font-medium" style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>
                ⚠️ Termo obrigatório: recusar = logout automático
              </p>
            )}

            {!termo.obrigatorio ? (
              <p className="text-center text-gray-500 mt-3 px-2 leading-relaxed" style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}>
                Termo opcional • Você pode aceitar depois
              </p>
            ) : (
              <p className="text-center text-gray-500 mt-3 px-2 leading-relaxed" style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}>
                Auditado com timestamp e IP (compliance legal)
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}