import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Pill, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AlertasMedicacao({ plano, prontuarios }) {
  const alertas = useMemo(() => {
    const lista = [];
    const hoje = new Date();

    // Verificar medicamentos do plano
    if (plano.medicamentos && plano.medicamentos.length > 0) {
      plano.medicamentos.forEach((med) => {
        lista.push({
          tipo: "medicacao",
          prioridade: "importante",
          titulo: `Medicação: ${med}`,
          mensagem: "Verificar adesão do paciente ao tratamento medicamentoso",
          icone: Pill,
          cor: "blue"
        });
      });
    }

    // Verificar exames pendentes
    if (plano.exames_acompanhamento) {
      plano.exames_acompanhamento.forEach((exame) => {
        if (!exame.realizado && exame.proximo) {
          const diasRestantes = differenceInDays(new Date(exame.proximo), hoje);
          if (diasRestantes <= 7 && diasRestantes >= 0) {
            lista.push({
              tipo: "exame",
              prioridade: diasRestantes <= 3 ? "critico" : "importante",
              titulo: `Exame agendado: ${exame.exame}`,
              mensagem: `Faltam ${diasRestantes} dia(s) - ${format(new Date(exame.proximo), "dd/MM/yyyy", { locale: ptBR })}`,
              icone: Calendar,
              cor: diasRestantes <= 3 ? "red" : "orange"
            });
          }
        }
      });
    }

    // Verificar metas próximas do prazo
    if (plano.metas) {
      plano.metas.forEach((meta) => {
        if (!meta.alcancada && meta.prazo) {
          const diasRestantes = differenceInDays(new Date(meta.prazo), hoje);
          if (diasRestantes <= 14 && diasRestantes >= 0) {
            lista.push({
              tipo: "meta",
              prioridade: diasRestantes <= 7 ? "importante" : "informativo",
              titulo: `Meta próxima do prazo`,
              mensagem: `${meta.descricao} - Faltam ${diasRestantes} dia(s)`,
              icone: Clock,
              cor: diasRestantes <= 7 ? "orange" : "blue"
            });
          }
        }
      });
    }

    // Verificar se há tratamentos pendentes há muito tempo
    if (plano.tratamentos) {
      plano.tratamentos.forEach((trat) => {
        if (trat.status === "pendente" && trat.data_inicio) {
          const diasPendente = differenceInDays(hoje, new Date(trat.data_inicio));
          if (diasPendente > 7) {
            lista.push({
              tipo: "tratamento",
              prioridade: "importante",
              titulo: `Tratamento pendente: ${trat.tipo}`,
              mensagem: `Há ${diasPendente} dias sem iniciar`,
              icone: AlertTriangle,
              cor: "orange"
            });
          }
        }
      });
    }

    // Alertas de próxima consulta
    if (plano.proxima_consulta) {
      const diasProximaConsulta = differenceInDays(new Date(plano.proxima_consulta), hoje);
      if (diasProximaConsulta <= 3 && diasProximaConsulta >= 0) {
        lista.push({
          tipo: "consulta",
          prioridade: "informativo",
          titulo: "Próxima consulta agendada",
          mensagem: `${format(new Date(plano.proxima_consulta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
          icone: Calendar,
          cor: "blue"
        });
      }
    }

    // Alertas customizados do plano
    if (plano.alertas && plano.alertas.length > 0) {
      plano.alertas.forEach((alerta) => {
        lista.push({
          tipo: "custom",
          prioridade: "importante",
          titulo: "Alerta personalizado",
          mensagem: alerta,
          icone: Bell,
          cor: "purple"
        });
      });
    }

    return lista;
  }, [plano]);

  const coresAlerta = {
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "text-red-600" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "text-orange-600" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-600" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", icon: "text-purple-600" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-600" }
  };

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg p-6 border border-green-200 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="font-bold text-green-900 mb-1">✅ Tudo em Dia!</h3>
        <p className="text-sm text-green-800">
          Não há alertas ou pendências no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#0B7A9E]" />
          Central de Alertas ({alertas.length})
        </h3>
        <p className="text-sm text-gray-600">
          Notificações e lembretes do plano de tratamento
        </p>
      </div>

      {alertas.map((alerta, idx) => {
        const cores = coresAlerta[alerta.cor] || coresAlerta.blue;
        const Icone = alerta.icone;

        return (
          <div key={idx} className={`${cores.bg} rounded-lg p-4 border ${cores.border}`}>
            <div className="flex items-start gap-3">
              <Icone className={`w-5 h-5 ${cores.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <h4 className={`font-medium ${cores.text} mb-1`}>{alerta.titulo}</h4>
                <p className="text-sm text-gray-700">{alerta.mensagem}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}