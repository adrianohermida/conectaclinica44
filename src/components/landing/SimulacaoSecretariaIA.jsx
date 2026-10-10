import React, { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, Clock, Calendar, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SimulacaoSecretariaIA() {
  const [step, setStep] = useState(0);
  const [mostrarMensagens, setMostrarMensagens] = useState(true);

  const conversacao = [
    { 
      tipo: "paciente", 
      texto: "Olá! Gostaria de agendar uma consulta com o Dr. Silva.",
      avatar: "P"
    },
    { 
      tipo: "ia", 
      texto: "Olá! Claro, posso ajudar. Você prefere presencial ou telemedicina?",
      avatar: "IA"
    },
    { 
      tipo: "paciente", 
      texto: "Presencial, por favor. Quais horários disponíveis esta semana?",
      avatar: "P"
    },
    { 
      tipo: "ia", 
      texto: "Tenho: Terça 14h, Quarta 16h, Sexta 10h. Qual prefere?",
      avatar: "IA"
    },
    { 
      tipo: "paciente", 
      texto: "Quarta às 16h está ótimo!",
      avatar: "P"
    },
    { 
      tipo: "ia", 
      texto: "✅ Agendado! Dr. Silva - Quarta 16h. Você receberá confirmação por email e lembrete 24h antes.",
      avatar: "IA",
      final: true
    }
  ];

  useEffect(() => {
    if (!mostrarMensagens) return;

    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev >= conversacao.length - 1) {
          setTimeout(() => {
            setStep(0);
          }, 3000);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [mostrarMensagens]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold text-sm">Secretária Digital IA</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400">Online</span>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 h-96 overflow-y-auto space-y-3">
        <AnimatePresence mode="sync">
          {conversacao.slice(0, step + 1).map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${msg.tipo === 'ia' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.tipo === 'ia' ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  msg.tipo === 'ia' ? 'bg-purple-600 text-white' : 'bg-white/20 text-white'
                }`}>
                  {msg.avatar}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.tipo === 'ia' 
                    ? 'bg-white/90 text-gray-800' 
                    : 'bg-purple-600 text-white'
                }`}>
                  {msg.texto}
                  {msg.final && (
                    <div className="flex items-center gap-1 mt-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-semibold">Agendado</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-4 text-center text-xs text-white/60">
        Simulação de agendamento automático via WhatsApp
      </div>
    </div>
  );
}