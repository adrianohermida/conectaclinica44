import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, FileSignature, Mail, User, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * MODAL ENVIAR PARA ASSINATURA DIGITAL - Autentique
 * Fluxo: selecionar destinatários → enviar → tracking webhook
 */
export default function ModalEnviarAssinatura({ documento, onClose }) {
  const queryClient = useQueryClient();
  const [signatarios, setSignatarios] = useState([
    { email: "", nome: "", acao: "assinar" }
  ]);

  const enviarMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('enviarAssinaturaDigital', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['compliance-docs']);
      toast.success(`✅ Enviado! Links enviados por email aos signatários.`);
      
      // Mostrar links de assinatura
      if (response.data?.signatarios?.length > 0) {
        console.log('[Assinatura] Links gerados:', response.data.signatarios);
      }
      
      onClose();
    },
    onError: (error) => {
      if (error.message?.includes('Créditos insuficientes')) {
        toast.error('❌ Sem créditos de assinatura. Recarregue para continuar.');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    }
  });

  const addSignatario = () => {
    setSignatarios([...signatarios, { email: "", nome: "", acao: "assinar" }]);
  };

  const removeSignatario = (idx) => {
    setSignatarios(signatarios.filter((_, i) => i !== idx));
  };

  const updateSignatario = (idx, field, value) => {
    const updated = [...signatarios];
    updated[idx][field] = value;
    setSignatarios(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validos = signatarios.filter(s => s.email && s.nome);
    if (validos.length === 0) {
      toast.error("Adicione ao menos 1 signatário");
      return;
    }

    enviarMutation.mutate({
      documento_compliance_id: documento.id,
      documento_nome: documento.titulo,
      arquivo_url: documento.arquivo_url,
      signatarios: validos.map(s => ({
        nome: s.nome,
        email: s.email,
        action: s.acao === 'assinar' ? 'SIGN' : 'APPROVE'
      }))
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                <FileSignature className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Enviar para Assinatura Digital</h3>
                <p className="text-sm text-gray-600">{documento.titulo}</p>
              </div>
            </div>
            <Button size="sm" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Info */}
          <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900">
              O documento será enviado via <strong>Autentique</strong> para assinatura ICP-Brasil. Você receberá notificações por email e o PDF assinado será salvo automaticamente no repositório.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Signatários ({signatarios.length})
              </label>
              
              {signatarios.map((sig, idx) => (
                <div key={idx} className="mb-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-600">Signatário #{idx + 1}</span>
                    {signatarios.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSignatario(idx)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nome completo *</label>
                      <Input
                        value={sig.nome}
                        onChange={(e) => updateSignatario(idx, 'nome', e.target.value)}
                        placeholder="Dr. João Silva"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email *</label>
                      <Input
                        type="email"
                        value={sig.email}
                        onChange={(e) => updateSignatario(idx, 'email', e.target.value)}
                        placeholder="joao@clinica.com.br"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Ação</label>
                    <select
                      value={sig.acao}
                      onChange={(e) => updateSignatario(idx, 'acao', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="assinar">Assinar (ICP-Brasil)</option>
                      <option value="aprovar">Aprovar (sem certificado)</option>
                    </select>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSignatario}
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                Adicionar Signatário
              </Button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={enviarMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={enviarMutation.isPending}>
            {enviarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSignature className="w-4 h-4 mr-2" />
            )}
            Enviar para Assinatura
          </Button>
        </div>
      </div>
    </div>
  );
}