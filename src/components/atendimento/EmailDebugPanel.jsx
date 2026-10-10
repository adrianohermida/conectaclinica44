import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Info } from "lucide-react";
import { toast } from "sonner";
import EmailSearchForm from "./EmailSearchForm";
import EmailResultsList from "./EmailResultsList";

export default function EmailDebugPanel() {
  const [emailBusca, setEmailBusca] = useState('');
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const buscarAtividade = async () => {
    if (!emailBusca.trim()) {
      toast.error('Digite um email para buscar');
      return;
    }

    setBuscando(true);
    try {
      const response = await base44.functions.invoke('searchSendGridActivity', {
        query: emailBusca,
        limit: 50
      });

      if (response.data.success) {
        setResultados(response.data.messages || []);
        toast.success(`✅ ${response.data.messages?.length || 0} mensagens encontradas`);
      } else {
        toast.error(response.data.error || 'Erro na busca');
        setResultados([]);
      }
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <EmailSearchForm
        emailBusca={emailBusca}
        setEmailBusca={setEmailBusca}
        onBuscar={buscarAtividade}
        buscando={buscando}
      />

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">SendGrid Activity Search</p>
            <p>Busca nos últimos 7 dias. Rastreia entregas, bounces, aberturas e spam reports.</p>
          </div>
        </div>
      </div>

      {resultados && (
        <EmailResultsList resultados={resultados} />
      )}
    </div>
  );
}