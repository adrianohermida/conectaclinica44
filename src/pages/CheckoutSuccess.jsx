import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect após 5s
    const timer = setTimeout(() => {
      navigate(createPageUrl('OnboardingClinica'));
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Pagamento Confirmado!</h1>
        <p className="text-gray-600 mb-8">
          Sua assinatura foi ativada com sucesso. Vamos configurar sua clínica agora.
        </p>
        <Button
          onClick={() => navigate(createPageUrl('OnboardingClinica'))}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Continuar para Configuração
        </Button>
        <p className="text-sm text-gray-500 mt-4">Redirecionando automaticamente em 5 segundos...</p>
      </div>
    </div>
  );
}