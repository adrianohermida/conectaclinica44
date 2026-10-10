import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermoLGPD({ onAceite }) {
  const [mostrarTermo, setMostrarTermo] = useState(false);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    verificarAceite();
  }, []);

  const verificarAceite = async () => {
    try {
      const user = await base44.auth.me();
      const termos = await base44.entities.TermoConsentimento.filter({
        usuario_email: user.email,
        tipo_termo: "lgpd",
        versao_termo: "1.0"
      });

      if (termos.length === 0) {
        setMostrarTermo(true);
      } else if (onAceite) {
        onAceite();
      }
    } catch (e) {
      setMostrarTermo(true);
    }
  };

  const handleAceitar = async () => {
    setAceitando(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.TermoConsentimento.create({
        usuario_email: user.email,
        tipo_termo: "lgpd",
        versao_termo: "1.0",
        data_aceite: new Date().toISOString(),
        ip_aceite: "N/A",
        user_agent: navigator.userAgent,
        conteudo_termo: TERMO_LGPD_TEXTO,
        aceito: true
      });

      setMostrarTermo(false);
      if (onAceite) onAceite();
    } catch (e) {
      alert("Erro ao registrar aceite");
    } finally {
      setAceitando(false);
    }
  };

  if (!mostrarTermo) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-[#0B7A9E] p-6 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Termo de Consentimento LGPD</h2>
              <p className="text-sm text-blue-100">Lei Geral de Proteção de Dados</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 mb-4">
              <strong>PrevenClin - Sistema de Gestão Clínica</strong><br />
              Versão 1.0 - Atualizado em 06/01/2025
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">1. Coleta e Uso de Dados</h3>
            <p className="text-sm text-gray-700">
              Coletamos dados pessoais (nome, CPF, email, telefone) e dados sensíveis de saúde 
              (prontuários, exames, diagnósticos) exclusivamente para finalidades médicas e 
              administrativas relacionadas ao seu atendimento.
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">2. Base Legal (Art. 7º e 11º LGPD)</h3>
            <p className="text-sm text-gray-700">
              • Execução de contrato (atendimento médico)<br />
              • Tutela da saúde (procedimentos médicos)<br />
              • Consentimento explícito para compartilhamentos
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">3. Compartilhamento de Dados</h3>
            <p className="text-sm text-gray-700">
              Seus dados podem ser compartilhados com:<br />
              • Médicos e profissionais de saúde autorizados<br />
              • Laboratórios para exames solicitados<br />
              • Planos de saúde (mediante autorização)<br />
              • Autoridades reguladoras (CFM, ANVISA) quando exigido por lei
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">4. Seus Direitos (Art. 18º LGPD)</h3>
            <p className="text-sm text-gray-700">
              Você tem direito a:<br />
              • Confirmar a existência de tratamento de dados<br />
              • Acessar seus dados pessoais<br />
              • Corrigir dados incompletos ou desatualizados<br />
              • Solicitar anonimização ou exclusão (respeitando prazos legais CFM)<br />
              • Revogar consentimento
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">5. Segurança e Armazenamento</h3>
            <p className="text-sm text-gray-700">
              • Dados criptografados em repouso e em trânsito<br />
              • Backup diário automático<br />
              • Acesso restrito por autenticação e perfis<br />
              • Auditoria completa de acessos e modificações<br />
              • Retenção: 20 anos (prontuários) conforme CFM
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">6. Encarregado de Dados (DPO)</h3>
            <p className="text-sm text-gray-700">
              Email: lgpd@prevenclin.com.br<br />
              Para exercer seus direitos ou esclarecer dúvidas sobre proteção de dados.
            </p>

            <h3 className="font-bold text-gray-800 mt-4 mb-2">7. Uso de Inteligência Artificial</h3>
            <p className="text-sm text-gray-700">
              Utilizamos IA para auxiliar diagnósticos, prescrições e análises. 
              Todas as sugestões são revisadas por profissionais habilitados. 
              Dados são anonimizados antes de processar pela IA.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="aceite"
              className="mt-1 w-5 h-5"
              required
            />
            <label htmlFor="aceite" className="text-sm text-gray-700">
              <strong>Li e aceito</strong> os termos de consentimento LGPD e autorizo o tratamento 
              dos meus dados pessoais e sensíveis de saúde conforme descrito acima.
            </label>
          </div>
          <button
            onClick={handleAceitar}
            disabled={aceitando}
            className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {aceitando ? "Registrando..." : "Aceitar e Continuar"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Ao aceitar, você concorda com o tratamento de dados conforme LGPD (Lei 13.709/2018)
          </p>
        </div>
      </div>
    </div>
  );
}

const TERMO_LGPD_TEXTO = `[Conteúdo completo do termo armazenado para auditoria]`;