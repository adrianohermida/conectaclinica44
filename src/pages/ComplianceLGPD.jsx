import React from "react";
import PublicPageWrapper from "@/components/public/PublicPageWrapper";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHero from "@/components/public/PublicHero";
import MetaTags from "@/components/seo/MetaTags";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, FileText, Lock, Database, UserCheck, Calendar } from "lucide-react";

import { useScrolled } from "@/components/hooks/useScrolled";

export default function ComplianceLGPD() {
  const scrolled = useScrolled();

  const { data: conteudoLegal, isLoading } = useQuery({
    queryKey: ['conteudo-legal-lgpd'],
    queryFn: async () => {
      const docs = await base44.entities.ConteudoLegal.filter({ 
        tipo_documento: 'lgpd', 
        ativo: true 
      });
      return docs[0];
    },
    staleTime: 5 * 60 * 1000
  });

  const blocos = conteudoLegal?.blocos || [];

  const garantias = [
    {
      icon: Lock,
      titulo: "Criptografia de Ponta",
      descricao: "Seus dados e dos pacientes protegidos com criptografia militar em trânsito e armazenamento."
    },
    {
      icon: Database,
      titulo: "Dados no Brasil",
      descricao: "Servidores em território nacional, sem transferência internacional, conforme LGPD exige."
    },
    {
      icon: UserCheck,
      titulo: "Controle Total de Acesso",
      descricao: "Você define quem vê cada informação. Auditoria completa de todos os acessos aos prontuários."
    },
    {
      icon: FileText,
      titulo: "Prontuários Regulares",
      descricao: "100% conforme Resolução CFM 1.821/07, com assinatura digital ICP-Brasil válida juridicamente."
    },
    {
      icon: Shield,
      titulo: "Backup Diário Seguro",
      descricao: "Backups automáticos criptografados. Retenção de 30 dias. Recuperação em minutos."
    },
    {
      icon: CheckCircle,
      titulo: "Transparência Total",
      descricao: "Logs imutáveis de todas as ações. Você sabe exatamente quem fez o quê, quando."
    }
  ];

  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-white overflow-x-hidden">
        <MetaTags 
          title="Compliance LGPD - ConectaClínica"
          description="Conformidade total com LGPD, CFM e normas de proteção de dados em saúde"
          keywords="LGPD, compliance, segurança, CFM, proteção de dados"
        />
        <PublicHeader scrolled={scrolled} />
        
        <PublicHero 
          title="Compliance e Segurança" 
          subtitle="100% conforme LGPD, Resolução CFM e normas do setor de saúde"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mt-6" style={{ backgroundColor: 'rgba(52,168,83,0.15)', border: '1px solid rgba(52,168,83,0.3)' }}>
            <Shield className="w-5 h-5" style={{ color: 'var(--brand-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--brand-success)' }}>Certificado 100% LGPD</span>
          </div>
        </PublicHero>

        <section className="py-12 sm:py-16" style={{ backgroundColor: 'var(--brand-bg-secondary)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {garantias.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all"
                  style={{ borderColor: 'var(--brand-border-primary)' }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'var(--brand-primary-50)' }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--brand-text-primary)' }}>
                    {item.titulo}
                  </h3>
                  <p style={{ color: 'var(--brand-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                    {item.descricao}
                  </p>
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : blocos.length > 0 ? (
              <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-sm border space-y-8" style={{ borderColor: 'var(--brand-border-primary)' }}>
                {conteudoLegal?.metadata?.data_publicacao && (
                  <div className="flex items-center gap-4 text-sm pb-6 border-b" style={{ color: 'var(--brand-text-secondary)', borderColor: 'var(--brand-border-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Última atualização: {new Date(conteudoLegal.metadata.data_publicacao).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span>•</span>
                    <span>Versão {conteudoLegal.versao}</span>
                  </div>
                )}

                {blocos.filter(b => b.visivel).sort((a, b) => a.ordem - b.ordem).map(bloco => (
                  <div key={bloco.id}>
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--brand-text-primary)' }}>{bloco.titulo}</h2>
                    <div
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: bloco.conteudo_html }}
                      style={{ color: 'var(--brand-text-primary)' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 max-w-4xl mx-auto">
                <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--brand-text-disabled)' }} />
                <p style={{ color: 'var(--brand-text-secondary)', fontSize: '16px' }}>
                  Documentação completa em atualização
                </p>
              </div>
            )}
          </div>
        </section>
        
        <PublicFooter />
      </div>
    </PublicPageWrapper>
  );
}