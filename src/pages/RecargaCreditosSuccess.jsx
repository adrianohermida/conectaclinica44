import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import confetti from "canvas-confetti";

export default function RecargaCreditosSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pagamento Confirmado!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Seus créditos foram adicionados com sucesso. 
          Você já pode utilizar assinatura digital ICP-Brasil.
        </p>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-purple-700">
            <Zap className="w-5 h-5" />
            <span className="font-semibold">Créditos processados</span>
          </div>
          <p className="text-sm text-purple-600 mt-2">
            Aguarde até 2 minutos para os créditos aparecerem no seu saldo
          </p>
        </div>

        <Button
          onClick={() => navigate(createPageUrl("Administracao"))}
          className="pc-btn-primary w-full"
        >
          Voltar para Administração
        </Button>
      </div>
    </div>
  );
}