import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Check, X } from "lucide-react";
import { toast } from "sonner";

/**
 * TERMO DE CONSENTIMENTO LGPD - OBRIGATÓRIO SAÚDE
 * CFM Res 2314/2022 + LGPD Art. 7º
 */
export default function TermoConsentimento() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkConsentimento = async () => {
      try {
        const user = await base44.auth.me();
        
        // Verificar se já aceitou
        const jaAceitou = user?.consentimento_lgpd?.aceito;
        
        if (!jaAceitou) {
          // Delay para não atrapalhar carregamento da página
          setTimeout(() => setShow(true), 1000);
        }
      } catch (error) {
        console.error('Erro ao verificar consentimento:', error);
      }
    };

    checkConsentimento();
  }, []);

  const handleAceitar = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      await base44.auth.updateMe({
        consentimento_lgpd: {
          aceito: true,
          data_aceite: new Date().toISOString(),
          ip_origem: 'webapp', // Browser não expõe IP real
          versao_termo: '1.0'
        }
      });

      // Log auditoria
      await base44.entities.LogAuditoria.create({
        clinica_id: user.clinica_id || 'sistema',
        tipo_operacao: 'consentimento_lgpd',
        usuario_id: user.id,
        usuario_email: user.email,
        entidade_afetada: 'User',
        entidade_id: user.id,
        detalhes: { 
          acao: 'aceite_termo',
          versao: '1.0'
        },
        sucesso: true
      });

      toast.success('Consentimento registrado');
      setShow(false);
    } catch (error) {
      toast.error('Erro ao registrar consentimento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecusar = () => {
    toast.error('É necessário aceitar os termos para usar o sistema');
    base44.auth.logout();
  };

  if (!show) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px', 
          borderBottom: '1px solid #e8eaed',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield className="w-6 h-6" style={{ color: '#7E57FF' }} />
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#202124',
            margin: 0
          }}>
            Termo de Consentimento LGPD
          </h2>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '24px', 
          overflowY: 'auto',
          flex: 1
        }}>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f5f3ff', 
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid #ddd6fe'
          }}>
            <p style={{ 
              fontSize: '14px', 
              color: '#6d28d9',
              margin: 0,
              lineHeight: '1.6'
            }}>
              <strong>Importante:</strong> Este consentimento é obrigatório para uso do sistema conforme LGPD e CFM Res 2314/2022.
            </p>
          </div>

          <div style={{ fontSize: '14px', color: '#5f6368', lineHeight: '1.7' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              1. Coleta e Uso de Dados
            </h3>
            <p>
              Coletamos seus dados pessoais (nome, email, telefone) e dados de saúde (prontuários, consultas, exames) 
              para prestação dos serviços médicos e gestão da clínica.
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              2. Base Legal
            </h3>
            <p>
              • <strong>Execução de contrato</strong>: agendamentos, prontuários<br/>
              • <strong>Obrigação legal</strong>: retenção CFM (20 anos)<br/>
              • <strong>Consentimento</strong>: compartilhamento para fins não obrigatórios
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              3. Compartilhamento
            </h3>
            <p>
              Seus dados podem ser compartilhados com:
              • Médicos e equipe da clínica (execução do tratamento)<br/>
              • Prestadores de serviços técnicos (cloud, backups)<br/>
              • Autoridades fiscais/judiciárias (quando exigido por lei)
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              4. Seus Direitos
            </h3>
            <p>
              • Acesso aos seus dados<br/>
              • Correção de dados incompletos<br/>
              • Exclusão (salvo retenção legal)<br/>
              • Portabilidade<br/>
              • Revogação do consentimento
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              5. Segurança
            </h3>
            <p>
              Utilizamos criptografia, controle de acesso e logs de auditoria para proteger seus dados.
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginTop: '16px' }}>
              6. Contato DPO
            </h3>
            <p>
              Para exercer seus direitos: <strong>contato@conectaclinica.com.br</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '24px', 
          borderTop: '1px solid #e8eaed',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleRecusar}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid #e8eaed',
              backgroundColor: 'white',
              color: '#5f6368',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.5 : 1
            }}
          >
            <X className="w-4 h-4" />
            Recusar
          </button>
          <button
            onClick={handleAceitar}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: '#7E57FF',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>Processando...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Aceitar e Continuar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}