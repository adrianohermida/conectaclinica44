import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, CheckCircle, Shield, AlertCircle, Loader2, Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UploadCertificadoDigitalSeguro({ onCertificadoSalvo }) {
  const [arquivo, setArquivo] = useState(null);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validExtensions = ['.pfx', '.p12'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setErro('Arquivo inválido. Use certificados .pfx ou .p12');
      setArquivo(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro('Arquivo muito grande. Tamanho máximo: 5MB');
      setArquivo(null);
      return;
    }

    setArquivo(file);
    setErro(null);
    setSucesso(false);
  };

  const processarCertificado = async () => {
    if (!arquivo || !senha) {
      setErro('Selecione um certificado e informe a senha');
      return;
    }

    setProcessando(true);
    setErro(null);

    try {
      // Ler arquivo como base64
      const reader = new FileReader();
      
      const certificadoBase64 = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const arrayBuffer = e.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          const base64 = btoa(String.fromCharCode(...bytes));
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(arquivo);
      });

      // Criptografar certificado e senha
      const responseCripto = await base44.functions.invoke('criptografarCertificado', {
        certificado_base64: certificadoBase64,
        senha: senha
      });

      if (!responseCripto.data.success) {
        throw new Error(responseCripto.data.error || 'Erro ao criptografar certificado');
      }

      const { pkcs12_cert, pkcs12_pass } = responseCripto.data;

      // Ler informações do certificado
      const responseLer = await base44.functions.invoke('lerCertificadoDigital', {
        certificado_base64: certificadoBase64,
        senha: senha
      });

      if (!responseLer.data.success) {
        throw new Error('Certificado inválido ou senha incorreta');
      }

      const info = responseLer.data.info;

      // Salvar no banco de dados
      const certificadoSalvo = await base44.entities.CertificadoDigital.create({
        nome: info.subject || arquivo.name,
        tipo: info.type || 'A1',
        cpf_cnpj: info.cnpj || info.cpf,
        emissor: info.issuer,
        data_validade: info.valid_until,
        pkcs12_cert_encrypted: pkcs12_cert,
        pkcs12_pass_encrypted: pkcs12_pass,
        arquivo_nome: arquivo.name,
        ativo: true
      });

      setSucesso(true);
      setSenha("");
      setArquivo(null);

      if (onCertificadoSalvo) {
        onCertificadoSalvo(certificadoSalvo);
      }

    } catch (error) {
      console.error('Erro ao processar certificado:', error);
      setErro(error.message || 'Erro ao processar certificado');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Aviso de Segurança */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-green-900 mb-1">Integração Segura</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Certificado criptografado com AES-256-GCM</li>
              <li>✓ Senha criptografada antes do armazenamento</li>
              <li>✓ Comunicação via HTTPS (TLS)</li>
              <li>✓ Não persistido em estruturas de armazenamento</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload de Arquivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Certificado Digital (A1 - .pfx ou .p12)
        </label>
        <div className="relative">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="certificado-digital-input"
            accept=".pfx,.p12"
            disabled={processando}
          />
          <label
            htmlFor="certificado-digital-input"
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              arquivo 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400 bg-white'
            } ${processando ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {arquivo ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-sm font-medium text-green-700">{arquivo.name}</p>
                <p className="text-xs text-green-600">
                  {(arquivo.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-700">Clique para selecionar</p>
                <p className="text-xs text-gray-500">.pfx ou .p12 • Máx. 5MB</p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Senha */}
      {arquivo && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Senha do Certificado
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha do certificado"
              className="pl-10 pr-10"
              disabled={processando}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Sucesso */}
      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">
            Certificado digital salvo com segurança!
          </p>
        </div>
      )}

      {/* Botão Processar */}
      {arquivo && senha && (
        <Button
          onClick={processarCertificado}
          disabled={processando}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {processando ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando e criptografando...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Salvar Certificado com Segurança
            </>
          )}
        </Button>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Importante:</strong> O certificado será criptografado com AES-256-GCM antes de ser armazenado. 
          A senha também é criptografada separadamente. Apenas dados criptografados são salvos no banco de dados.
        </p>
      </div>
    </div>
  );
}