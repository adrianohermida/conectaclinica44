import React, { useState } from "react";
import { Upload, File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function FileUploadZone({ 
  onFileSelect, 
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxSize = 10 * 1024 * 1024, // 10MB
  label = "Arraste um arquivo ou clique para selecionar",
  uploading = false 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    setError(null);
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.size > maxSize) {
      setError(`Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    const extension = file.name.split(".").pop().toLowerCase();
    const acceptedExtensions = accept.split(",").map(ext => ext.trim().replace(".", ""));
    
    if (!acceptedExtensions.includes(extension) && !acceptedExtensions.includes("*")) {
      setError("Formato de arquivo não suportado");
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : error
            ? "border-red-300 bg-red-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input
          type="file"
          onChange={handleChange}
          accept={accept}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-sm text-blue-700 font-medium">Enviando documento...</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-gray-700 font-medium">{label}</p>
              <p className="text-xs text-gray-500">
                Formatos: {accept.replace(/\./g, "").toUpperCase()} • Máx: {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}