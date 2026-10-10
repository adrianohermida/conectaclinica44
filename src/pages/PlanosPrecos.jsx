import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Check } from "lucide-react";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import MetaTags from "@/components/seo/MetaTags";
import { useScrolled } from "@/components/hooks/useScrolled";

export default function PlanosPrecos() {
  const scrolled = useScrolled();
  const planos = [
    {
      nome: "Starter",
      preco: "R$ 97",
      periodo: "/mês",
      descricao: "Para pequenas clínicas",
      features: ["3 usuários", "100 pacientes", "Agenda básica", "Prontuário digital"],
      stripe_price_id: "price_1ScDhAFEZT2Uu2jIGWLNdkNX"
    },
    {
      nome: "Profissional",
      preco: "R$ 297",
      periodo: "/mês",
      descricao: "Para clínicas em crescimento",
      features: ["10 usuários", "Pacientes ilimitados", "Telemedicina", "Relatórios avançados", "Integrações"],
      stripe_price_id: "price_1ScDkpFEZT2Uu2jIhvqfZgsK",
      destaque: true
    },
    {
      nome: "Enterprise",
      preco: "R$ 497",
      periodo: "/mês",
      descricao: "Para grandes clínicas",
      features: ["Usuários ilimitados", "Multi-clínicas", "API dedicada", "Suporte 24/7", "Customizações"],
      stripe_price_id: "price_1ScDn5FEZT2Uu2jIezgBG9yV"
    }
  ];

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Planos e Preços - ConectaClínica"
          description="Escolha o plano ideal para sua clínica. Teste grátis por 7 dias sem cartão."
          keywords="planos conectaclinica, preços, assinatura, trial grátis"
        />
        <PublicHeader scrolled={scrolled} />
        <PublicHero title="Planos e Preços" subtitle="Escolha o plano ideal para sua clínica" />

      <div className="py-16 px-4" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">

        <div className="grid md:grid-cols-3 gap-8">
          {planos.map((plano) => (
            <div
              key={plano.nome}
              className={`bg-white rounded-2xl shadow-lg p-8`}
              style={plano.destaque ? { 
                boxShadow: '0 0 0 4px var(--brand-primary)',
                transform: 'scale(1.05)'
              } : {}}
            >
              {plano.destaque && (
                <span className="text-white px-4 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--brand-primary)' }}>
                  Mais Popular
                </span>
              )}
              <h3 className="text-2xl font-bold mt-4" style={{ color: 'var(--brand-text-primary)' }}>{plano.nome}</h3>
              <p className="mt-2" style={{ color: 'var(--brand-text-secondary)' }}>{plano.descricao}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold" style={{ color: 'var(--brand-text-primary)' }}>{plano.preco}</span>
                <span style={{ color: 'var(--brand-text-secondary)' }}>{plano.periodo}</span>
              </div>
              <ul className="mt-8 space-y-4">
                {plano.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-success)' }} />
                    <span style={{ color: 'var(--brand-text-secondary)', fontSize: '15px' }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={createPageUrl(`Checkout?plan=${plano.stripe_price_id}`)}
                className="block w-full mt-8"
              >
                <button
                  className="w-full font-medium py-3 rounded-full transition-all min-h-[48px]"
                  style={plano.destaque ? {
                    backgroundColor: 'var(--brand-primary)',
                    color: 'var(--brand-text-on-primary)'
                  } : {
                    backgroundColor: 'var(--brand-text-primary)',
                    color: 'var(--brand-text-on-primary)'
                  }}
                >
                  Começar Agora
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
      </div>
      
        <PublicFooter />
      </div>
    </PublicPageWrapper>
  );
}