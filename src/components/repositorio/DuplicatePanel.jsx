import React from "react";
import { AlertCircle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import SlideInPanel from "@/components/ui/SlideInPanel";

export default function DuplicatePanel({ 
  isOpen, 
  onClose, 
  duplicateInfo, 
  onKeepBoth, 
  onReplace, 
  onCancel 
}) {
  if (!duplicateInfo) return null;

  const { fileName, existingDoc, hash } = duplicateInfo;

  return (
    <SlideInPanel isOpen={isOpen} onClose={onClose} title="⚠️ Documento Duplicado Detectado">
      <div className="p-6 space-y-6">
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-1">Este arquivo já existe</h3>
              <p className="text-sm text-gray-700 mb-2">
                Um documento com conteúdo idêntico foi encontrado:
              </p>
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <p className="font-medium text-sm">{existingDoc?.titulo}</p>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📁 Pasta: {existingDoc?.pasta_nome || 'Raiz'}</p>
                  <p>📅 Criado: {new Date(existingDoc?.created_date).toLocaleDateString('pt-BR')}</p>
                  <p>🔐 Hash: <code className="text-[10px] bg-gray-100 px-1 rounded">{hash?.substring(0, 16)}...</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-3">O que deseja fazer?</p>
          
          <Button 
            onClick={onKeepBoth} 
            variant="outline"
            className="w-full justify-start text-left h-auto py-3"
          >
            <div>
              <p className="font-medium">Manter ambos</p>
              <p className="text-xs text-gray-600">Salvar como nova versão independente</p>
            </div>
          </Button>

          <Button 
            onClick={onReplace} 
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 border-orange-300 hover:bg-orange-50"
          >
            <div>
              <p className="font-medium text-orange-700">Substituir existente</p>
              <p className="text-xs text-gray-600">Atualizar o documento anterior (cria nova versão)</p>
            </div>
          </Button>

          <Button 
            onClick={onCancel} 
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 border-gray-300"
          >
            <div>
              <p className="font-medium">Cancelar upload</p>
              <p className="text-xs text-gray-600">Não salvar este arquivo</p>
            </div>
          </Button>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-xs text-gray-700">
          <p className="font-medium mb-1">💡 Dica:</p>
          <p>Arquivos duplicados aumentam uso de armazenamento. Considere substituir ou criar conexões (Dockers) entre documentos relacionados.</p>
        </div>
      </div>
    </SlideInPanel>
  );
}