import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, FileSignature, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

export default function RecargaCreditos() {
  const [loading, setLoading] = useState(false);
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(100);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: creditos = [] } = useQuery({
    queryKey: ["creditos", user?.clinica_id],
    queryFn: () => base44.entities.CreditoAssinaturaDigital.filter({
      clinica_id: user.clinica_id,
      ativo: true
    }),
    enabled: !!user?.clinica_id
  });

  const totalDisponivel = creditos.reduce((sum, c) => 
    sum + (c.quantidade_adquirida - c.quantidade_utilizada), 0
  );

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('criarCheckoutCreditos', {
        quantidade: quantidadeSelecionada
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      toast.error(`Erro ao iniciar checkout: ${error.message}`);
      setLoading(false);
    }
  };

  const pacotes = [
    { creditos: 100, valor: 900, economiza: 0, popular: false },
    { creditos: 300, valor: 2400, economiza: 15, popular: true },
    { creditos: 500, valor: 3750, economiza: 20, popular: false },
  ];

  return (
    <RouteGuard requireAuth requireClinica>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Recarga de Créditos"
          description="Assinatura digital com certificado ICP-Brasil via Authentique"
          breadcrumbs={[
            { label: "Administração", href: "/Administracao" },
            { label: "Recarga de Créditos" }
          ]}
        />

        {/* Status Atual */}
        <Card className="mb-6 border-l-4 border-l-purple-500">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Saldo de Créditos
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-purple-600">{totalDisponivel}</p>
                <p className="text-sm text-gray-600">créditos disponíveis</p>
              </div>
              {totalDisponivel < 10 && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Saldo baixo
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* O que são créditos */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileSignature className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Como funcionam os créditos?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>1 crédito = 1 documento</strong> enviado para assinatura digital ICP-Brasil</li>
                  <li>• Validade jurídica plena (MP 2.200/2) com certificação Authentique</li>
                  <li>• Carimbo de tempo de Autoridade Certificadora reconhecida</li>
                  <li>• Rastreabilidade completa e prova irrefutável de autenticidade</li>
                  <li>• Créditos não expiram (válidos indefinidamente)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pacotes */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {pacotes.map(pacote => (
            <Card 
              key={pacote.creditos}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                quantidadeSelecionada === pacote.creditos ? 'border-2 border-purple-500' : ''
              } ${pacote.popular ? 'border-purple-300' : ''}`}
              onClick={() => setQuantidadeSelecionada(pacote.creditos)}
            >
              {pacote.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                  Mais Popular
                </Badge>
              )}
              <CardHeader>
                <h3 className="text-center">
                  <span className="text-3xl font-bold">{pacote.creditos}</span>
                  <span className="text-sm text-gray-600"> créditos</span>
                </h3>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-purple-600 mb-2">
                  R$ {(pacote.valor / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  R$ {(pacote.valor / pacote.creditos / 100).toFixed(2)} por crédito
                </p>
                {pacote.economiza > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    Economize {pacote.economiza}%
                  </Badge>
                )}
                {quantidadeSelecionada === pacote.creditos && (
                  <div className="mt-3">
                    <CheckCircle className="w-6 h-6 text-purple-600 mx-auto" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão Comprar */}
        <div className="text-center">
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="pc-btn-primary px-8 py-6 text-lg"
          >
            {loading ? (
              <>Redirecionando...</>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Comprar {quantidadeSelecionada} Créditos
              </>
            )}
          </Button>
          <p className="text-sm text-gray-600 mt-3">
            Pagamento seguro via Stripe • Cartão ou Boleto
          </p>
        </div>

        {/* Histórico */}
        {creditos.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Histórico de Recargas</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {creditos.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{c.quantidade_adquirida} créditos</p>
                      <p className="text-sm text-gray-600">
                        {new Date(c.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-600">
                        R$ {c.valor_pago?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {c.quantidade_adquirida - c.quantidade_utilizada} disponíveis
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  );
}