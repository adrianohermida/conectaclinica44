import React from "react";
import { HelpCircle, MessageSquare, Phone, Mail, Clock, Book, ExternalLink, FileText, Video } from "lucide-react";

export default function SuporteCompliance() {
  const recursos = [
    {
      titulo: "Documentação",
      descricao: "Guias completos sobre gestão de certidões e compliance",
      icon: Book,
      cor: "bg-blue-100 text-blue-600",
      link: "#"
    },
    {
      titulo: "Vídeos Tutoriais",
      descricao: "Aprenda a usar todas as funcionalidades do módulo",
      icon: Video,
      cor: "bg-purple-100 text-purple-600",
      link: "#"
    },
    {
      titulo: "FAQ",
      descricao: "Perguntas frequentes sobre o sistema de compliance",
      icon: HelpCircle,
      cor: "bg-green-100 text-green-600",
      link: "#"
    },
    {
      titulo: "Modelos de Certidões",
      descricao: "Templates e exemplos de documentos",
      icon: FileText,
      cor: "bg-orange-100 text-orange-600",
      link: "#"
    }
  ];

  const faqItems = [
    {
      pergunta: "Como configurar consultas automáticas de certidões?",
      resposta: "Acesse a aba 'Agendamentos' e clique em 'Novo Agendamento'. Selecione a certidão, defina a frequência e horário desejados, e configure as notificações por e-mail."
    },
    {
      pergunta: "Como carregar um certificado digital A1?",
      resposta: "Na aba 'Certificados Digitais', clique em 'Novo Certificado', selecione o tipo A1 e faça upload do arquivo .pfx. O certificado será armazenado de forma segura."
    },
    {
      pergunta: "Como configurar alertas de vencimento?",
      resposta: "Acesse a aba 'Regras de Alerta' e crie uma nova regra de vencimento. Defina os dias de antecedência e os e-mails que receberão as notificações."
    },
    {
      pergunta: "Como exportar relatório de certidões?",
      resposta: "Na lista de certidões, clique no botão 'Excel' para exportar todas as certidões filtradas em formato CSV compatível com Excel."
    },
    {
      pergunta: "Quais tipos de certificado digital são suportados?",
      resposta: "O sistema suporta certificados A1 (arquivo .pfx/.p12) e A3 (Token USB, Smartcard ou HSM). Configure o tipo adequado ao cadastrar o certificado."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Horário de Suporte */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-900">Suporte Básico Online (8x5)</h3>
            <p className="text-blue-800 mt-1">Segunda a Sexta, das 08:00 às 18:00 (horário de Brasília)</p>
            <div className="flex flex-wrap gap-4 mt-4">
              <a href="mailto:suporte@prevenclin.com.br" className="flex items-center gap-2 text-blue-700 hover:text-blue-900">
                <Mail className="w-4 h-4" />
                suporte@prevenclin.com.br
              </a>
              <a href="tel:+5592999999999" className="flex items-center gap-2 text-blue-700 hover:text-blue-900">
                <Phone className="w-4 h-4" />
                (92) 99999-9999
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recursos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recursos.map((recurso, idx) => (
          <a
            key={idx}
            href={recurso.link}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
          >
            <div className={`w-12 h-12 rounded-lg ${recurso.cor} flex items-center justify-center mb-4`}>
              <recurso.icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 mb-1 group-hover:text-[#0B7A9E]">{recurso.titulo}</h4>
            <p className="text-sm text-gray-600">{recurso.descricao}</p>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#0B7A9E]" />
          Perguntas Frequentes
        </h3>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <details key={idx} className="group">
              <summary className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 list-none">
                <span className="font-medium text-gray-800">{item.pergunta}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 text-gray-600 text-sm">
                {item.resposta}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Contato Direto */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#0B7A9E]" />
          Precisa de Ajuda?
        </h3>
        <p className="text-gray-600 mb-4">
          Nossa equipe está pronta para ajudar você com qualquer dúvida sobre o módulo de Compliance.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:suporte@prevenclin.com.br?subject=Suporte Compliance"
            className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Enviar E-mail
          </a>
          <a
            href="https://wa.me/5592999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}