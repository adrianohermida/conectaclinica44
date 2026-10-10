import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Stethoscope, Plus, TrendingUp, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { createPageUrl } from "@/utils";
import { useModuloAtivo } from "@/components/hooks/useModuloAtivo";

export default function TratamentosPaciente({ pacienteId, contato, onNovoClick }) {
  const [showNovo, setShowNovo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const { ativo: moduloAtivo, isLoading: loadingModulo } = useModuloAtivo('planos_tratamento');

  const { data: tratamentos = [], isLoading } = useQuery({
    queryKey: ["tratamentos", pacienteId],
    queryFn: () => base44.entities.PlanoTratamento.filter({ paciente_id: pacienteId }, "-created_date", 50),
    enabled: !!pacienteId && moduloAtivo
  });

  if (loadingModulo) return <div className="pc-body-sm">Verificando módulo...</div>;

  // CRITICAL: Módulo não ativo - mostrar upgrade prompt
  if (!moduloAtivo) {
    return (
      <div className="pc-card p-6" style={{ backgroundColor: 'var(--pc-warning-50)', borderColor: 'var(--pc-warning)' }}>
        <div className="flex items-start gap-4">
          <XCircle className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--pc-warning)' }} />
          <div className="flex-1">
            <h4 className="pc-heading-4 mb-2">Módulo Planos de Tratamento não disponível</h4>
            <p className="pc-body-sm mb-4">
              O gerenciamento de Planos de Tratamento não está incluído no seu plano atual. 
              Faça upgrade para desbloquear este recurso.
            </p>
            <Button onClick={() => window.location.href = createPageUrl("GerenciarAssinatura")}>
              <TrendingUp className="w-4 h-4 mr-2" /> Fazer Upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="pc-body-sm">Carregando tratamentos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="pc-heading-4">Planos de Tratamento</h3>
        <Button onClick={onNovoClick || (() => setShowNovo(true))}>
          <Plus className="w-4 h-4 mr-2" /> Novo Tratamento
        </Button>
      </div>

      {/* Placeholder: Criar PlanoTratamentoQuickForm */}
      {!onNovoClick && showNovo && (
        <SlideInPanel
          open={showNovo}
          onClose={() => setShowNovo(false)}
          title="Novo Plano de Tratamento"
        >
          <div className="p-6 text-center">
            <p className="text-sm" style={{ color: '#5f6368' }}>
              Componente PlanoTratamentoQuickForm será criado em breve
            </p>
            <Button 
              className="mt-4"
              onClick={() => {
                setShowNovo(false);
                window.location.href = createPageUrl("PlanosTratamento");
              }}
            >
              Ir para módulo completo
            </Button>
          </div>
        </SlideInPanel>
      )}

      {tratamentos.length === 0 ? (
        <div className="pc-card p-12 text-center">
          <Stethoscope className="w-16 h-16 mx-auto mb-3" style={{ color: 'var(--pc-gray-300)' }} />
          <p className="pc-body-sm">Nenhum plano de tratamento ativo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tratamentos.map(t => (
            <div key={t.id} className="pc-card p-5 hover:pc-card-elevated transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope className="w-5 h-5" style={{ color: 'var(--pc-primary)' }} />
                    <span className="pc-body font-bold">{t.nome_plano}</span>
                    <span className={`pc-badge ${
                      t.status === "ativo" ? "pc-badge-success" : "pc-badge-neutral"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="pc-body-sm mb-1">
                    <strong>Médico:</strong> {t.medico_responsavel}
                  </p>
                  <p className="pc-body-sm">
                    <strong>Período:</strong> {format(new Date(t.data_inicio), "dd/MM/yyyy")} 
                    {t.data_fim && ` - ${format(new Date(t.data_fim), "dd/MM/yyyy")}`}
                  </p>
                  {t.objetivos && (
                    <p className="pc-body-sm mt-2">
                      <strong>Objetivos:</strong> {t.objetivos}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}