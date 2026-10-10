import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useScrolled } from "@/components/hooks/useScrolled";
import MetaTags from "@/components/seo/MetaTags";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageOptimizer from "@/components/performance/PublicPageOptimizer";
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  Clock, 
  Shield,
  Calendar,
  FileText,
  Users,
  Brain,
  BarChart3,
  Zap,
  Star,
  Play,
  Menu,
  X,
  MessageSquare,
  Video,
  Sparkles,
  TrendingUp
} from "lucide-react";

// Lazy load components
const PublicChatWidget = React.lazy(() => import("@/components/widget/PublicChatWidget"));

export default function Home() {
  const scrolled = useScrolled();
  const [chatLoaded, setChatLoaded] = useState(false);

  useEffect(() => {
    const chatTimer = setTimeout(() => setChatLoaded(true), 2000);
    return () => clearTimeout(chatTimer);
  }, []);

  const [faqAberto, setFaqAberto] = useState(null);

  const depoimentos = [
    { 
      nome: "Dra. Mariana Costa", 
      cargo: "Clínica Vitalis - São Paulo",
      texto: "ConectaClínica transformou nossa operação. Reduzimos 40% do tempo administrativo e aumentamos a satisfação dos pacientes.",
      avatar: "https://i.pravatar.cc/150?img=47"
    },
    { 
      nome: "Dr. Roberto Almeida", 
      cargo: "Clínica Bem Estar - Rio de Janeiro",
      texto: "A IA para análise de documentos economiza horas todo dia. Essencial para qualquer clínica moderna.",
      avatar: "https://i.pravatar.cc/150?img=12"
    },
    { 
      nome: "Dra. Ana Paula Silva", 
      cargo: "Saúde Integrada - Brasília",
      texto: "Prontuário eletrônico completo, telemedicina integrada e relatórios financeiros claros. Tudo que precisávamos.",
      avatar: "https://i.pravatar.cc/150?img=32"
    }
  ];

  const faqs = [
    { pergunta: "Posso cancelar minha assinatura a qualquer momento?", resposta: "Sim, você pode cancelar a qualquer momento sem multas. Seus dados ficam seguros por 30 dias após o cancelamento." },
    { pergunta: "Preciso de cartão para começar o trial?", resposta: "Não. Você tem 7 dias completos de trial gratuito sem precisar cadastrar cartão." },
    { pergunta: "Os dados dos pacientes são seguros?", resposta: "Totalmente. Usamos criptografia de ponta a ponta, servidores no Brasil e somos 100% compatíveis com LGPD e CFM." },
    { pergunta: "Posso mudar de plano depois?", resposta: "Sim, você pode fazer upgrade ou downgrade a qualquer momento. As mudanças são aplicadas no próximo ciclo." },
    { pergunta: "Quanto tempo leva para implementar?", resposta: "A configuração básica leva menos de 5 minutos. Em 1 hora sua clínica já está operacional." },
    { pergunta: "Há suporte técnico incluído?", resposta: "Sim, todos os planos incluem suporte por email. Planos Professional e Enterprise têm suporte prioritário e WhatsApp." }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PublicPageOptimizer />
      {chatLoaded && (
        <React.Suspense fallback={null}>
          <PublicChatWidget />
        </React.Suspense>
      )}
      <MetaTags 
        title="ConectaClínica - Gestão Completa para Clínicas Médicas | Trial Grátis"
        description="Plataforma completa para gestão de clínicas médicas: agenda inteligente, prontuários eletrônicos, telemedicina, IA assistida e relatórios em tempo real. 7 dias grátis."
        keywords="gestão clínica, prontuário eletrônico, telemedicina, agenda médica, software médico, IA saúde, LGPD, CFM"
      />
      {/* Header Inteligente - Detecta se usuário está logado */}
      <PublicHeader scrolled={scrolled} />

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        {/* Purple shapes - hidden on mobile to improve performance */}
        <div className="hidden md:block absolute top-0 right-0 w-1/3 h-full opacity-20">
          <div className="absolute top-20 right-0 w-96 h-96 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
        </div>
        <div className="hidden md:block absolute bottom-0 left-0 w-64 h-64" style={{ backgroundColor: 'var(--brand-primary)', opacity: 0.1, borderRadius: '0 100% 0 0' }} />
        
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-12 sm:py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-3 py-2 rounded-full mb-4 sm:mb-6 border border-white/20">
                <Brain className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Powered by AI</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight break-words">
                Sua clínica com uma<br />
                <span style={{ color: 'var(--brand-primary-200)' }}>
                  secretária digital inteligente
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 leading-relaxed break-words">
                Agendamento automático, prontuário eletrônico e telemedicina em um só app.
              </p>
              <p className="text-sm sm:text-base md:text-lg font-semibold mb-6 sm:mb-8 md:mb-10 break-words" style={{ color: 'var(--brand-primary-200)' }}>
                Mais tempo para cuidar. Menos burocracia.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                <Link to={createPageUrl("Dashboard")} className="w-full sm:w-auto">
                  <button 
                    aria-label="Criar conta grátis"
                    className="w-full sm:w-auto bg-white font-bold px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg hover:bg-gray-50 transition-all inline-flex items-center justify-center gap-2 shadow-2xl min-h-[48px]"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">Criar conta grátis</span>
                  </button>
                </Link>
                <a href="#recursos" className="w-full sm:w-auto">
                  <button 
                    aria-label="Ver como funciona"
                    className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-bold px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full text-sm sm:text-base md:text-lg hover:bg-white/10 transition-all min-h-[48px] whitespace-nowrap"
                  >
                    Como funciona
                  </button>
                </a>
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 text-white/80 text-xs sm:text-sm">
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-green-400" />
                  7 dias grátis
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-green-400" />
                  Sem cartão
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-green-400" />
                  Configure em 5 min
                </span>
              </div>
            </div>

            {/* Preview Widget */}
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Clara - IA</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-xs text-white/70">Online agora</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-white text-sm">
                    Olá! Posso agendar uma consulta com o Dr. Silva para você?
                  </div>
                  <div className="bg-purple-500 rounded-xl p-4 text-white text-sm ml-8">
                    Sim, por favor! Amanhã às 14h pode ser?
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-white text-sm">
                    ✅ Agendado! Confirmação enviada por email.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 sm:py-12 md:py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center">
            {[
              { valor: "+500", label: "Clínicas Ativas" },
              { valor: "+50k", label: "Pacientes" },
              { valor: "98%", label: "Satisfação" },
              { valor: "7 dias", label: "Trial Grátis" }
            ].map((item, idx) => (
              <div key={idx} className="min-w-0">
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 truncate" style={{ color: 'var(--brand-primary)' }}>
                  {item.valor}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 break-words px-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full mb-3 sm:mb-4 text-xs sm:text-sm font-medium" style={{ backgroundColor: 'var(--brand-primary-50)', color: 'var(--brand-primary)' }}>
              <Brain className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Recursos Inteligentes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-3 break-words">
              Sua secretária digital trabalha 24/7
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-3 break-words">
              Enquanto você cuida dos pacientes, a IA gerencia agenda, lembretes, prontuários e comunicação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Brain,
                titulo: "Secretária Digital IA",
                descricao: "Atende chamadas, agenda consultas automaticamente, confirma por WhatsApp e reorganiza horários em tempo real.",
                cor: "var(--brand-primary)",
                destaque: true
              },
              {
                icon: Calendar,
                titulo: "Agendamento Automático",
                descricao: "Pacientes agendam via WhatsApp com a IA. Sem ligações, sem espera. Confirmação e lembretes automáticos.",
                cor: "var(--brand-primary-600)"
              },
              {
                icon: MessageSquare,
                titulo: "Comunicação Inteligente",
                descricao: "IA responde dúvidas frequentes, envia lembretes, resultados de exames e prescrições direto ao paciente.",
                cor: "var(--brand-primary-200)"
              },
              {
                icon: FileText,
                titulo: "Prontuário Eletrônico CFM",
                descricao: "Conforme Resolução CFM 1.821/07, com assinatura digital ICP-Brasil e auditoria completa.",
                cor: "var(--brand-primary)"
              },
              {
                icon: Video,
                titulo: "Telemedicina Integrada",
                descricao: "Consultas por vídeo com prontuário aberto lado a lado. Prescrição digital enviada automaticamente.",
                cor: "var(--brand-info)"
              },
              {
                icon: Sparkles,
                titulo: "IA Médica Assistiva",
                descricao: "Análise de exames, sugestões de diagnóstico baseadas em evidências e alertas de interações medicamentosas.",
                cor: "var(--brand-primary-700)"
              },
              {
                icon: Users,
                titulo: "Dashboard 360° do Paciente",
                descricao: "Histórico completo: consultas, exames, prescrições e evolução clínica em uma única tela.",
                cor: "var(--brand-info)"
              },
              {
                icon: TrendingUp,
                titulo: "Gestão Financeira",
                descricao: "Controle de vendas, contas a pagar/receber e fluxo de caixa. Relatórios automáticos mensais.",
                cor: "var(--brand-success)"
              },
              {
                icon: Shield,
                titulo: "Segurança e LGPD",
                descricao: "Criptografia end-to-end, backup automático e conformidade total com a Lei Geral de Proteção de Dados.",
                cor: "var(--brand-error)"
              }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-2xl p-4 sm:p-6 md:p-8 hover:scale-105 transition-all shadow-lg border-2 ${
                  item.destaque ? 'border-[var(--brand-primary)] bg-gradient-to-br from-purple-50 to-white' : 'border-gray-100'
                }`}
              >
                {item.destaque && (
                  <div className="inline-block bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 animate-pulse whitespace-nowrap">
                    ⭐ DESTAQUE
                  </div>
                )}
                <div 
                  className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 ${item.destaque ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: `${item.cor}15` }}
                >
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" style={{ color: item.cor }} />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-center break-words" style={{ color: 'var(--brand-text-primary)' }}>
                  {item.titulo}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed text-center break-words">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Section - Dark BG like Aetherlab */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-32 relative overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 text-center relative z-10">
          <div className="mb-10 sm:mb-16 md:mb-24">
            <span className="text-sm md:text-base font-semibold block mb-3 sm:mb-4 break-words" style={{ color: 'var(--brand-primary)' }}>
              Crie Sua Própria Experiência
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-3 break-words">
              Assista Nossa Demo
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto px-3 break-words">
              Veja como ConectaClínica pode transformar sua gestão clínica em poucos minutos.
            </p>
          </div>

          <div className="relative px-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-white/20">
              <div className="aspect-video bg-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent" style={{ background: 'linear-gradient(to bottom right, transparent, rgba(126, 87, 255, 0.2))' }} />
                <button className="relative w-20 h-20 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all" style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <Play className="w-8 h-8 ml-1" fill="white" />
                </button>
                {/* Pulse effect */}
                <div className="absolute w-20 h-20 rounded-full animate-ping opacity-20" style={{ backgroundColor: 'var(--brand-primary)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative shapes - hidden on mobile */}
        <div className="hidden md:block absolute top-10 left-10 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: 'var(--brand-primary)' }} />
        <div className="hidden md:block absolute bottom-20 right-20 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: 'var(--brand-primary)' }} />

        {/* Bottom white transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-white" />
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-12 sm:py-16 md:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4" style={{ color: 'var(--brand-primary)' }}>
              Avaliações de Clientes
            </h3>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-3 break-words" style={{ color: 'var(--brand-text-primary)' }}>
              Nossos Depoimentos
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-3 break-words">
              Clínicas que confiam e transformaram sua gestão com ConectaClínica.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {depoimentos.map((dep, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-sm hover:shadow-lg transition-all relative border border-gray-100">
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-sm md:text-base text-gray-700 mb-4 sm:mb-6 italic leading-relaxed break-words">
                  "{dep.texto}"
                </p>
                
                <div className="flex items-center gap-3 min-w-0">
                  <img src={dep.avatar} alt={dep.nome} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm truncate" style={{ color: 'var(--brand-text-primary)' }}>{dep.nome}</h4>
                    <p className="text-xs text-gray-500 truncate">{dep.cargo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 md:py-24 overflow-hidden" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4" style={{ color: 'var(--brand-primary)' }}>
              FAQ
            </h3>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-3 break-words" style={{ color: 'var(--brand-text-primary)' }}>
              Perguntas Frequentes
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 px-3 break-words">
              Respostas rápidas para suas dúvidas mais comuns.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => setFaqAberto(faqAberto === idx ? null : idx)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors min-h-[48px]"
                  style={faqAberto === idx ? { backgroundColor: 'var(--brand-primary)', color: 'white' } : {}}
                  aria-expanded={faqAberto === idx}
                  aria-label={`FAQ: ${faq.pergunta}`}
                >
                  <span className="font-semibold text-sm md:text-base pr-3 sm:pr-4 break-words">
                    {faq.pergunta}
                  </span>
                  <span className="text-lg sm:text-xl flex-shrink-0">
                    {faqAberto === idx ? '−' : '+'}
                  </span>
                </button>
                {faqAberto === idx && (
                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-100">
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed break-words">
                      {faq.resposta}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-32 relative overflow-hidden" style={{ backgroundColor: 'var(--brand-text-primary)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-40 h-40 sm:w-64 sm:h-64 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-3 sm:px-4 md:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 break-words">
            Pronto para começar?<br />
            <span style={{ color: 'var(--brand-primary)' }}>Inicie seu trial gratuito hoje.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 md:mb-10 break-words">
            7 dias grátis • Sem cartão • Cancele quando quiser
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-8">
          <Link to={createPageUrl("Dashboard")} className="w-full sm:w-auto">
          <button aria-label="Começar teste grátis agora" className="w-full sm:w-auto text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-full text-sm sm:text-base md:text-lg hover:opacity-90 transition-all inline-flex items-center justify-center gap-2 min-h-[48px] whitespace-nowrap" style={{ backgroundColor: 'var(--brand-primary)' }}>
            <span>Começar Agora</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          </button>
          </Link>
          <Link to={createPageUrl("PlanosPrecos")} className="w-full sm:w-auto">
          <button aria-label="Ver planos e preços" className="w-full sm:w-auto bg-white/10 backdrop-blur text-white font-bold py-3 sm:py-4 px-6 sm:px-10 rounded-full text-sm sm:text-base md:text-lg hover:bg-white/20 transition-all border border-white/30 min-h-[48px] whitespace-nowrap">
            Ver Planos
          </button>
          </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Setup em 5 minutos</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>100% LGPD</span>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Suporte dedicado</span>
            </div>
          </div>
        </div>
      </section>

        <PublicFooter />
    </div>
  );
}