import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Lock, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function UploadCertificadoDigital({ onCertificadoLido }) {
  const [arquivo, setArquivo] = useState(null);
  const [senha, setSenha] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleUpload = async () => {
    if (!arquivo || !senha) {
      setErro("Selecione um certificado e informe a senha");
      return;
    }

    setProcessando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append('certificate', arquivo);
      formData.append('password', senha);

      const response = await base44.functions.invoke('lerCertificadoDigital', formData);

      if (response.data.success) {
        onCertificadoLido(response.data.certificado);
        setArquivo(null);
        setSenha("");
      } else {
        setErro(response.data.error || "Erro ao processar certificado");
      }
    } catch (error) {
      setErro(error.message || "Erro ao processar certificado");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-4">
      <h4 className="font-bold text-blue-900 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Carregar Certificado Digital (.pfx / .p12)
      </h4>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Arquivo do Certificado
        </label>
        <input
          type="file"
          accept=".pfx,.p12"
          onChange={(e) => setArquivo(e.target.files[0])}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
        />
        {arquivo && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {arquivo.name}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Senha do Certificado
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha"
            className="pl-10"
          />
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      <Button
        type="button"
        onClick={handleUpload}
        disabled={processando || !arquivo || !senha}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {processando ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Ler Certificado
          </>
        )}
      </Button>

      <p className="text-xs text-gray-600">
        O certificado será lido de forma segura. Os dados serão extraídos e preenchidos automaticamente.
      </p>
    </div>
  );
}