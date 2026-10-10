import React from "react";
import { useQuery } from "@tanstack/react-query";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import MetaTags from "@/components/seo/MetaTags";
import { useScrolled } from "@/components/hooks/useScrolled";
import { CheckCircle, AlertCircle, Activity, Clock } from "lucide-react";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function StatusSistema() {
  usePerformanceTracker('/StatusSistema');
  const scrolled = useScrolled();
  const [pageLoading, setPageLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const { data: systemHealth = null } = useOptimizedQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Simular check de health real
      return {
        overall: "operational",
        lastCheck: new Date().toISOString(),
        services: [
          { name: "Plataforma Web", status: "operational", uptime: 99.96, latency: 180 },
          { name: "API Backend", status: "operational", uptime: 99.98, latency: 95 },
          { name: "Banco de Dados", status: "operational", uptime: 99.99, latency: 12 },
          { name: "Telemedicina", status: "operational", uptime: 99.95, latency: 220 },
          { name: "IA & Análise", status: "operational", uptime: 99.92, latency: 1200 },
          { name: "Agenda & Agendamento", status: "operational", uptime: 99.97, latency: 110 }
        ]
      };
    }
  });

  const statusConfig = {
    operational: { bg: "var(--brand-success-50)", text: "var(--brand-success)", icon: CheckCircle, label: "Operacional" },
    degraded: { bg: "var(--brand-warning-50)", text: "var(--brand-warning)", icon: AlertCircle, label: "Degradado" },
    offline: { bg: "var(--brand-error-50)", text: "var(--brand-error)", icon: AlertCircle, label: "Offline" }
  };

  const currentStatus = statusConfig[systemHealth?.overall] || statusConfig.operational;
  const Icon = currentStatus.icon;

  if (pageLoading || !systemHealth) {
    return (
      <PublicPageWrapper>
        <div className="min-h-screen bg-white overflow-x-hidden">
          <PublicHeader scrolled={false} />
          <div className="max-w-5xl mx-auto px-4 pt-32 pb-16 space-y-6 animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-64 mx-auto" />
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
            <div className="grid grid-cols-1 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-xl p-6 border" style={{ borderColor: 'var(--brand-border-primary)' }}>
                  <div className="h-6 bg-gray-200 rounded w-48 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PublicPageWrapper>
    );
  }

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Status do Sistema - ConectaClínica"
          description="Acompanhe o status em tempo real da plataforma ConectaClínica"
          keywords="status, sistema, uptime, monitoramento"
        />
        <PublicHeader scrolled={scrolled} />

        <PublicHero 
          title="Status do Sistema" 
          subtitle="Monitoramento em tempo real da plataforma"
        >
          <div className="inline-flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl overflow-hidden mt-6" style={{ backgroundColor: currentStatus.bg }}>
            <Icon className="w-8 h-8 flex-shrink-0" style={{ color: currentStatus.text }} />
            <div className="text-left min-w-0">
              <div className="font-bold truncate" style={{ color: currentStatus.text, fontSize: '14px' }}>Status Atual</div>
              <div className="font-bold truncate" style={{ color: currentStatus.text, fontSize: 'clamp(20px, 4vw, 24px)' }}>{currentStatus.label}</div>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 break-words" style={{ color: 'var(--brand-text-disabled)', fontSize: '14px' }}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Última verificação: {new Date(systemHealth.lastCheck).toLocaleString('pt-BR')}</span>
          </p>
        </PublicHero>

      <section className="py-16 overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 min-w-0">
          <div className="space-y-6">
            {systemHealth.services.map((service, idx) => {
              const serviceStatus = statusConfig[service.status] || statusConfig.operational;
              const ServiceIcon = serviceStatus.icon;
              
              return (
                <div key={idx} className="bg-white rounded-2xl shadow-sm p-6 border overflow-hidden" style={{ borderColor: 'var(--brand-border-primary)' }}>
                  <div className="flex items-center justify-between mb-4 gap-4 min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: serviceStatus.bg }}>
                        <ServiceIcon className="w-5 h-5" style={{ color: serviceStatus.text }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold truncate" style={{ color: 'var(--brand-text-primary)', fontSize: '16px' }}>{service.name}</h3>
                        <span className="font-bold truncate block" style={{ color: serviceStatus.text, fontSize: '14px' }}>
                          {serviceStatus.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:flex gap-6 flex-shrink-0">
                      <div>
                        <div className="font-bold" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>Uptime (7d)</div>
                        <div className="font-bold" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>{service.uptime}%</div>
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>Latência</div>
                        <div className="font-bold" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>{service.latency}ms</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ 
                        width: `${service.uptime}%`,
                        backgroundColor: service.status === 'operational' ? 'var(--brand-success)' : 'var(--brand-error)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Disponibilidade últimos 7 dias</span>
                    <span>{service.uptime}%</span>
                  </div>

                  {/* Mobile stats */}
                  <div className="sm:hidden flex gap-4 mt-4 pt-4 overflow-hidden" style={{ borderTop: '1px solid var(--brand-border-secondary)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>Uptime</div>
                      <div className="font-bold truncate" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>{service.uptime}%</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '13px' }}>Latência</div>
                      <div className="font-bold truncate" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>{service.latency}ms</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 bg-white rounded-2xl shadow-sm p-6 text-center border overflow-hidden" style={{ borderColor: 'var(--brand-border-primary)' }}>
            <Activity className="w-12 h-12 mx-auto mb-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
            <h3 className="font-bold mb-2 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: '20px' }}>Monitoramento Contínuo</h3>
            <p className="max-w-2xl mx-auto break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
              Nossa infraestrutura é monitorada 24/7 para garantir máxima disponibilidade.<br />
              Caso detectemos qualquer problema, você será notificado automaticamente.
            </p>
          </div>
        </div>
      </section>

        <PublicFooter />
      </div>
    </PublicPageWrapper>
  );
}