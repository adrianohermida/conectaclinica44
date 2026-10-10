import React, { useState } from "react";
import { Smartphone, Monitor, AlertCircle } from "lucide-react";

/**
 * Preview VISUAL FIEL do Widget (cores, posição, logo)
 * NÃO é iframe funcional - apenas demonstração visual
 */
export default function WidgetPreview({ config }) {
  const [viewMode, setViewMode] = useState("desktop");
  
  const corPrimaria = config?.cor_primaria || "#7E57FF";
  const corSecundaria = config?.cor_secundaria || "#f5f3ff";
  const posicao = config?.posicao_widget || "inferior_direito";
  const mensagemBoasVindas = config?.mensagem_boas_vindas || "Olá! Como podemos ajudar?";
  const topicos = config?.topicos || [];

  return (
    <div className="space-y-4">
      {/* Aviso honesto */}
      <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: '#fef9e5', borderColor: '#fbbc04' }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#956802' }} />
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: '#956802' }}>
            Preview Visual (Não Funcional)
          </p>
          <p className="text-xs" style={{ color: '#5f6368' }}>
            Esta é uma representação visual. O widget real funciona apenas dentro do app por enquanto.
          </p>
        </div>
      </div>

      {/* Toggle Mobile/Desktop */}
      <div className="flex items-center justify-center gap-2 p-2 bg-gray-100 rounded-xl">
        <button
          onClick={() => setViewMode("mobile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-h-[44px] ${
            viewMode === "mobile" 
              ? "bg-white shadow-sm font-semibold" 
              : "hover:bg-gray-200"
          }`}
          style={{ color: viewMode === "mobile" ? corPrimaria : '#5f6368' }}
          aria-label="Visualizar em mobile"
        >
          <Smartphone className="w-4 h-4" />
          Mobile
        </button>
        <button
          onClick={() => setViewMode("desktop")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all min-h-[44px] ${
            viewMode === "desktop" 
              ? "bg-white shadow-sm font-semibold" 
              : "hover:bg-gray-200"
          }`}
          style={{ color: viewMode === "desktop" ? corPrimaria : '#5f6368' }}
          aria-label="Visualizar em desktop"
        >
          <Monitor className="w-4 h-4" />
          Desktop
        </button>
      </div>

      {/* Preview Container */}
      <div 
        className={`mx-auto rounded-2xl overflow-hidden shadow-xl transition-all relative ${
          viewMode === "mobile" 
            ? "w-[375px] h-[667px]" 
            : "w-full h-[600px]"
        }`}
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative'
        }}
      >
        {/* Demo Content */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm">
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#202124' }}>
              Seu Site Aqui
            </h2>
            <p className="text-sm" style={{ color: '#5f6368' }}>
              O widget aparecerá no canto configurado
            </p>
          </div>
        </div>

        {/* Widget Button Preview */}
        <div
          className={`absolute ${
            posicao === 'inferior_esquerdo' ? 'left-6 bottom-6' : 'right-6 bottom-6'
          } w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
          style={{ backgroundColor: corPrimaria }}
        >
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
            />
          </svg>
        </div>

        {/* Widget Modal Preview (Mobile) */}
        {viewMode === "mobile" && (
          <div className="absolute inset-0 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#e8eaed', borderTopWidth: '4px', borderTopColor: corPrimaria }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: corSecundaria }}>
                  <svg className="w-5 h-5" style={{ color: corPrimaria }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#202124' }}>Como podemos ajudar?</p>
                  <p className="text-xs" style={{ color: '#80868b' }}>Online agora</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-3 overflow-auto">
              <p className="text-sm mb-4" style={{ color: '#5f6368' }}>{mensagemBoasVindas}</p>
              {topicos.slice(0, 2).map((topico, idx) => (
                <div key={idx} className="p-4 rounded-xl border" style={{ borderColor: '#e8eaed' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: corSecundaria }}>
                      <svg className="w-5 h-5" style={{ color: corPrimaria }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#202124' }}>{topico.titulo}</p>
                      <p className="text-xs" style={{ color: '#80868b' }}>{topico.descricao}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-sm" style={{ color: '#5f6368' }}>
        Cores, posição e mensagens são aplicadas em tempo real
      </p>
    </div>
  );
}