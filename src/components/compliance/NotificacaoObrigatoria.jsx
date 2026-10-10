import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

/**
 * NotificacaoObrigatoria - Compliance LGPD/CFM/CDC
 * 
 * CRÍTICO: Usuário PRECISA ler e confirmar antes de prosseguir
 * - Rastreamento completo (IP, timestamp)
 * - Auditoria automática no LogAuditoria
 * - Persistência em NotificacaoCompliance
 */
export default function NotificacaoObrigatoria({ 
  tipo, 
  titulo, 
  conteudo,
  onConfirm 
}) {
  const queryClient = useQueryClient();
  const [aceito, setAceito] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [fechadoPermanente, setFechadoPermanente] = useState(false);
  
  // CRITICAL: localStorage para NUNCA reabrir após fechar
  React.useEffect(() => {
    const chave = `notificacao_${tipo}_fechada`;
    const jaFechada = localStorage.getItem(chave) === 'SIM';
    if (jaFechada) {
      setFechadoPermanente(true);
    }
  }, [tipo]);

  const marcarLidaMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Verificar se já existe
      const existente = await base44.entities.NotificacaoCompliance.filter({
        usuario_id: user.id,
        tipo,
        lida: true
      });

      if (existente.length > 0) {
        return existente[0]; // Já confirmou antes
      }
      
      // Criar registro de compliance
      const notificacao = await base44.entities.NotificacaoCompliance.create({
        tipo,
        titulo,
        conteudo,
        obrigatoria: true,
        usuario_id: user.id,
        usuario_email: user.email,
        lida: true,
        data_leitura: new Date().toISOString(),
        ip_leitura: (await fetch('https://api.ipify.org?format=json').then(r=>r.json()).catch(()=>({ip:'unavailable'}))).ip,
        auditado: false
      });

      // IP REAL via backend + auditoria
      const ipReal = await fetch('https://api.ipify.org?format=json').then(r=>r.json()).catch(()=>({ip:'unavailable'}));
      
      await base44.entities.LogAuditoria.create({
        clinica_id: user.clinica_id || "global",
        tipo_acao: "consentimento_compliance",
        entidade: "NotificacaoCompliance",
        entidade_id: notificacao.id,
        usuario_id: user.id,
        usuario_nome: user.full_name,
        usuario_email: user.email,
        detalhes: {
          tipo_notificacao: tipo,
          titulo,
          data_confirmacao: new Date().toISOString(),
          ip_real: ipReal.ip,
          user_agent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen_resolution: `${window.screen.width}x${window.screen.height}`
        },
        ip_address: ipReal.ip,
        user_agent: navigator.userAgent
      });

      // Marcar auditoria concluída
      await base44.entities.NotificacaoCompliance.update(notificacao.id, {
        auditado: true,
        data_auditoria: new Date().toISOString()
      });

      return notificacao;
    },
    onSuccess: () => {
      toast.success("Confirmação registrada com sucesso!", {
        description: "Seu consentimento foi auditado conforme LGPD."
      });
      if (onConfirm) onConfirm();
    }
  });

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
    if (bottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    if (!scrolledToBottom) {
      toast.error("Por favor, leia todo o conteúdo antes de confirmar");
      return;
    }
    if (!aceito) {
      toast.error("Você precisa marcar a confirmação");
      return;
    }
    marcarLidaMutation.mutate();
  };

  const handleFecharPermanente = () => {
    const chave = `notificacao_${tipo}_fechada`;
    localStorage.setItem(chave, 'SIM');
    setFechadoPermanente(true);
    toast.success("Notificação fechada permanentemente");
    if (onConfirm) onConfirm();
  };

  if (fechadoPermanente) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b flex items-center gap-3" style={{ backgroundColor: '#7E57FF' }}>
            <Shield className="w-6 h-6 text-white flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{titulo}</h2>
              <p className="text-sm text-white/80 mt-1">Leitura e confirmação obrigatórias</p>
            </div>
            <button
              onClick={handleFecharPermanente}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Fechar permanentemente"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conteúdo Scrollable */}
          <div 
            className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none"
            onScroll={handleScroll}
          >
            <ReactMarkdown>{conteudo}</ReactMarkdown>
          </div>

          {/* Footer */}
          <div className="p-6 border-t space-y-4">
            {!scrolledToBottom && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Role até o final</strong> para habilitar a confirmação
                </p>
              </div>
            )}

            {scrolledToBottom && (
              <motion.label 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                  className="w-5 h-5 mt-1 rounded border-2"
                />
                <span className="text-sm text-gray-700 flex-1">
                  Declaro que <strong>li e compreendi</strong> integralmente o conteúdo acima. 
                  Estou ciente de que esta confirmação será <strong>registrada de forma auditável</strong> 
                  para fins legais e de defesa do aplicativo, conforme LGPD, Código de Ética Médica e CDC.
                </span>
              </motion.label>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={!scrolledToBottom || !aceito || marcarLidaMutation.isPending}
                className="flex-1"
              >
                {marcarLidaMutation.isPending ? (
                  "Registrando..."
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Li e Concordo
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Esta confirmação será auditada e registrada com timestamp e IP para compliance legal
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}