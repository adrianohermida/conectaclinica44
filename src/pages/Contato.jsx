import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import MetaTags from "@/components/seo/MetaTags";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import { Building2, Mail, Phone, MapPin, Send, CheckCircle, Loader2 } from "lucide-react";
import { useScrolled } from "@/components/hooks/useScrolled";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Contato() {
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrolled = useScrolled();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    assunto: "",
    mensagem: ""
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.Ticket.create({
        paciente_nome: formData.nome,
        assunto: formData.assunto,
        categoria: "duvida_comercial",
        descricao: `
Nome: ${formData.nome}
Email: ${formData.email}
Telefone: ${formData.telefone}

Mensagem:
${formData.mensagem}
        `.trim(),
        status: "aberto",
        prioridade: "media"
      });

      await base44.integrations.Core.SendEmail({
        to: "contato@conectaclinica.com.br",
        subject: `Novo contato: ${formData.assunto}`,
        body: `
Novo contato recebido via site:

Nome: ${formData.nome}
Email: ${formData.email}
Telefone: ${formData.telefone}
Assunto: ${formData.assunto}

Mensagem:
${formData.mensagem}
        `.trim()
      });

      setSucesso(true);
      setFormData({ nome: "", email: "", telefone: "", assunto: "", mensagem: "" });
    } catch (error) {
      alert("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white overflow-x-hidden">
        <div className="h-16 bg-white border-b animate-pulse" style={{ borderColor: 'var(--brand-border-primary)' }} />
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-8 animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-64 mx-auto" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
            <div className="space-y-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicPageWrapper>
    <div className="min-h-screen bg-white overflow-x-hidden">
      <MetaTags 
        title="Contato - ConectaClínica"
        description="Entre em contato com ConectaClínica. Tire suas dúvidas sobre gestão de clínicas, planos e funcionalidades."
        keywords="contato conectaclinica, suporte, atendimento, dúvidas"
      />

      <PublicHeader scrolled={scrolled} />
      <PublicHero 
        title="Entre em Contato" 
        subtitle="Estamos aqui para ajudar. Envie sua mensagem e retornaremos em até 24h." 
      />

      {/* Content */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 overflow-hidden">
            {/* Form */}
            <div>
              {sucesso ? (
                <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--brand-success-50)', border: '2px solid var(--brand-success-100)' }}>
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 flex-shrink-0" style={{ color: 'var(--brand-success)' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--brand-text-primary)' }}>Mensagem Enviada!</h3>
                  <p className="mb-6" style={{ color: 'var(--brand-text-secondary)' }}>
                    Recebemos sua mensagem e retornaremos em breve.
                  </p>
                  <button
                    onClick={() => setSucesso(false)}
                    className="text-white font-bold px-6 py-2 rounded-full"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Enviar Outra Mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 overflow-hidden">
                  <div>
                    <label className="block font-bold mb-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                      Nome Completo *
                    </label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="border border-gray-300 rounded-xl min-h-[48px]"
                      style={{ fontSize: '16px' }}
                      required
                      aria-label="Digite seu nome completo"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="border border-gray-300 rounded-xl min-h-[48px]"
                        style={{ fontSize: '16px' }}
                        required
                        aria-label="Digite seu email"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                        Telefone
                      </label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="border border-gray-300 rounded-xl min-h-[48px]"
                        style={{ fontSize: '16px' }}
                        aria-label="Digite seu telefone"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                      Assunto *
                    </label>
                    <Input
                      value={formData.assunto}
                      onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                      className="border border-gray-300 rounded-xl min-h-[48px]"
                      style={{ fontSize: '16px' }}
                      required
                      aria-label="Digite o assunto"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                      Mensagem *
                    </label>
                    <textarea
                      value={formData.mensagem}
                      onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                      rows={6}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none resize-none"
                      style={{ fontSize: '16px', color: 'var(--brand-text-primary)', borderColor: 'var(--brand-border-primary)' }}
                      required
                      aria-label="Digite sua mensagem"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    aria-label="Enviar mensagem"
                    className="w-full font-bold rounded-full hover:opacity-90 transition-all min-h-[56px] flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-text-on-primary)', fontSize: '16px' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 flex-shrink-0" />
                        Enviar Mensagem
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--brand-text-primary)' }}>
                  Outras formas de contato
                </h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 overflow-hidden">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                      <Mail className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold mb-1 truncate" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>Email</h4>
                      <p className="break-words" style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>contato@conectaclinica.com.br</p>
                      <p className="truncate" style={{ color: 'var(--brand-text-tertiary)', fontSize: '14px' }}>Respondemos em até 24h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                      <Phone className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>Telefone</h4>
                      <p style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>+55 (11) 99999-9999</p>
                      <p style={{ color: 'var(--brand-text-tertiary)', fontSize: '14px' }}>Seg-Sex, 9h às 18h</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary-50)' }}>
                      <MapPin className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>Endereço</h4>
                      <p style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                        Av. Paulista, 1000<br />
                        São Paulo - SP, 01310-100
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick */}
              <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--brand-bg-tertiary)' }}>
                <h4 className="font-bold mb-4" style={{ color: 'var(--brand-text-primary)', fontSize: '18px' }}>Dúvidas Frequentes</h4>
                <ul className="space-y-2" style={{ color: 'var(--brand-text-secondary)', fontSize: '14px' }}>
                  <li>• Trial de 7 dias sem cartão</li>
                  <li>• Cancele a qualquer momento</li>
                  <li>• Dados 100% seguros e protegidos</li>
                  <li>• Suporte técnico incluído</li>
                  <li>• Integração com telemedicina</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
    </PublicPageWrapper>
  );
}