import React, { useState } from "react";
import { FileText, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

export default function ModelosRelatorios({ prontuario, paciente, clinica }) {
  const [gerando, setGerando] = useState(false);

  const gerarRelatorio = (tipo) => {
    setGerando(true);
    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      // P0 FIX: cabeçalho com nome da clínica atual — sem hardcode de marca
      doc.text(clinica?.nome || "Clínica", 20, 20);
      doc.setFontSize(10);
      if (clinica?.cidade && clinica?.uf) {
        doc.text(`${clinica.cidade} - ${clinica.uf}`, 20, 28);
      }
      
      // Título do Relatório
      doc.setFontSize(16);
      const titulos = {
        evolucao: "Relatório de Evolução do Paciente",
        consulta: "Relatório de Consulta Médica",
        exames: "Sumário de Exames e Resultados",
        tratamento: "Plano de Tratamento e Acompanhamento"
      };
      doc.text(titulos[tipo], 20, 45);
      
      // Dados do Paciente
      doc.setFontSize(12);
      doc.text("Dados do Paciente", 20, 60);
      doc.setFontSize(10);
      doc.text(`Nome: ${prontuario.paciente_nome}`, 20, 68);
      doc.text(`Data: ${format(new Date(prontuario.data_atendimento), "dd/MM/yyyy")}`, 20, 75);
      doc.text(`Médico: Dr(a). ${prontuario.medico_nome} - CRM ${prontuario.medico_crm}`, 20, 82);
      
      let y = 95;
      
      // Conteúdo específico por tipo
      if (tipo === "evolucao") {
        doc.setFontSize(12);
        doc.text("Evolução Clínica", 20, y);
        y += 8;
        doc.setFontSize(10);
        
        const evolucao = `
Queixa: ${prontuario.queixa_principal || "Não informado"}

História: ${prontuario.historia_doenca_atual || "Não informado"}

Diagnóstico: ${prontuario.hipotese_diagnostica || "Não informado"}

Conduta: ${prontuario.conduta || "Não informado"}
        `.trim();
        
        const linhas = doc.splitTextToSize(evolucao, 170);
        doc.text(linhas, 20, y);
        
      } else if (tipo === "consulta") {
        doc.setFontSize(12);
        doc.text("Consulta Médica", 20, y);
        y += 8;
        doc.setFontSize(10);
        
        doc.text(`Tipo: ${prontuario.tipo_atendimento}`, 20, y);
        y += 7;
        doc.text(`Motivo: ${prontuario.motivo_consulta || "Não informado"}`, 20, y);
        y += 10;
        
        doc.setFontSize(11);
        doc.text("Exame Físico:", 20, y);
        y += 7;
        doc.setFontSize(10);
        if (prontuario.exame_fisico) {
          doc.text(`PA: ${prontuario.exame_fisico.pressao_arterial || "-"} | FC: ${prontuario.exame_fisico.frequencia_cardiaca || "-"} | Temp: ${prontuario.exame_fisico.temperatura || "-"}`, 20, y);
          y += 7;
          doc.text(`Peso: ${prontuario.exame_fisico.peso || "-"} kg | Altura: ${prontuario.exame_fisico.altura || "-"} cm`, 20, y);
        }
      }
      
      // Rodapé
      doc.setFontSize(8);
      doc.text("Documento gerado eletronicamente", 20, 280);
      doc.text(`Hash: ${prontuario.assinatura_digital?.hash || "N/A"}`, 20, 285);
      
      // Download
      doc.save(`relatorio_${tipo}_${prontuario.paciente_nome}_${format(new Date(), "yyyyMMdd")}.pdf`);
      
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório");
    } finally {
      setGerando(false);
    }
  };

  const modelos = [
    {
      tipo: "evolucao",
      titulo: "Relatório de Evolução",
      descricao: "Acompanhamento da evolução clínica do paciente",
      icon: FileText,
      cor: "bg-blue-50 border-blue-200 text-blue-700"
    },
    {
      tipo: "consulta",
      titulo: "Relatório de Consulta",
      descricao: "Resumo completo da consulta médica",
      icon: FileText,
      cor: "bg-green-50 border-green-200 text-green-700"
    },
    {
      tipo: "exames",
      titulo: "Sumário de Exames",
      descricao: "Compilação de resultados de exames",
      icon: FileText,
      cor: "bg-purple-50 border-purple-200 text-purple-700"
    },
    {
      tipo: "tratamento",
      titulo: "Plano de Tratamento",
      descricao: "Relatório detalhado do plano terapêutico",
      icon: FileText,
      cor: "bg-orange-50 border-orange-200 text-orange-700"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-1">📄 Modelos de Relatórios</h3>
        <p className="text-sm text-blue-800">
          Gere relatórios personalizados por especialidade com assinatura digital
        </p>
      </div>

      <div className="grid gap-3">
        {modelos.map((modelo) => {
          const Icon = modelo.icon;
          return (
            <div key={modelo.tipo} className={`rounded-lg p-4 border ${modelo.cor}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-800">{modelo.titulo}</h4>
                    <p className="text-sm text-gray-600 mt-1">{modelo.descricao}</p>
                  </div>
                </div>
                <button
                  onClick={() => gerarRelatorio(modelo.tipo)}
                  disabled={gerando}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
        <p className="text-xs text-green-800">
          ✅ Todos os relatórios incluem assinatura digital e são compatíveis com arquivamento conforme CFM
        </p>
      </div>
    </div>
  );
}