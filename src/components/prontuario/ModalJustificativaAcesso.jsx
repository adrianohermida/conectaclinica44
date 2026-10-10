import React, { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * COMPLIANCE CFM/LGPD: Modal de Justificativa para Acesso a Prontuário
 * CRÍTICO: Resolução CFM 2.314/2022 - rastreabilidade obrigatória
 */
export default function ModalJustificativaAcesso({ 
  prontuario, 
  onAutorizado, 
  onNegado,
  user 
}) {
  const [justificativa, setJustificativa] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleAutorizar = async () => {
    if (!justificativa || justificativa.length < 20) {
      toast.error("Justificativa deve ter ao menos 20 caracteres");
      return;
    }

    setCarregando(true);

    try {
      // Log LGPD obrigatório - Art. 37 LGPD + CFM 2.314/2022
      await base44.entities.LogAcessoDado.create({
        clinica_id: user.clinica_id,
        usuario_id: user.id,
        usuario_email: user.email,
        entidade: 'Prontuario',
        registro_id: prontuario.id,
        tipo_acesso: 'leitura_manual',
        base_legal: 'interesse_legitimo',
        finalidade: justificativa,
        dados_acessados: ['anamnese', 'exame_fisico', 'hipotese_diagnostica', 'prescricao'],
        contexto: `Acesso ao prontuário do paciente ${prontuario.paciente_nome}, médico responsável ${prontuario.medico_nome}`,
        ip_origem: window.location.hostname,
        user_agent: navigator.userAgent,
        sucesso: true
      });

      // CRÍTICO: Atualizar prontuario com flag de acesso externo
      const acessosAtuais = prontuario.acessos_externos || [];
      await base44.entities.Prontuario.update(prontuario.id, {
        acessos_externos: [...acessosAtuais, {
          usuario_email: user.email,
          usuario_nome: user.full_name,
          justificativa: justificativa,
          data_acesso: new Date().toISOString(),
          ip: window.location.hostname
        }]
      });

      // CRITICAL: Criar notificação sistema pro admin da clínica
      try {
        await base44.entities.NotificacaoSistema.create({
          clinica_id: user.clinica_id,
          tipo: 'aprovacao_prontuario',
          destinatario_id: 'admin', // Admin da clínica (melhorar: buscar admins reais)
          destinatario_email: 'admin@conectaclinica.com.br',
          remetente_id: user.id,
          remetente_nome: user.full_name,
          titulo: `Acesso cross-tenant solicitado`,
          corpo: `${user.full_name} acessou prontuário de ${prontuario.paciente_nome} (médico responsável: ${prontuario.medico_nome}). Justificativa: ${justificativa}`,
          acao_url: `/Prontuarios?id=${prontuario.id}`,
          acao_label: 'Ver prontuário',
          canal: 'in_app',
          prioridade: 'alta',
          metadata: {
            prontuario_id: prontuario.id,
            paciente_id: prontuario.paciente_id,
            paciente_nome: prontuario.paciente_nome,
            medico_responsavel: prontuario.medico_nome,
            justificativa: justificativa
          },
          icone: 'Shield',
          cor: '#ea4335'
        });
      } catch (notifError) {
        console.warn('Notificação admin falhou (não bloqueador):', notifError);
      }

      toast.success("Acesso autorizado e registrado");
      onAutorizado();
      } catch (error) {
      console.error("Erro ao registrar acesso:", error);
      toast.error("Erro ao registrar auditoria");
      } finally {
      setCarregando(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Acesso Restrito</h2>
          </div>
          <p className="text-red-100 text-sm">
            CFM Resolução 2.314/2022 + LGPD Art. 37
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-2">Prontuário de outro médico</p>
                <p className="text-xs leading-relaxed">
                  Você está acessando um prontuário de responsabilidade de <strong>{prontuario.medico_nome || 'outro profissional'}</strong>.
                  <br/><br/>
                  Por exigência do CFM e LGPD, justifique o acesso para auditoria.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block font-bold mb-2 text-sm text-gray-700">
              Justificativa de Acesso *
            </label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex: Atendimento de emergência, interconsulta solicitada pelo Dr. X, cobertura de plantão..."
              className="min-h-[120px] border-2 rounded-xl"
              style={{ borderColor: '#e8eaed', fontSize: '14px' }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Mínimo: 20 caracteres • {justificativa.length}/200
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onNegado}
              className="flex-1"
              disabled={carregando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAutorizar}
              className="flex-1"
              disabled={carregando || justificativa.length < 20}
              style={{ backgroundColor: '#7E57FF' }}
            >
              {carregando ? 'Registrando...' : 'Autorizar Acesso'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
            Seu acesso será registrado com IP, timestamp e justificativa para auditoria CFM/LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}