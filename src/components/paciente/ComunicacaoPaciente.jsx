import React from "react";
import { Button } from "@/components/ui/Button";
import { MessageSquare, Headphones, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function ComunicacaoPaciente({ contato }) {
  const abrirChat = () => {
    toast.info("Chat será aberto em breve");
  };

  const criarTicket = () => {
    window.location.href = `${createPageUrl("Helpdesk")}?novo=true&contato_id=${contato.id}&contato_nome=${contato.nome_completo}`;
  };

  const ligarTelefone = () => {
    if (contato.telefone) {
      window.open(`tel:${contato.telefone}`, "_self");
    } else {
      toast.error("Paciente sem telefone cadastrado");
    }
  };

  const enviarEmail = () => {
    if (contato.email) {
      window.open(`mailto:${contato.email}`, "_self");
    } else {
      toast.error("Paciente sem email cadastrado");
    }
  };

  const canais = [
    {
      icon: MessageSquare,
      titulo: "Chat Interno",
      descricao: "Conversar diretamente com o paciente pelo chat",
      onClick: abrirChat,
      disabled: false,
      bgColor: "#f5f3ff",
      iconColor: "#7E57FF"
    },
    {
      icon: Headphones,
      titulo: "Abrir Ticket",
      descricao: "Criar chamado de suporte para o paciente",
      onClick: criarTicket,
      disabled: false,
      bgColor: "#f5f3ff",
      iconColor: "#7E57FF"
    },
    {
      icon: Phone,
      titulo: "Ligar",
      descricao: contato.telefone || "Telefone não cadastrado",
      onClick: ligarTelefone,
      disabled: !contato.telefone,
      bgColor: "#e6f7ed",
      iconColor: "#34a853"
    },
    {
      icon: Mail,
      titulo: "Email",
      descricao: contato.email || "Email não cadastrado",
      onClick: enviarEmail,
      disabled: !contato.email,
      bgColor: "#fef9e5",
      iconColor: "#fbbc04"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: "#202124" }}>Canais de Comunicação</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {canais.map((canal, idx) => {
          const Icon = canal.icon;
          return (
            <button
              key={idx}
              onClick={canal.onClick}
              disabled={canal.disabled}
              className="pc-card p-5 text-left hover:pc-card-elevated transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                borderColor: canal.disabled ? '#e8eaed' : '#dadce0'
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: canal.bgColor }}
                >
                  <Icon className="w-6 h-6" style={{ color: canal.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base mb-1" style={{ color: "#202124" }}>{canal.titulo}</h4>
                  <p className="text-sm break-words" style={{ color: "#5f6368" }}>{canal.descricao}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pc-card p-4" style={{ backgroundColor: "#fef9e5", borderColor: "#fbbc04" }}>
        <p className="text-sm" style={{ color: "#956802" }}>
          <strong>Dica:</strong> Mantenha registro de todas as comunicações com o paciente para histórico e compliance.
        </p>
      </div>
    </div>
  );
}