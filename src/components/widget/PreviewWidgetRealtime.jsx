import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Bot, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Preview real-time do widget - Atualiza conforme config muda
 */
export default function PreviewWidgetRealtime({ config = {} }) {
  const [isOpen, setIsOpen] = useState(true);
  const [mensagens] = useState([
    { role: 'assistant', content: config.mensagem_boas_vindas || "Olá! Como posso ajudar?" }
  ]);

  const corPrimaria = config.cor_primaria || '#7E57FF';
  const corSecundaria = config.cor_secundaria || '#f5f3ff';

  return (
    <div className="relative w-full h-[500px] bg-gray-100 rounded-2xl overflow-hidden" style={{ 
      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'%23f5f5f5\'/%3E%3Cpath d=\'M10 0v20M0 10h20\' stroke=\'%23e5e5e5\' stroke-width=\'0.5\'/%3E%3C/svg%3E")'
    }}>
      {/* Launcher Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
            style={{ backgroundColor: corPrimaria }}
            onClick={() => setIsOpen(true)}
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 right-6 w-[min(320px,calc(100%-48px))] h-[400px] bg-white rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-3 rounded-t-2xl flex items-center justify-between" style={{ backgroundColor: corPrimaria }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {config.logo_url ? (
                    <img src={config.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-white text-sm">
                      {config.titulo || 'Atendimento'}
                    </p>
                    {config.ia_ativa && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-yellow-400 text-yellow-900 flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />
                        IA
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/80">Online agora</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ backgroundColor: '#F4F7FA' }}>
              {mensagens.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-start gap-2 max-w-[85%]">
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: corSecundaria }}>
                        <Bot className="w-3 h-3" style={{ color: corPrimaria }} />
                      </div>
                    )}
                    <div 
                      className="px-3 py-2 rounded-xl text-xs"
                      style={msg.role === 'user' 
                        ? { backgroundColor: corPrimaria, color: 'white' }
                        : { backgroundColor: 'white', border: '1px solid #e8eaed' }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t" style={{ borderColor: '#e8eaed' }}>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 rounded-full border text-xs"
                  style={{ borderColor: '#e8eaed' }}
                  disabled
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <Send className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}