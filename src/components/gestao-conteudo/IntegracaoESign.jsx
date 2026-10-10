import React from "react";
import { Shield, FileSignature } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/Button";

import { base44 } from "@/api/base44Client";

export default function IntegracaoESign({ config, onChange, onGerarTemplate, isGenerating, onSyncStatus, isSyncing }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-[#202124] mb-4 flex items-center gap-2">
        <FileSignature className="w-5 h-5" />
        Integração com Assinatura Eletrônica
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-bold text-sm text-[#202124]">
              Requer Assinatura Eletrônica
            </label>
            <p className="text-xs text-gray-500">
              Documento precisa de assinatura formal (ICP-Brasil)
            </p>
          </div>
          <Switch
            checked={config?.requer_assinatura || false}
            onCheckedChange={(checked) => onChange({ ...config, requer_assinatura: checked })}
          />
        </div>

        {config?.requer_assinatura && (
          <>
            <div>
              <label className="block font-bold text-sm text-[#202124] mb-2">
                Tipo de Aceite
              </label>
              <Select
                value={config?.tipo_aceite || 'checkbox'}
                onValueChange={(value) => onChange({ ...config, tipo_aceite: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkbox">Checkbox Simples</SelectItem>
                  <SelectItem value="modal">Modal com Confirmação</SelectItem>
                  <SelectItem value="esign_unilateral">Assinatura Unilateral (Authentique)</SelectItem>
                  <SelectItem value="esign_bilateral">Assinatura Bilateral (Authentique)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(config?.tipo_aceite === 'esign_unilateral' || config?.tipo_aceite === 'esign_bilateral') && (
              <>
                {config.tipo_aceite === 'esign_bilateral' && (
                  <div>
                    <label className="block font-bold text-sm text-[#202124] mb-2">
                      Signatários Fixos (emails)
                    </label>
                    <textarea
                      value={(config?.signatarios_fixos || []).join('\n')}
                      onChange={(e) => onChange({ 
                        ...config, 
                        signatarios_fixos: e.target.value.split('\n').filter(s => s.trim()) 
                      })}
                      placeholder="contato@exemplo.com&#10;juridico@exemplo.com"
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-purple-900 mb-1">
                        Assinatura ICP-Brasil via Autentique
                      </p>
                      <p className="text-xs text-purple-700 mb-3">
                        Documento será enviado para assinatura eletrônica com validade jurídica.
                      </p>
                      
                      {config?.autentique_status && (
                        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-bold ${
                          config.autentique_status === 'signed' ? 'bg-green-100 text-green-800' :
                          config.autentique_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          Status: {config.autentique_status === 'signed' ? '✅ Assinado' :
                                   config.autentique_status === 'cancelled' ? '❌ Recusado' :
                                   '⏳ Aguardando Assinatura'}
                        </div>
                      )}

                      {config?.autentique_document_id ? (
                        <div className="space-y-3">
                          <p className="text-xs text-purple-700 font-mono">
                            📄 Doc ID: {config.autentique_document_id}
                          </p>
                          {config?.pdf_assinado_url && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                const { data } = await base44.functions.invoke('baixarPDFAssinado', {
                                  file_uri: config.pdf_assinado_url
                                });
                                window.open(data.signed_url, '_blank');
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white w-full"
                            >
                              ⬇️ Baixar PDF Assinado
                            </Button>
                          )}
                          {onSyncStatus && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={onSyncStatus}
                              disabled={isSyncing}
                              className="w-full"
                            >
                              {isSyncing ? "Sincronizando..." : "🔄 Atualizar Status"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={onGerarTemplate}
                          disabled={isGenerating}
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full"
                        >
                          {isGenerating ? "Enviando..." : "📤 Enviar para Assinatura"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}