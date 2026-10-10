import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, Upload, Eye, Download, Trash2, FileText, Image, File } from "lucide-react";
import { format } from "date-fns";

export default function AnexosReferencias({ colaboracao, onAtualizado }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo: 20MB");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const novosAnexos = [
        ...(colaboracao.documentos_anexados || []),
        {
          nome: file.name,
          url: file_url,
          tamanho: file.size,
          tipo: file.type,
          data: new Date().toISOString(),
          uploader: "Dr. Sistema"
        }
      ];

      await base44.entities.ColaboracaoMedica.update(colaboracao.id, {
        ...colaboracao,
        documentos_anexados: novosAnexos
      });

      alert("✅ Arquivo anexado com sucesso!");
      if (onAtualizado) onAtualizado();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao anexar arquivo");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removerAnexo = async (index) => {
    if (!confirm("Remover este anexo?")) return;

    const novosAnexos = colaboracao.documentos_anexados.filter((_, i) => i !== index);
    
    await base44.entities.ColaboracaoMedica.update(colaboracao.id, {
      ...colaboracao,
      documentos_anexados: novosAnexos
    });

    if (onAtualizado) onAtualizado();
  };

  const getIconeArquivo = (tipo) => {
    if (tipo?.includes("image")) return Image;
    if (tipo?.includes("pdf")) return FileText;
    return File;
  };

  const formatarTamanho = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const anexos = colaboracao.documentos_anexados || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Paperclip className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-1">📎 Anexos e Referências</h3>
            <p className="text-sm text-blue-800">
              Compartilhe exames, laudos, artigos científicos e outros documentos relevantes
            </p>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div>
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          id="file-upload-anexos"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload-anexos"
          className={`w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#0B7A9E] hover:bg-gray-50 transition-colors ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 text-center">
            {uploading ? "Enviando..." : "Clique para anexar arquivo"}
          </p>
          <p className="text-xs text-gray-500 mt-1">PDF, Imagens, Documentos (max 20MB)</p>
        </label>
      </div>

      {/* Lista de Anexos */}
      {anexos.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Nenhum anexo</p>
      ) : (
        <div className="space-y-2">
          <h4 className="font-bold text-gray-800 text-sm">Arquivos Anexados ({anexos.length})</h4>
          {anexos.map((anexo, idx) => {
            const Icone = getIconeArquivo(anexo.tipo);
            return (
              <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{anexo.nome}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{formatarTamanho(anexo.tamanho)}</span>
                      <span>•</span>
                      <span>{format(new Date(anexo.data), "dd/MM/yy HH:mm")}</span>
                      <span>•</span>
                      <span>{anexo.uploader}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <a
                    href={anexo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-50 hover:bg-blue-100 rounded text-blue-700"
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <a
                    href={anexo.url}
                    download
                    className="p-2 bg-green-50 hover:bg-green-100 rounded text-green-700"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => removerAnexo(idx)}
                    className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-700"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Indicador de Atividade */}
      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
          <p className="text-xs text-green-800">Sistema de notificações em tempo real ativo</p>
        </div>
      </div>
    </div>
  );
}