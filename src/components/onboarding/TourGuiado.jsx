import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

const passos = [
  {
    id: "bem-vindo",
    titulo: "Bem-vindo ao PrevenClin! 🎉",
    descricao: "Vamos fazer um tour rápido pelas principais funcionalidades do sistema.",
    posicao: "center"
  },
  {
    id: "dashboard",
    titulo: "Dashboard 📊",
    descricao: "Aqui você vê KPIs em tempo real: pacientes, consultas, receita e alertas críticos.",
    elemento: "dashboard",
    posicao: "bottom"
  },
  {
    id: "agenda",
    titulo: "Agenda 📅",
    descricao: "Gerencie agendamentos de consultas presenciais e telemedicina com calendário interativo.",
    elemento: "agenda",
    posicao: "bottom"
  },
  {
    id: "pacientes",
    titulo: "Pacientes 👥",
    descricao: "Cadastre e gerencie dados completos dos pacientes com histórico de interações.",
    elemento: "pacientes",
    posicao: "bottom"
  },
  {
    id: "prontuarios",
    titulo: "Prontuários Eletrônicos 📋",
    descricao: "Conforme CFM! Crie prontuários, prescrições digitais com assinatura ICP-Brasil.",
    elemento: "prontuarios",
    posicao: "bottom"
  },
  {
    id: "ia",
    titulo: "Análise com IA 🧠",
    descricao: "Diagnósticos assistidos, prescrição inteligente, análise de interações medicamentosas.",
    elemento: "analise-ia",
    posicao: "bottom"
  },
  {
    id: "estoque",
    titulo: "Estoque 📦",
    descricao: "Controle medicamentos com alertas de vencimento, código de barras e previsão de demanda.",
    elemento: "estoque",
    posicao: "bottom"
  },
  {
    id: "financeiro",
    titulo: "Financeiro 💰",
    descricao: "Gestão completa de vendas, contas a pagar/receber com dashboard de fluxo de caixa.",
    elemento: "financeiro",
    posicao: "bottom"
  },
  {
    id: "notificacoes",
    titulo: "Notificações 🔔",
    descricao: "Central unificada de alertas: estoque baixo, vencimentos, mensagens não lidas.",
    elemento: "notificacoes",
    posicao: "bottom"
  },
  {
    id: "final",
    titulo: "Tudo Pronto! ✅",
    descricao: "Explore o sistema! Acesse a Central de Ajuda se precisar de suporte.",
    posicao: "center"
  }
];

export default function TourGuiado({ onConcluir }) {
  const [passoAtual, setPassoAtual] = useState(0);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    verificarTour();
  }, []);

  const verificarTour = async () => {
    try {
      const user = await base44.auth.me();
      if (!user.tour_concluido) {
        setMostrar(true);
      }
    } catch (e) {
      // User not logged in
    }
  };

  const proximo = () => {
    if (passoAtual < passos.length - 1) {
      setPassoAtual(passoAtual + 1);
    } else {
      concluir();
    }
  };

  const anterior = () => {
    if (passoAtual > 0) {
      setPassoAtual(passoAtual - 1);
    }
  };

  const pular = () => {
    concluir();
  };

  const concluir = async () => {
    try {
      await base44.auth.updateMe({ tour_concluido: true });
      setMostrar(false);
      if (onConcluir) onConcluir();
    } catch (e) {
      console.error("Erro ao salvar tour:", e);
    }
  };

  if (!mostrar) return null;

  const passo = passos[passoAtual];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[200]" />

      {/* Tour Card */}
      <div className={`fixed z-[201] ${
        passo.posicao === "center" 
          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
          : "bottom-20 right-6"
      }`}>
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-[#0B7A9E]">
          <div className="bg-gradient-to-r from-[#0B7A9E] to-blue-600 p-6 rounded-t-xl">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <h3 className="text-xl font-bold text-white">{passo.titulo}</h3>
              </div>
              <button
                onClick={pular}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-blue-100 text-sm">
              Passo {passoAtual + 1} de {passos.length}
            </p>
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-6">{passo.descricao}</p>

            <div className="flex items-center justify-between">
              <button
                onClick={anterior}
                disabled={passoAtual === 0}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              <div className="flex gap-1">
                {passos.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx === passoAtual ? "bg-[#0B7A9E]" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={proximo}
                className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white px-4 py-2 rounded-lg flex items-center gap-1 font-medium"
              >
                {passoAtual === passos.length - 1 ? "Concluir" : "Próximo"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}