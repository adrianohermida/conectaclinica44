import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FolderOpen, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CompartilhamentoPublico() {
  const urlParams = new URLSearchParams(window.location.search);
  const rawToken = urlParams.get('token');
  const rawTipo = urlParams.get('tipo');
  
  // BRUTAL FIX: Garantir que pegamos o token CORRETO
  const token = rawToken?.trim() || null;
  const tipo = rawTipo?.trim() || 'documento';
  
  console.log('[CompartilhamentoPublico] 🔍 QUERY STRING:', window.location.search);
  console.log('[CompartilhamentoPublico] 🎫 RAW Token:', rawToken, 'RAW Tipo:', rawTipo);
  console.log('[CompartilhamentoPublico] ✅ PARSED Token:', token, 'Tipo:', tipo);

  const { data, isLoading, error } = useQuery({
    queryKey: ['compartilhamento-publico', token],
    queryFn: async () => {
      console.log('[CompartilhamentoPublico] 🔍 Token:', token, 'Tipo:', tipo);
      
      // PÚBLICO: fetch via domínio ConectaClínica (não Deno interno)
      const APP_BASE_URL = window.location.origin; // conectaclinica.com.br
      const url = `${APP_BASE_URL}/api/functions/acessarCompartilhamento`;
      
      console.log('[CompartilhamentoPublico] 📡 Chamando:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tipo })
      });
      
      console.log('[CompartilhamentoPublico] 📊 Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CompartilhamentoPublico] ❌ Erro:', errorText);
        throw new Error('Link inválido ou expirado');
      }
      
      const result = await response.json();
      console.log('[CompartilhamentoPublico] ✅ Resultado:', result);
      
      return result;
    },
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando compartilhamento...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido ou expirado</h1>
          <p className="text-gray-600">{error?.message || 'Este compartilhamento não existe ou foi revogado.'}</p>
        </div>
      </div>
    );
  }

  const item = data.item;
  const isPasta = tipo === 'pasta';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white">
            <div className="flex items-center gap-4 mb-2">
              {isPasta ? <FolderOpen className="w-12 h-12" /> : <FileText className="w-12 h-12" />}
              <div>
                <h1 className="text-3xl font-bold">{item.nome || item.titulo}</h1>
                <p className="text-purple-100 text-sm mt-1">Compartilhado por {item.compartilhado_por}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {item.descricao && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-600">{item.descricao}</p>
              </div>
            )}

            {!isPasta && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium text-gray-900 uppercase">{item.tipo_arquivo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tamanho</p>
                    <p className="font-medium text-gray-900">{(item.tamanho_bytes / 1024).toFixed(2)} KB</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {item.arquivo_url && (
                    <Button onClick={() => window.open(item.arquivo_url, '_blank')}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Arquivo
                    </Button>
                  )}
                </div>
              </>
            )}

            {isPasta && data.documentos && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Documentos ({data.documentos.length})</h3>
                <div className="space-y-2">
                  {data.documentos.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.titulo}</p>
                        <p className="text-sm text-gray-500">{doc.tipo_arquivo?.toUpperCase()} • {(doc.tamanho_bytes / 1024).toFixed(0)} KB</p>
                      </div>
                      {doc.arquivo_url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.arquivo_url, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}