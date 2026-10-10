import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Eye, FileText, Shield, Lock, History, GitBranch, Plus, Copy, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import EditorBlocos from "@/components/gestao-conteudo/EditorBlocos";
import PreviewDocumento from "@/components/gestao-conteudo/PreviewDocumento";
import HistoricoVersoes from "@/components/gestao-conteudo/HistoricoVersoes";
import IntegracaoESign from "@/components/gestao-conteudo/IntegracaoESign";
import NovoDocumentoModal from "@/components/gestao-conteudo/NovoDocumentoModal";
import ListaDocumentos from "@/components/gestao-conteudo/ListaDocumentos";
import RouteGuard from "@/components/auth/RouteGuard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

export default function GestaoConteudoLegal() {
  return (
    <RouteGuard requireAuth requireClinica>
      <GestaoConteudoLegalContent />
    </RouteGuard>
  );
}

function GestaoConteudoLegalContent() {
  const [viewMode, setViewMode] = useState("publico"); // publico ou interno
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [docParaExcluir, setDocParaExcluir] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: todosDocumentos = [], isLoading } = useQuery({
    queryKey: ['conteudo-legal-all'],
    queryFn: () => base44.entities.ConteudoLegal.list('-created_date'),
    initialData: []
  });

  const documentosFiltrados = todosDocumentos.filter(d => d.uso_tipo === viewMode);

  const documentoAtivo = documentoSelecionado || documentosFiltrados[0] || null;

  const [localBlocos, setLocalBlocos] = useState(documentoAtivo?.blocos || []);
  const [localESign, setLocalESign] = useState(documentoAtivo?.integracao_esign || {});

  useEffect(() => {
    if (documentoAtivo) {
      setLocalBlocos(documentoAtivo.blocos || []);
      setLocalESign(documentoAtivo.integracao_esign || {});
      setIsDirty(false);
    }
  }, [documentoAtivo?.id]);

  // Dirty state warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSalvar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localBlocos, localESign]);

  const criarMutation = useMutation({
    mutationFn: async (formData) => {
      const novoDoc = await base44.entities.ConteudoLegal.create({
        tipo_documento: formData.tipo_documento,
        categoria_custom: formData.categoria_custom,
        uso_tipo: formData.uso_tipo,
        titulo_custom: formData.titulo_custom,
        slug: formData.slug || undefined,
        versao: formData.versao,
        ativo: false,
        blocos: [{
          id: `bloco_${Date.now()}`,
          ordem: 0,
          tipo: "secao",
          titulo: "1. Introdução",
          conteudo_html: "<p>Digite o conteúdo...</p>",
          expansivel: true,
          visivel: true
        }],
        metadata: {
          autor_id: user?.id,
          autor_nome: user?.full_name,
          data_criacao: new Date().toISOString(),
          changelog: [{
            versao: formData.versao,
            data: new Date().toISOString(),
            mudancas: "Criação inicial"
          }]
        },
        integracao_esign: {
          requer_assinatura: false,
          tipo_aceite: "checkbox"
        }
      });
      console.log('[Documento Criado]', novoDoc);
      return novoDoc;
    },
    onSuccess: (novoDoc) => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      setDocumentoSelecionado(novoDoc);
      toast.success(`Documento criado! ID: ${novoDoc.id}`);
    }
  });

  // Popular templates padrão (executar apenas uma vez)
  const popularTemplatesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('popularTemplatesPadrao', {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Templates padrão populados!");
    }
  });

  const salvarMutation = useMutation({
    mutationFn: async (data) => {
      if (!documentoAtivo?.id) {
        throw new Error("Nenhum documento selecionado");
      }
      return base44.entities.ConteudoLegal.update(documentoAtivo.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Documento salvo!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const duplicarMutation = useMutation({
    mutationFn: async (doc) => {
      return base44.entities.ConteudoLegal.create({
        ...doc,
        id: undefined,
        versao: "1.0.0",
        ativo: false,
        titulo_custom: doc.titulo_custom ? `${doc.titulo_custom} (Cópia)` : undefined,
        metadata: {
          autor_id: user?.id,
          autor_nome: user?.full_name,
          data_criacao: new Date().toISOString(),
          changelog: [{
            versao: "1.0.0",
            data: new Date().toISOString(),
            mudancas: `Duplicado de v${doc.versao}`
          }]
        }
      });
    },
    onSuccess: (novoDoc) => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      setDocumentoSelecionado(novoDoc);
      toast.success("Documento duplicado!");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConteudoLegal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      setDocumentoSelecionado(null);
      toast.success("Documento excluído!");
    }
  });

  const publicarMutation = useMutation({
    mutationFn: async () => {
      if (!documentoAtivo?.id) throw new Error("Nenhum documento selecionado");

      // Desativar todos do mesmo tipo e uso
      const docs = await base44.entities.ConteudoLegal.filter({ 
        tipo_documento: documentoAtivo.tipo_documento,
        uso_tipo: documentoAtivo.uso_tipo,
        ativo: true 
      });
      await Promise.all(docs.map(d => base44.entities.ConteudoLegal.update(d.id, { ativo: false })));

      // Hash SHA-256
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(localBlocos)));
      const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Ativar atual
      const updated = await base44.entities.ConteudoLegal.update(documentoAtivo.id, {
        ativo: true,
        blocos: localBlocos,
        integracao_esign: localESign,
        metadata: {
          ...documentoAtivo.metadata,
          data_publicacao: new Date().toISOString(),
          hash_sha256: hashHex
        }
      });

      // Invalidar cache das páginas públicas
      if (documentoAtivo.uso_tipo === 'publico') {
        queryClient.invalidateQueries(['conteudo-legal-termos-uso']);
        queryClient.invalidateQueries(['conteudo-legal-privacidade']);
        queryClient.invalidateQueries(['conteudo-legal-lgpd']);
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      setIsDirty(false);
      toast.success("Documento publicado!");
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: async (versao_target) => {
      const { data } = await base44.functions.invoke('versionarConteudo', {
        action: 'rollback',
        documento_id: documentoAtivo.id,
        versao_target
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Versão restaurada!");
    }
  });

  const gerarTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('gerarTemplateAutentique', {
        documento_id: documentoAtivo.id
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Documento enviado para assinatura!");
      if (data.signatures?.[0]?.link?.short_link) {
        window.open(data.signatures[0].link.short_link, '_blank');
      }
    },
    onError: (error) => {
      toast.error("Erro ao enviar: " + error.message);
    }
  });

  const syncStatusMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('autentiqueSyncStatus', {
        documento_id: documentoAtivo.id
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Status atualizado!");
    }
  });

  const salvarComoTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!documentoAtivo?.id) throw new Error("Nenhum documento selecionado");
      return base44.entities.ConteudoLegal.update(documentoAtivo.id, {
        template_padrao: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-all']);
      toast.success("Documento marcado como template padrão!");
    }
  });

  const handleBlocosChange = (novoBlocos) => {
    setLocalBlocos(novoBlocos);
    setIsDirty(true);

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      if (documentoAtivo?.id) {
        salvarMutation.mutate({
          blocos: novoBlocos,
          integracao_esign: localESign
        });
      }
    }, 2000);
    setAutoSaveTimer(timer);
  };

  const handleSalvar = () => {
    if (!documentoAtivo?.id) {
      toast.error("Selecione um documento para salvar");
      return;
    }
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    salvarMutation.mutate({
      blocos: localBlocos,
      integracao_esign: localESign
    });
    setIsDirty(false);
  };

  const handleDuplicar = (doc) => {
    duplicarMutation.mutate(doc);
  };

  const handleExcluir = (doc) => {
    setDocParaExcluir(doc);
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Conteúdo Legal"
        description="Editor modular estilo Carrd para documentos legais e contratos"
        breadcrumbs={[
          { label: "SuperAdmin" },
          { label: "Conteúdo Legal" }
        ]}
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => popularTemplatesMutation.mutate()}
              disabled={popularTemplatesMutation.isPending}
              variant="outline"
            >
              {popularTemplatesMutation.isPending ? "Populando..." : "Popular Templates"}
            </Button>
            <Button
              onClick={() => setShowNovoModal(true)}
              className="bg-[#7E57FF] hover:bg-[#6d28d9] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Documento
            </Button>
          </div>
        }
      />

      {/* Tabs Público/Interno */}
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="publico" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Documentos Públicos
          </TabsTrigger>
          <TabsTrigger value="interno" className="gap-2">
            <Lock className="w-4 h-4" />
            Contratos Internos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista de Documentos */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-[#202124] mb-3">Documentos</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documentosFiltrados.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum documento {viewMode}
              </p>
            ) : (
              <ListaDocumentos
                documentos={documentosFiltrados}
                documentoAtivo={documentoAtivo}
                onSelect={setDocumentoSelecionado}
                onDuplicate={handleDuplicar}
                onDelete={handleExcluir}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          {!documentoAtivo ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Selecione ou crie um documento para editar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleSalvar}
                    disabled={salvarMutation.isPending || !documentoAtivo?.id}
                    className="bg-[#7E57FF] hover:bg-[#6d28d9] text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {salvarMutation.isPending ? "Salvando..." : isDirty ? "Salvar*" : "Salvar"}
                  </Button>
                  
                  <Button
                    onClick={() => publicarMutation.mutate()}
                    disabled={!documentoAtivo?.id || publicarMutation.isPending}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    {publicarMutation.isPending ? "Publicando..." : "Publicar"}
                  </Button>

                  <Button
                    onClick={() => setShowHistorico(!showHistorico)}
                    variant="outline"
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Versões
                  </Button>

                  <Button
                    onClick={() => salvarComoTemplateMutation.mutate()}
                    disabled={salvarComoTemplateMutation.isPending || documentoAtivo?.template_padrao}
                    variant="outline"
                    className="border-purple-600 text-purple-600"
                  >
                    {documentoAtivo?.template_padrao ? "✓ Template Padrão" : "Salvar como Template"}
                  </Button>
                </div>

                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? "Ocultar" : "Mostrar"} Preview
                </Button>
              </div>

              {/* Histórico de Versões */}
              {showHistorico && (
                <HistoricoVersoes
                  documentos={documentosFiltrados.filter(d => d.tipo_documento === documentoAtivo.tipo_documento)}
                  documentoAtivo={documentoAtivo}
                  onRollback={(versao) => rollbackMutation.mutate(versao)}
                />
              )}

              {/* Editor + Preview + Config */}
              <div className={`grid gap-6 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}>
                {/* Editor + ESign Config */}
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-[#202124] mb-4">
                      Editor de Blocos
                      {autoSaveTimer && (
                        <span className="text-sm text-gray-500 ml-2">(salvando...)</span>
                      )}
                    </h3>
                    
                    {isLoading ? (
                      <div className="animate-pulse space-y-4">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
                        ))}
                      </div>
                    ) : (
                      <EditorBlocos
                        blocos={localBlocos}
                        onChange={handleBlocosChange}
                      />
                    )}
                  </div>

                  <IntegracaoESign
                    config={localESign}
                    onChange={(newConfig) => {
                      setLocalESign(newConfig);
                      setIsDirty(true);
                    }}
                    onGerarTemplate={() => gerarTemplateMutation.mutate()}
                    isGenerating={gerarTemplateMutation.isPending}
                    onSyncStatus={() => syncStatusMutation.mutate()}
                    isSyncing={syncStatusMutation.isPending}
                  />
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
                    <PreviewDocumento
                      blocos={localBlocos}
                      tipoDocumento={documentoAtivo.tipo_documento}
                    />
                  </div>
                )}
              </div>

              {/* Metadata */}
              {documentoAtivo && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                  <div className="flex items-center gap-6">
                    <span>Versão: {documentoAtivo.versao}</span>
                    <span>Status: {documentoAtivo.ativo ? "✅ Publicado" : "📝 Rascunho"}</span>
                    <span>Uso: {documentoAtivo.uso_tipo === 'publico' ? '🌐 Público' : '🔒 Interno'}</span>
                    {documentoAtivo.categoria_custom && (
                      <span>Categoria: {documentoAtivo.categoria_custom}</span>
                    )}
                    {documentoAtivo.slug && (
                      <span>Slug: /{documentoAtivo.slug}</span>
                    )}
                    {documentoAtivo.metadata?.data_publicacao && (
                      <span>Publicado: {new Date(documentoAtivo.metadata.data_publicacao).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <NovoDocumentoModal
        open={showNovoModal}
        onClose={() => setShowNovoModal(false)}
        onCreate={(formData) => criarMutation.mutate(formData)}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDocParaExcluir(null);
        }}
        onConfirm={() => {
          if (docParaExcluir) {
            deleteMutation.mutate(docParaExcluir.id);
            setShowDeleteDialog(false);
            setDocParaExcluir(null);
          }
        }}
        title="Excluir Documento"
        description={`Tem certeza que deseja excluir "${docParaExcluir?.titulo_custom || 'este documento'}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}