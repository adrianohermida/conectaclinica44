import React from "react";
import { FileText, Image, FlaskConical, Activity, Pill, Clipboard, FolderOpen } from "lucide-react";

export default function CategorizacaoInteligente({ documentos, onFiltrar }) {
  const categorias = [
    { 
      id: "todos", 
      nome: "Todos", 
      icon: FolderOpen, 
      cor: "bg-gray-100 text-gray-700",
      count: documentos.length 
    },
    { 
      id: "exame_sangue", 
      nome: "Exames de Sangue", 
      icon: FlaskConical, 
      cor: "bg-red-100 text-red-700",
      count: documentos.filter(d => d.tipo_documento === "exame_sangue").length
    },
    { 
      id: "exame_imagem", 
      nome: "Exames de Imagem", 
      icon: Image, 
      cor: "bg-blue-100 text-blue-700",
      count: documentos.filter(d => d.tipo_documento === "exame_imagem").length
    },
    { 
      id: "laudo_medico", 
      nome: "Laudos Médicos", 
      icon: FileText, 
      cor: "bg-purple-100 text-purple-700",
      count: documentos.filter(d => d.tipo_documento === "laudo_medico").length
    },
    { 
      id: "receita", 
      nome: "Receitas", 
      icon: Pill, 
      cor: "bg-green-100 text-green-700",
      count: documentos.filter(d => d.tipo_documento === "receita").length
    },
    { 
      id: "relatorio", 
      nome: "Relatórios", 
      icon: Clipboard, 
      cor: "bg-orange-100 text-orange-700",
      count: documentos.filter(d => d.tipo_documento === "relatorio").length
    }
  ];

  const categoriasComDocumentos = categorias.filter(c => c.id === "todos" || c.count > 0);

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-[#0B7A9E]" />
        Categorias Inteligentes
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoriasComDocumentos.map((categoria) => {
          const Icon = categoria.icon;
          return (
            <button
              key={categoria.id}
              onClick={() => onFiltrar(categoria.id)}
              className={`${categoria.cor} hover:shadow-md rounded-lg p-4 flex flex-col items-center gap-2 transition-all`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium text-center">{categoria.nome}</span>
              <span className="text-lg font-bold">{categoria.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}