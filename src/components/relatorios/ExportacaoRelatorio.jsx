import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

export default function ExportacaoRelatorio({ dados, titulo, colunas, tipo = "financeiro" }) {
  const [exportando, setExportando] = useState(false);

  const exportarCSV = () => {
    const headers = colunas.map(c => c.label).join(",");
    const rows = dados.map(item => 
      colunas.map(col => {
        const valor = item[col.key];
        if (typeof valor === "number") return valor.toFixed(2);
        return `"${valor || ""}"`;
      }).join(",")
    ).join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${titulo}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportarPDF = () => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(titulo, 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 30);
      
      let y = 45;
      doc.setFontSize(12);
      colunas.forEach((col, idx) => {
        doc.text(col.label, 20 + (idx * 45), y);
      });
      
      y += 10;
      doc.setFontSize(10);
      
      dados.slice(0, 30).forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        colunas.forEach((col, idx) => {
          const valor = item[col.key];
          const texto = typeof valor === "number" ? valor.toFixed(2) : (valor || "-");
          doc.text(String(texto).substring(0, 15), 20 + (idx * 45), y);
        });
        
        y += 8;
      });

      doc.save(`${titulo}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (e) {
      alert("Erro ao gerar PDF");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportarCSV}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel/CSV
      </button>
      <button
        onClick={exportarPDF}
        disabled={exportando}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
      >
        <FileText className="w-4 h-4" />
        {exportando ? "Gerando..." : "PDF"}
      </button>
    </div>
  );
}