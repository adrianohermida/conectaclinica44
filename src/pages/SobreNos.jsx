import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MetaTags from "@/components/seo/MetaTags";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import { Building2, Target, Users, Zap, Shield, TrendingUp, Heart, ArrowRight } from "lucide-react";
import { useScrolled } from "@/components/hooks/useScrolled";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function SobreNos() {
  usePerformanceTracker('/SobreNos');
  const [isLoading, setIsLoading] = useState(true);
  const scrolled = useScrolled();

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const valores = [
    {
      icon: Target,
      titulo: "Missão",
      descricao: "Transformar a gestão de clínicas médicas através de tecnologia inteligente e acessível."
    },
    {
      icon: Zap,
      titulo: "Inovação",
      descricao: "IA e automação para eliminar burocracia e aumentar eficiência operacional."
    },
    {
      icon: Shield,
      titulo: "Segurança",
      descricao: "Conformidade total com CFM, LGPD e padrões internacionais de criptografia."
    },
    {
      icon: Heart,
      titulo: "Humanização",
      descricao: "Mais tempo para médicos cuidarem de pacientes, menos tempo em papelada."
    }
  ];

  const timeline = [
    { ano: "2024", evento: "Fundação da ConectaClínica", descricao: "Início do desenvolvimento da plataforma" },
    { ano: "2024 Q3", evento: "Primeiro MVP", descricao: "Lançamento para 10 clínicas beta" },
    { ano: "2024 Q4", evento: "500+ Clínicas", descricao: "Expansão nacional e integração com Stripe" },
    { ano: "2025", evento: "Escala e IA", descricao: "Secretária digital IA e telemedicina avançada" }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        <div className="h-16 bg-white border-b animate-pulse" style={{ borderColor: 'var(--brand-border-primary)' }} />
        <div className="py-16 bg-gray-900 animate-pulse">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
            <div className="h-16 bg-gray-700 rounded w-3/4 mx-auto" />
            <div className="h-8 bg-gray-700 rounded w-1/2 mx-auto" />
          </div>
        </div>
        <div className="py-16 max-w-7xl mx-auto px-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="h-6 bg-gray-200 rounded w-24 mx-auto mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicPageWrapper>
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MetaTags 
        title="Sobre Nós - ConectaClínica"
        description="Conheça a ConectaClínica: transformando a gestão de clínicas médicas com tecnologia, IA e segurança."
        keywords="sobre conectaclinica, missão, valores, equipe, história"
      />

      <PublicHeader scrolled={scrolled} />

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center min-w-0">
          <h1 className="font-bold text-white mb-6 break-words" style={{ fontSize: 'clamp(32px, 8vw, 56px)', lineHeight: '1.2' }}>
            Sobre a ConectaClínica
          </h1>
          <p className="max-w-3xl mx-auto leading-relaxed break-words" style={{ color: 'var(--brand-text-disabled)', fontSize: 'clamp(18px, 4vw, 24px)', lineHeight: '1.5' }}>
            Nascemos para resolver o maior problema dos médicos: <span className="font-bold" style={{ color: 'var(--brand-primary-200)' }}>burocracia excessiva</span>. 
            Nossa IA trabalha 24/7 para você focar no que importa: cuidar de vidas.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>
              Nossos Valores
            </h2>
            <p className="text-lg" style={{ color: 'var(--brand-text-secondary)' }}>
              O que nos move todos os dias
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 overflow-hidden">
            {valores.map((valor, idx) => (
              <div key={idx} className="text-center overflow-hidden min-w-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                  <valor.icon className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h3 className="font-bold mb-3 break-words" style={{ color: 'var(--brand-text-primary)', fontSize: '20px' }}>
                  {valor.titulo}
                </h3>
                <p className="leading-relaxed break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                  {valor.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>
            Nossa Jornada
          </h2>
          <p className="text-lg" style={{ color: 'var(--brand-text-secondary)' }}>
            De ideia a plataforma nacional
          </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0 w-32 text-right">
                    <span className="inline-block font-bold text-lg px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--brand-primary-50)', color: 'var(--brand-primary)' }}>
                      {item.ano}
                    </span>
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-6 shadow-md">
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>
                      {item.evento}
                    </h3>
                    <p style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                      {item.descricao}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { valor: "+500", label: "Clínicas Ativas" },
              { valor: "+50k", label: "Pacientes Atendidos" },
              { valor: "98%", label: "Satisfação" },
              { valor: "24/7", label: "IA Trabalhando" }
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--brand-primary)' }}>
                  {stat.valor}
                </div>
                <div className="text-sm" style={{ color: 'var(--brand-text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 break-words">
            Faça parte da transformação
          </h2>
          <p className="text-xl mb-8 break-words" style={{ color: 'var(--brand-text-disabled)' }}>
            Junte-se a centenas de clínicas que já eliminaram burocracia e focaram no essencial.
          </p>
          <Link to={createPageUrl("Dashboard")}>
            <button aria-label="Começar grátis agora" className="font-bold rounded-full hover:opacity-90 transition-all min-h-[56px] inline-flex items-center gap-2 px-10" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)', fontSize: '18px' }}>
              Começar Agora Grátis
              <ArrowRight className="w-5 h-5 flex-shrink-0" />
            </button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
    </PublicPageWrapper>
  );
}