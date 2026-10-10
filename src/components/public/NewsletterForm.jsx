import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, CheckCircle } from "lucide-react";

import { toast } from "sonner";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      await base44.entities.Newsletter.create({
        email,
        nome,
        origem: "footer",
        ativo: true
      });
      
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: "Bem-vindo à Newsletter ConectaClínica",
        body: `Olá${nome ? ' ' + nome : ''},\n\nObrigado por se inscrever na nossa newsletter!\n\nVocê receberá novidades, dicas e atualizações sobre gestão clínica, tecnologia médica e muito mais.\n\nEquipe ConectaClínica`
      });
      
      setSucesso(true);
      setEmail("");
      setNome("");
      toast.success("✅ Inscrição confirmada! Verifique seu email.");
      setTimeout(() => setSucesso(false), 5000);
    } catch (e) {
      toast.error("Erro ao inscrever. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-white font-semibold mb-6 text-base">Newsletter</h3>
      <p className="text-gray-400 text-sm mb-4">
        Receba atualizações e novidades
      </p>
      {sucesso ? (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          Email cadastrado!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu email"
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pr-12 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#7E57FF]"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-0 top-0 w-12 h-full flex items-center justify-center rounded-r-lg hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF' }}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </form>
      )}
    </div>
  );
}