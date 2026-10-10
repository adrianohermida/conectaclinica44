import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Brain, CheckCircle2, ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function OnboardingSecretariaIA() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    nome_agente: "Clara",
    avatar_url: "",
    personalidade: "profissional",
    faqs: [
      { pergunta: "", resposta: "" },
      { pergunta: "", resposta: "" },
      { pergunta: "", resposta: "" },
      { pergunta: "", resposta: "" },
      { pergunta: "", resposta: "" }
    ],
    instrucoes_customizadas: ""
  });
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState(null);
  const [testingIA, setTestingIA] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const criarAgenteMutation = useMutation({
    mutationFn: async () => {
      // Validar FAQs
      const faqsValidas = config.faqs.filter(f => f.pergunta && f.resposta);
      if (faqsValidas.length < 5) {
        throw new Error("Mínimo 5 FAQs obrigatórias para qualidade");
      }

      // Criar agente via backend function
      const response = await base44.functions.invoke('criarAgentePersonalizado', {
        clinica_id: user.clinica_id,
        nome_agente: config.nome_agente,
        personalidade: config.personalidade,
        faqs: faqsValidas,
        instrucoes_customizadas: config.instrucoes_customizadas
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("Secretária IA ativada com sucesso!");
      queryClient.invalidateQueries(['agente-ia']);
      setTimeout(() => navigate('/ConfiguracaoAgenteIA'), 1500);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const testarIA = async () => {
    if (!testMessage.trim()) return;
    
    setTestingIA(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é ${config.nome_agente}, assistente virtual de clínica médica. Personalidade: ${config.personalidade}.
        
Base de conhecimento:
${config.faqs.filter(f => f.pergunta && f.resposta).map(f => `P: ${f.pergunta}\nR: ${f.resposta}`).join('\n\n')}

Pergunta do paciente: ${testMessage}

Responda de forma ${config.personalidade}, clara e empática.`,
        add_context_from_internet: false
      });
      
      setTestResponse(response);
    } catch (error) {
      toast.error("Erro ao testar IA");
    } finally {
      setTestingIA(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                s <= step ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <CheckCircle2 className="w-6 h-6" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-24 h-1 ${s < step ? 'bg-purple-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="pc-card p-8">
          {/* Step 1: Nome e Personalidade */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Brain className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Configure sua Secretária IA
                </h1>
                <p className="text-gray-600">
                  Em 3 passos, sua clínica terá atendimento 24/7
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Assistente
                </label>
                <Input
                  value={config.nome_agente}
                  onChange={(e) => setConfig({...config, nome_agente: e.target.value})}
                  placeholder="Ex: Clara, Dra. Ana, etc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personalidade
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['profissional', 'caloroso', 'tecnico'].map(p => (
                    <button
                      key={p}
                      onClick={() => setConfig({...config, personalidade: p})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        config.personalidade === p
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium capitalize">{p}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!config.nome_agente}
                className="w-full"
              >
                Próximo: Base de Conhecimento <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: FAQs */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Base de Conhecimento
                </h2>
                <p className="text-gray-600">
                  Mínimo 5 perguntas/respostas para garantir qualidade
                </p>
              </div>

              <div className="space-y-4">
                {config.faqs.map((faq, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">FAQ {i + 1}</p>
                    <Input
                      placeholder="Pergunta frequente"
                      value={faq.pergunta}
                      onChange={(e) => {
                        const newFaqs = [...config.faqs];
                        newFaqs[i].pergunta = e.target.value;
                        setConfig({...config, faqs: newFaqs});
                      }}
                      className="mb-2"
                    />
                    <textarea
                      placeholder="Resposta clara e completa"
                      value={faq.resposta}
                      onChange={(e) => {
                        const newFaqs = [...config.faqs];
                        newFaqs[i].resposta = e.target.value;
                        setConfig({...config, faqs: newFaqs});
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={config.faqs.filter(f => f.pergunta && f.resposta).length < 5}
                  className="flex-1"
                >
                  Testar IA <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Teste */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Teste sua Secretária IA
                </h2>
                <p className="text-gray-600">
                  Faça uma pergunta para validar as respostas
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Quais são os horários de atendimento?"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && testarIA()}
                    />
                    <Button onClick={testarIA} disabled={testingIA}>
                      {testingIA ? "..." : "Testar"}
                    </Button>
                  </div>
                  
                  {testResponse && (
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm font-medium text-purple-600 mb-2">{config.nome_agente}:</p>
                      <p className="text-gray-700">{testResponse}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Voltar
                </Button>
                <Button
                  onClick={() => criarAgenteMutation.mutate()}
                  disabled={criarAgenteMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {criarAgenteMutation.isPending ? "Ativando..." : "✓ Ativar Secretária IA"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}