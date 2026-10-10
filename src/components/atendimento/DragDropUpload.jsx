import React, { useState, useCallback } from "react";
import { Upload, X, File, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DragDropUpload({ onFilesUploaded, maxFiles = 5, maxSizeMB = 10 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFiles = (fileList) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles = [];
    const errors = [];

    Array.from(fileList).forEach((file) => {
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Máximo de ${maxFiles} arquivos permitidos`);
        return;
      }
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name} excede ${maxSizeMB}MB`);
        return;
      }
      validFiles.push(file);
    });

    return { validFiles, errors };
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const { validFiles, errors } = validateFiles(e.dataTransfer.files);
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files.length, maxFiles, maxSizeMB]);

  const handleFileInput = useCallback((e) => {
    const { validFiles, errors } = validateFiles(e.target.files);
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files.length, maxFiles, maxSizeMB]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("Selecione pelo menos um arquivo");
      return;
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      // Upload em lote otimizado
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        uploadedUrls.push({
          nome: file.name,
          url: file_url,
          tipo: file.type,
          tamanho: file.size
        });

        setUploadProgress(prev => ({ ...prev, [i]: 100 }));
      }

      toast.success(`✅ ${uploadedUrls.length} arquivo(s) enviado(s)!`);
      onFilesUploaded(uploadedUrls);
      setFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer ${
          isDragging
            ? "border-[#7E57FF] bg-[#f5f3ff]"
            : "border-gray-300 hover:border-[#7E57FF] hover:bg-gray-50"
        }`}
        onClick={() => document.getElementById('file-input-upload').click()}
      >
        <input
          id="file-input-upload"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
        
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#7E57FF]' : 'text-gray-400'}`} />
          <p className="text-base font-medium text-gray-900 mb-1">
            Arraste arquivos ou clique para selecionar
          </p>
          <p className="text-sm text-gray-500">
            Até {maxFiles} arquivos • Máx. {maxSizeMB}MB cada
          </p>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {files.length} arquivo(s) selecionado(s)
            </p>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Limpar todos
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadProgress[idx] !== undefined && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full bg-[#7E57FF] transition-all"
                        style={{ width: `${uploadProgress[idx]}%` }}
                      />
                    </div>
                  )}
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#7E57FF] text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando {files.length} arquivo(s)...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar {files.length} arquivo(s)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}