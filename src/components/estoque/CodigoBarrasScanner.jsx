import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan, X, CheckCircle } from "lucide-react";

export default function CodigoBarrasScanner({ onScan, onClose }) {
  const [codigo, setCodigo] = useState("");
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);

  const handleScan = () => {
    if (codigo.trim()) {
      onScan(codigo.trim());
      setCodigo("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Scan className="w-5 h-5 text-[#0B7A9E]" />
          Leitura de Código de Barras
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 Use um leitor de código de barras USB ou digite o código manualmente (EAN-13)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de Barras
          </label>
          <Input
            ref={inputRef}
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="7891234567890"
            className="text-lg text-center tracking-wider"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            Posicione o cursor no campo e use o leitor, ou digite manualmente
          </p>
        </div>

        <Button
          onClick={handleScan}
          disabled={!codigo.trim()}
          className="w-full bg-[#0B7A9E] hover:bg-[#0a6582]"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Confirmar Leitura
        </Button>
      </div>
    </div>
  );
}