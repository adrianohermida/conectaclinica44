import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const priceId = params.get('plan');

    if (!priceId) {
      setError('Plano não especificado');
      return;
    }

    // Auto-redirect to Stripe Checkout
    handleCheckout(priceId);
  }, []);

  const handleCheckout = async (priceId) => {
    try {
      setLoading(true);
      const { data } = await base44.functions.invoke('createStripeCheckout', {
        price_id: priceId,
        success_url: `${window.location.origin}${createPageUrl('CheckoutSuccess')}`,
        cancel_url: `${window.location.origin}${createPageUrl('PlanosPrecos')}`
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      console.error('Erro no checkout:', err);
      setError(err.message || 'Erro ao processar pagamento');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {error ? (
          <>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Erro no Checkout</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(createPageUrl('PlanosPrecos'))}>
              Voltar para Planos
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processando...</h2>
            <p className="text-gray-600">Redirecionando para pagamento seguro</p>
          </>
        )}
      </div>
    </div>
  );
}