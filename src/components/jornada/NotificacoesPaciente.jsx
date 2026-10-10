import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificacoesPaciente({ jornada }) {
  const [enviando, setEnviando] = useState(false);
  const [tipoNotificacao, setTipoNotificacao] = useState("proxima_acao");

  const enviarNotificacao = async () => {
    setEnviando(true);
    try {
      const paciente = await base44.entities.Paciente.filter({ nome_completo: jornada.paciente_nome });
      
      if (!paciente[0]?.email) {
        alert("Paciente não possui email cadastrado");
        return;
      }

      let assunto = "";
      let corpo = "";

      switch (tipoNotificacao) {
        case "proxima_acao":
          assunto = "Próxima Etapa do seu Tratamento";
          corpo = `Olá ${jornada.paciente_nome},\n\nEsta é uma lembrança sobre a próxima etapa do seu tratamento:\n\n${jornada.proxima_acao || "Aguardando definição"}\n\nQualquer dúvida, entre em contato conosco.\n\nEquipe PrevenClin`;
          break;
        case "exame":
          assunto = "Lembrete: Exames Solicitados";
          corpo = `Olá ${jornada.paciente_nome},\n\nLembramos que você possui exames solicitados para realizar.\n\nPor favor, agende seus exames e traga os resultados na próxima consulta.\n\nEquipe PrevenClin`;
          break;
        case "retorno":
          assunto = "Agende seu Retorno";
          corpo = `Olá ${jornada.paciente_nome},\n\nEstá na hora de agendar seu retorno para acompanhamento do tratamento.\n\nEntre em contato conosco para marcar sua consulta.\n\nEquipe PrevenClin`;
          break;
      }

      await base44.integrations.Core.SendEmail({
        to: paciente[0].email,
        subject: assunto,
        body: corpo
      });

      alert("✅ Notificação enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar:", error);
      alert("Erro ao enviar notificação");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-800">Notificações Automáticas</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Notificação</label>
          <select
            value={tipoNotificacao}
            onChange={(e) => setTipoNotificacao(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2"
          >
            <option value="proxima_acao">Próxima Ação/Etapa</option>
            <option value="exame">Lembrete de Exames</option>
            <option value="retorno">Agendamento de Retorno</option>
          </select>
        </div>

        <button
          onClick={enviarNotificacao}
          disabled={enviando}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {enviando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Enviar Notificação
            </>
          )}
        </button>

        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-800">
              <p className="font-medium mb-1">Notificações Automáticas Ativas</p>
              <ul className="space-y-1">
                <li>✓ Email automático 3 dias antes da consulta</li>
                <li>✓ SMS no dia do retorno agendado</li>
                <li>✓ Lembrete de exames após 7 dias</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}