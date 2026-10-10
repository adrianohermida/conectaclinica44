import React, { useState, useEffect } from "react";
import { X, Download, FileText, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DocumentViewer({ item, onClose, onEdit }) {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const isPDF = item.tipo_arquivo === 'pdf';
  const isDOCX = item.tipo_arquivo === 'docx';
  const isHTML = item.tipo_arquivo === 'html';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(item.tipo_arquivo?.toLowerCase());
  const isText = ['txt', 'csv'].includes(item.tipo_arquivo?.toLowerCase());

  useEffect(() => {
    if (isText) {
      fetch(item.arquivo_url)
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [item]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-gray-900 px-4 py-3 rounded-t">
          <h3 className="text-white font-bold text-lg truncate flex-1">{item.titulo}</h3>
          <div className="flex gap-2 ml-4">
            {isHTML && onEdit && (
              <Button onClick={() => onEdit(item)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            <Button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = item.arquivo_url;
                link.download = item.titulo;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-b overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          ) : isPDF ? (
            <iframe
              src={`${item.arquivo_url}#view=FitH&toolbar=1&navpanes=1`}
              className="w-full h-full border-0"
              title={item.titulo}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full bg-gray-100 p-4">
              <img 
                src={item.arquivo_url} 
                alt={item.titulo}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<p class="text-red-600">Erro ao carregar imagem</p>';
                }}
              />
            </div>
          ) : isHTML ? (
            <iframe
              src={item.arquivo_url}
              className="w-full h-full border-0"
              title={item.titulo}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : isText ? (
            <pre className="p-6 overflow-auto h-full text-sm font-mono bg-gray-50">{content}</pre>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Visualização não disponível</p>
                <Button onClick={() => window.open(item.arquivo_url, '_blank')}>
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}