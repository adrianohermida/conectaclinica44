import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ChevronRight } from "lucide-react";

/**
 * Tour contextual por módulo
 * Exibe apenas na primeira vez que o usuário acessa o módulo
 */
export default function ModuleTour({ moduleName, steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkIfShouldShow = async () => {
      try {
        const user = await base44.auth.me();
        const users = await base44.entities.User.filter({ created_by: user.email });
        const userData = users[0];

        if (userData && (!userData.modulos_visitados || !userData.modulos_visitados.includes(moduleName))) {
          setShow(true);
        }
      } catch (e) {
        // User not logged in
      }
    };

    checkIfShouldShow();
  }, [moduleName]);

  const handleComplete = async () => {
    try {
      const user = await base44.auth.me();
      const users = await base44.entities.User.filter({ created_by: user.email });
      const userData = users[0];

      if (userData) {
        const visited = userData.modulos_visitados || [];
        await base44.entities.User.update(userData.id, {
          ...userData,
          modulos_visitados: [...visited, moduleName]
        });
      }

      setShow(false);
      onComplete?.();
    } catch (e) {
      console.error("Erro ao marcar tour como completo:", e);
    }
  };

  if (!show || !steps || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{step.title}</h3>
            <p className="text-sm text-gray-500 mt-1">Passo {currentStep + 1} de {steps.length}</p>
          </div>
          <button
            onClick={handleComplete}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">{step.description}</p>
          {step.image && (
            <img src={step.image} alt={step.title} className="rounded-lg border border-gray-200" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? "w-8 bg-[#0B7A9E]" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-medium px-6 py-2 rounded-lg flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}