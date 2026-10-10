import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, CheckCircle, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function UploadCertidaoAprimorado({ onArquivosProcessados, multiplo = true }) {
  const [arquivos, setArquivos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const validarArquivo = (file) => {
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const tamanhoMaximo = 10 * 1024 * 1024; // 10MB

    if (!tiposPermitidos.includes(file.type)) {
      return { valido: false, erro: `Tipo de arquivo não suportado. Use PDF, JPG ou PNG.` };
    }

    if (file.size > tamanhoMaximo) {
      return { valido: false, erro: `Arquivo muito grande. Tamanho máximo: 10MB` };
    }

    return { valido: true };
  };

  const processarArquivo = async (file, index) => {
    const validacao = validarArquivo(file);
    
    if (!validacao.valido) {
      setArquivos(prev => prev.map((arq, i) => 
        i === index ? { ...arq, status: 'erro', erro: validacao.erro } : arq
      ));
      return;
    }

    try {
      // Upload
      setArquivos(prev => prev.map((arq, i) => 
        i === index ? { ...arq, status: 'uploading', progresso: 30 } : arq
      ));

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setArquivos(prev => prev.map((arq, i) => 
        i === index ? { ...arq, status: 'processing', progresso: 60, url: file_url } : arq
      ));

      // Processar com IA
      const response = await base44.functions.invoke('lerCertidaoPDF', { file_url });

      if (response.data.success && response.data.dados) {
        setArquivos(prev => prev.map((arq, i) => 
          i === index ? { 
            ...arq, 
            status: 'completo', 
            progresso: 100, 
            dados: response.data.dados,
            url: file_url
          } : arq
        ));

        if (onArquivosProcessados) {
          onArquivosProcessados({
            arquivo_url: file_url,
            dados: response.data.dados
          });
        }
      } else {
        setArquivos(prev => prev.map((arq, i) => 
          i === index ? { 
            ...arq, 
            status: 'completo', 
            progresso: 100,
            url: file_url,
            dados: null
          } : arq
        ));

        if (onArquivosProcessados) {
          onArquivosProcessados({
            arquivo_url: file_url,
            dados: null
          });
        }
      }

    } catch (error) {
      setArquivos(prev => prev.map((arq, i) => 
        i === index ? { ...arq, status: 'erro', erro: error.message } : arq
      ));
    }
  };

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const novosArquivos = fileArray.map(file => ({
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      status: 'pendente',
      progresso: 0,
      file: file
    }));

    if (!multiplo && novosArquivos.length > 1) {
      alert("Apenas um arquivo pode ser enviado por vez");
      return;
    }

    setArquivos(prev => multiplo ? [...prev, ...novosArquivos] : novosArquivos);

    // Processar arquivos
    novosArquivos.forEach((arquivo, idx) => {
      const indexReal = multiplo ? arquivos.length + idx : idx;
      setTimeout(() => {
        processarArquivo(arquivo.file, indexReal);
      }, idx * 500);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
  };

  const removerArquivo = (index) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const formatarTamanho = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Zona de Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging 
            ? 'border-[#0B7A9E] bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input
          type="file"
          onChange={handleFileInput}
          className="hidden"
          id="upload-certidao-input"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple={multiplo}
        />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-700 mb-1">
          <label htmlFor="upload-certidao-input" className="text-[#0B7A9E] hover:underline cursor-pointer font-medium">
            Clique para selecionar
          </label>
          {' '}ou arraste {multiplo ? 'arquivos' : 'o arquivo'} aqui
        </p>
        <p className="text-xs text-gray-500">PDF, JPG, JPEG ou PNG • Máx. 10MB</p>
        {multiplo && (
          <p className="text-xs text-blue-600 mt-2">✓ Suporta múltiplos arquivos</p>
        )}
      </div>

      {/* Lista de Arquivos */}
      {arquivos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">
            Arquivos ({arquivos.length})
          </h4>
          {arquivos.map((arquivo, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {/* Ícone de Status */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  arquivo.status === 'completo' ? 'bg-green-100' :
                  arquivo.status === 'erro' ? 'bg-red-100' :
                  'bg-blue-100'
                }`}>
                  {arquivo.status === 'completo' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : arquivo.status === 'erro' ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : arquivo.status === 'uploading' || arquivo.status === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                {/* Info do Arquivo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm truncate">{arquivo.nome}</p>
                      <p className="text-xs text-gray-500">{formatarTamanho(arquivo.tamanho)}</p>
                    </div>
                    {arquivo.status !== 'uploading' && arquivo.status !== 'processing' && (
                      <button
                        onClick={() => removerArquivo(index)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  {(arquivo.status === 'uploading' || arquivo.status === 'processing') && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">
                          {arquivo.status === 'uploading' ? 'Enviando...' : 'Processando com IA...'}
                        </span>
                        <span className="text-xs text-gray-600">{arquivo.progresso}%</span>
                      </div>
                      <Progress value={arquivo.progresso} className="h-1.5" />
                    </div>
                  )}

                  {/* Erro */}
                  {arquivo.status === 'erro' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-700">{arquivo.erro}</p>
                    </div>
                  )}

                  {/* Dados Extraídos */}
                  {arquivo.status === 'completo' && arquivo.dados && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs font-medium text-green-900 mb-2">✓ Dados extraídos automaticamente:</p>
                      <div className="space-y-1 text-xs text-green-800">
                        {arquivo.dados.titulo && <p>• Título: {arquivo.dados.titulo}</p>}
                        {arquivo.dados.numero_certidao && <p>• Número: {arquivo.dados.numero_certidao}</p>}
                        {arquivo.dados.orgao_emissor && <p>• Órgão: {arquivo.dados.orgao_emissor}</p>}
                        {arquivo.dados.data_validade && <p>• Validade: {arquivo.dados.data_validade}</p>}
                      </div>
                    </div>
                  )}

                  {/* Preview do PDF */}
                  {arquivo.status === 'completo' && arquivo.url && arquivo.tipo === 'application/pdf' && (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">Preview do PDF</p>
                        <a 
                          href={arquivo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-[#0B7A9E] hover:underline"
                        >
                          Abrir em nova aba
                        </a>
                      </div>
                      <iframe 
                        src={arquivo.url} 
                        className="w-full h-64 bg-gray-50"
                        title={`Preview: ${arquivo.nome}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instruções */}
      {arquivos.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Formatos aceitos:</strong> PDF, JPG, PNG<br/>
            <strong>Tamanho máximo:</strong> 10MB por arquivo<br/>
            {multiplo && <><strong>Múltiplos arquivos:</strong> Sim, envie vários de uma vez</>}
          </p>
        </div>
      )}
    </div>
  );
}