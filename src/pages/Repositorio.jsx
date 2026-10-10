import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { 
  Upload, FileText, Search, Trash2, Eye, CheckCircle2, AlertCircle, 
  Loader2, FolderPlus, FilePlus, Brain, Edit, Download, 
  FolderInput, Grid, List, LayoutGrid, X, Globe, Link2, Share2, Magnet, Unlink,
  MoreVertical, Move, UserPlus, Clock, Pencil, Copy, Home, GripVertical, Shield, FileSignature, Settings, HardDrive
} from "lucide-react";
import { toast } from "sonner";
import FolderTree from "@/components/repositorio/FolderTree";
import ViewSwitcher from "@/components/repositorio/ViewSwitcher";
import ContextMenu from "@/components/repositorio/ContextMenu";
import DetailPanel from "@/components/repositorio/DetailPanel";
import SlideInPanel from "@/components/ui/SlideInPanel";
import DragDropZone from "@/components/repositorio/DragDropZone";
import DocumentViewer from "@/components/repositorio/DocumentViewer";
import UniversalDocViewer from "@/components/repositorio/UniversalDocViewer";
import TextEditor from "@/components/repositorio/TextEditor";
import DockerView from "@/components/repositorio/DockerView";
import DiskUsageMonitor from "@/components/repositorio/DiskUsageMonitor";
import GoogleDriveStatus from "@/components/repositorio/GoogleDriveStatus";
import DuplicatePanel from "@/components/repositorio/DuplicatePanel";
import ModalMoverAvancado from "@/components/repositorio/ModalMoverAvancado";
import PermissionManager from "@/components/repositorio/PermissionManager";
import AuditLogPanel from "@/components/repositorio/AuditLogPanel";
import HistoricoVersoesPanel from "@/components/repositorio/HistoricoVersoesPanel";
import ModalEnviarAssinatura from "@/components/repositorio/ModalEnviarAssinatura";
import FolderDropZone from "@/components/repositorio/FolderDropZone";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Repositorio() {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  
  // Estados UI
  const [pastaAtual, setPastaAtual] = useState(null);
  const [viewMode, setViewMode] = useState('detalhes');
  const [busca, setBusca] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [showPastasDrawer, setShowPastasDrawer] = useState(false);
  const [draggedItems, setDraggedItems] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Modais
  const [showNovaPasta, setShowNovaPasta] = useState(false);
  const [showNovoArquivo, setShowNovoArquivo] = useState(false);
  const [showEditMetadata, setShowEditMetadata] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [renamingItem, setRenamingItem] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [creatingSubpasta, setCreatingSubpasta] = useState(null);
  const [showNovoLinkExterno, setShowNovoLinkExterno] = useState(false);
  const [showImportarPDF, setShowImportarPDF] = useState(false);
  const [showCompartilhar, setShowCompartilhar] = useState(null);
  const [documentosParaConectar, setDocumentosParaConectar] = useState([]);
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogTarget, setAuditLogTarget] = useState(null);
  const [showHistoricoVersoes, setShowHistoricoVersoes] = useState(false);
  const [historicoVersaoTarget, setHistoricoVersaoTarget] = useState(null);
  const [showEnviarAssinatura, setShowEnviarAssinatura] = useState(false);
  const [assinaturaTarget, setAssinaturaTarget] = useState(null);
  const [modoConexao, setModoConexao] = useState(false);
  const [paginaDocs, setPaginaDocs] = useState(1);
  const DOCS_POR_PAGINA = 100;
  const [showVisualizadorPDF, setShowVisualizadorPDF] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [showDuplicatePanel, setShowDuplicatePanel] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);

  // Validação de permissões (frontend + backend)
  const validarPermissaoItem = async (item, operacao) => {
    try {
      // Mapear operação para permissão
      const mapa = {
        'visualizar': 'view',
        'abrir': 'view',
        'download': 'view',
        'editar': 'edit',
        'renomear': 'edit',
        'mover': 'edit',
        'compartilhar': 'edit',
        'share': 'edit',
        'permissions': 'edit',
        'audit': 'view',
        'excluir': 'delete',
        'desconectar': 'edit'
      };

      const permissaoRequerida = mapa[operacao] || 'view';

      // Validação backend (LGPD audit log)
      const response = await base44.functions.invoke('validarPermissaoAcesso', {
        item_id: item.id,
        item_type: item.tipo === 'pasta' ? 'pasta' : 'documento',
        operacao: permissaoRequerida
      });

      return response.data;
    } catch (error) {
      console.error('[Permissões] Erro na validação:', error);
      return { permitido: false, motivo: 'Erro ao validar permissão' };
    }
  };

  // CRITICAL: Obter clinica_id para isolamento multi-tenant
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 15 * 60 * 1000
  });

  const clinicaId = user?.clinica_id;
  const isSuperAdmin = user?.role === 'admin' && !clinicaId; // SuperAdmin SEM clinica_id = modo global

  // DEBUG BRUTAL
  React.useEffect(() => {
    if (user) {
      console.log('=== REPOSITÓRIO DEBUG ===', {
        email: user.email,
        role: user.role,
        clinica_id: user.clinica_id,
        isSuperAdmin,
        clinicaId
      });
    }
  }, [user, clinicaId, isSuperAdmin]);

  // Queries - ISOLAMENTO MULTI-TENANT (SuperAdmin vê TUDO)
  const { data: pastas = [], isLoading: loadingPastas } = useQuery({
    queryKey: ["pastas-compliance", clinicaId, isSuperAdmin],
    queryFn: async () => {
      try {
        if (isSuperAdmin) {
          const allPastas = await base44.entities.PastaCompliance.list("ordem", 1000);
          console.log('✅ [SuperAdmin] Pastas:', allPastas.length, '| Globais:', allPastas.filter(p => !p.clinica_id).length);
          return allPastas;
        }
        if (!clinicaId) {
          console.log('⚠️ [Repositorio] clinicaId AUSENTE - retornando []');
          return [];
        }
        const pastas = await base44.entities.PastaCompliance.filter({ clinica_id: clinicaId }, "ordem", 1000);
        console.log('✅ [Clínica] Pastas:', pastas.length, '| clinica_id:', clinicaId);
        return pastas;
      } catch (error) {
        console.error('❌ [Repositorio] Erro ao carregar pastas:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const { data: documentos = [], isLoading: loadingDocs, isFetching: fetchingDocs } = useQuery({
    queryKey: ["compliance-docs", clinicaId, isSuperAdmin, paginaDocs],
    queryFn: async () => {
      try {
        if (isSuperAdmin) {
          const docs = await base44.entities.DocumentoCompliance.list("-created_date", paginaDocs * DOCS_POR_PAGINA);
          console.log('✅ [SuperAdmin] Docs:', docs.length, '| Globais:', docs.filter(d => !d.clinica_id).length);
          return docs;
        }
        if (!clinicaId) {
          console.log('⚠️ [Repositorio] clinicaId AUSENTE - retornando []');
          return [];
        }
        const docs = await base44.entities.DocumentoCompliance.filter({ clinica_id: clinicaId }, "-created_date", paginaDocs * DOCS_POR_PAGINA);
        console.log('✅ [Clínica] Docs:', docs.length, '| clinica_id:', clinicaId);
        return docs;
      } catch (error) {
        console.error('❌ [Repositorio] Erro ao carregar docs:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true
  });

  const { data: logsAssinatura = [] } = useQuery({
    queryKey: ['assinatura-logs-repositorio', clinicaId, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        return await base44.entities.AssinaturaDigitalLog.list('-created_date', 200);
      }
      if (!clinicaId) return [];
      return await base44.entities.AssinaturaDigitalLog.filter(
        { clinica_id: clinicaId },
        '-created_date',
        200
      );
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 15000
  });

  const { data: conexoes = [] } = useQuery({
    queryKey: ["conexoes-docs", clinicaId, isSuperAdmin],
    queryFn: async () => {
      try {
        if (isSuperAdmin) {
          return await base44.entities.ConexaoDocumentos.filter({ ativo: true });
        }
        if (!clinicaId) return [];
        return await base44.entities.ConexaoDocumentos.filter({ clinica_id: clinicaId, ativo: true });
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  // Reset paginação ao mudar pasta
  React.useEffect(() => {
    setPaginaDocs(1);
  }, [pastaAtual, busca]);

  // Mutations
  const createPastaMutation = useMutation({
    mutationFn: (data) => {
      // SuperAdmin SEM clinica_id = pasta global (repositório plataforma)
      const pastaData = isSuperAdmin 
        ? { ...data, clinica_id: null }
        : { ...data, clinica_id: clinicaId };
      return base44.entities.PastaCompliance.create(pastaData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pastas-compliance"]);
      toast.success("Pasta criada");
      setShowNovaPasta(false);
      setCreatingSubpasta(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tipo, id }) => {
      if (tipo === 'pasta') {
        return base44.entities.PastaCompliance.delete(id);
      } else {
        return base44.entities.DocumentoCompliance.delete(id);
      }
    },
    onSuccess: (_, vars) => {
      if (vars.tipo === 'pasta') {
        queryClient.invalidateQueries(["pastas-compliance"]);
      } else {
        queryClient.invalidateQueries(["compliance-docs"]);
      }
      toast.success("Item excluído");
      setSelectedItems(new Set());
    }
  });

  const updateMetadataMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentoCompliance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("Atualizado");
      setShowEditMetadata(false);
      setRenamingItem(null);
      setMovingItem(null);
    }
  });

  const renameMutation = useMutation({
    mutationFn: ({ tipo, id, nome }) => {
      if (tipo === 'pasta') {
        return base44.entities.PastaCompliance.update(id, { nome });
      } else {
        return base44.entities.DocumentoCompliance.update(id, { titulo: nome });
      }
    },
    onSuccess: (_, vars) => {
      if (vars.tipo === 'pasta') {
        queryClient.invalidateQueries(["pastas-compliance"]);
      } else {
        queryClient.invalidateQueries(["compliance-docs"]);
      }
      toast.success("Renomeado");
      setRenamingItem(null);
    }
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, pasta_id, isBulk, bulkIds }) => {
      if (isBulk && bulkIds) {
        await Promise.all(bulkIds.map(docId => 
          base44.entities.DocumentoCompliance.update(docId, { pasta_id })
        ));
      } else {
        await base44.entities.DocumentoCompliance.update(id, { pasta_id });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(["compliance-docs"]);
      const qtd = vars.isBulk ? vars.bulkIds.length : 1;
      toast.success(`${qtd} ${qtd === 1 ? 'item movido' : 'itens movidos'}`);
      setMovingItem(null);
      setSelectedItems(new Set());
      setSelectionMode(false);
    }
  });

  const indexarIAMutation = useMutation({
    mutationFn: async (documento_id) => {
      toast.info("Indexando documento com IA...");
      return await base44.functions.invoke('indexarDocumentoIA', { documento_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("✅ Documento indexado por IA");
    },
    onError: (error) => {
      toast.error(`Erro na indexação: ${error.message}`);
    }
  });

  const compartilharMutation = useMutation({
    mutationFn: (pasta_id) => base44.functions.invoke('gerarLinkCompartilhamento', { pasta_id }),
    onSuccess: (response, pasta_id) => {
      const result = response?.data || response;
      const link = result.link_compartilhamento;
      const token = result.token;
      
      if (!link) {
        toast.error("Erro ao gerar link");
        console.error('[Compartilhar] Resposta inválida:', response);
        return;
      }
      
      const pastaAtualizada = pastas.find(p => p.id === pasta_id);
      if (pastaAtualizada) {
        setShowCompartilhar({
          ...pastaAtualizada,
          compartilhamento_publico: true,
          link_compartilhamento: link,
          token_compartilhamento: token,
          tipo: 'pasta'
        });
      }
      
      navigator.clipboard.writeText(link);
      toast.success("Link gerado e copiado!");
      
      setTimeout(() => queryClient.invalidateQueries(["pastas-compliance"]), 1000);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      console.error('[Compartilhar Pasta]', error);
    }
  });

  const revogarCompartilhamentoMutation = useMutation({
    mutationFn: ({ tipo, id }) => {
      if (tipo === 'pasta') {
        return base44.functions.invoke('revogarCompartilhamento', { pasta_id: id });
      } else {
        return base44.functions.invoke('revogarCompartilhamentoDocumento', { documento_id: id });
      }
    },
    onSuccess: (_, vars) => {
      if (vars.tipo === 'pasta') {
        queryClient.invalidateQueries(["pastas-compliance"]);
      } else {
        queryClient.invalidateQueries(["compliance-docs"]);
      }
      toast.success("Compartilhamento revogado");
      setShowCompartilhar(null);
    }
  });

  const compartilharDocumentoMutation = useMutation({
    mutationFn: (documento_id) => base44.functions.invoke('compartilharDocumento', { documento_id }),
    onSuccess: (response, documento_id) => {
      const result = response?.data || response;
      const link = result.link_compartilhamento;
      const token = result.token;
      
      if (!link) {
        toast.error("Erro ao gerar link");
        console.error('[Compartilhar Doc] Resposta inválida:', response);
        return;
      }
      
      const docAtualizado = documentos.find(d => d.id === documento_id);
      if (docAtualizado) {
        setShowCompartilhar({
          ...docAtualizado,
          compartilhamento_publico: true,
          link_compartilhamento: link,
          token_compartilhamento: token,
          tipo: 'documento'
        });
      }
      
      navigator.clipboard.writeText(link);
      toast.success("Link gerado e copiado!");
      
      setTimeout(() => queryClient.invalidateQueries(["compliance-docs"]), 1000);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      console.error('[Compartilhar Documento]', error);
    }
  });

  const importarPDFMutation = useMutation({
    mutationFn: ({ url, titulo, pasta_id }) => base44.functions.invoke('importarPDFUrl', { url, titulo, pasta_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("PDF importado com sucesso!");
      setShowImportarPDF(false);
    }
  });



  const criarLinkExternoMutation = useMutation({
    mutationFn: (data) => {
      const docData = isSuperAdmin 
        ? { ...data, clinica_id: null }
        : { ...data, clinica_id: clinicaId };
      return base44.entities.DocumentoCompliance.create(docData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("Link externo criado!");
      setShowNovoLinkExterno(false);
    }
  });

  const conectarDocumentosMutation = useMutation({
    mutationFn: ({ documentos_ids, titulo, pasta_id }) => 
      base44.functions.invoke('conectarDocumentos', { documentos_ids, titulo, pasta_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      queryClient.invalidateQueries(["conexoes-docs"]);
      toast.success("Documentos conectados!");
      setDocumentosParaConectar([]);
      setModoConexao(false);
    }
  });

  const desconectarDocumentosMutation = useMutation({
    mutationFn: (conexao_id) => base44.functions.invoke('desconectarDocumentos', { conexao_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(["compliance-docs"]);
      queryClient.invalidateQueries(["conexoes-docs"]);
      toast.success("Documentos desconectados!");
    }
  });

  // Verificar uso de storage
  const { data: storageUsage } = useQuery({
    queryKey: ['storage-usage-check'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('getStorageUsageReal', {});
        return response.data;
      } catch {
        const totalBytes = documentos.reduce((sum, doc) => sum + (doc.tamanho_bytes || 0), 0);
        return { used_bytes: totalBytes, limit_bytes: 10 * 1024 * 1024 * 1024 };
      }
    },
    staleTime: 60 * 1000
  });

  // Upload batch otimizado com detecção de duplicidade
  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (files.length > 50) {
      toast.error("Máximo 50 arquivos por lote");
      return;
    }

    // Verificar se excede limite
    const totalUploadSize = files.reduce((sum, f) => sum + f.size, 0);
    const usedBytes = storageUsage?.used_bytes || 0;
    const limitBytes = storageUsage?.limit_bytes || 10 * 1024 * 1024 * 1024;
    const excedeLimite = (usedBytes + totalUploadSize) > limitBytes;

    if (excedeLimite) {
      const usarDrive = confirm(
        `⚠️ Upload excede limite de storage (${((usedBytes + totalUploadSize) / 1024 / 1024 / 1024).toFixed(1)}GB / ${(limitBytes / 1024 / 1024 / 1024).toFixed(0)}GB).\n\n` +
        `Deseja usar Google Drive ao invés de Base44?\n\n` +
        `✅ Vantagens: Espaço ilimitado (15GB grátis por usuário)\n` +
        `❌ Desvantagens: Requer autorização Google (1 clique)`
      );

      if (usarDrive) {
        return handleUploadToGoogleDrive(files);
      }
    }

    console.log('[Repositorio] Upload iniciado:', { total: files.length, pasta: pastaAtual });
    setUploading(true);
    setProgresso({ total: files.length, processados: 0, erros: 0, duplicados: 0 });

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          const ext = file.name.split('.').pop().toLowerCase();
          
          const tiposPermitidos = ['pdf', 'docx', 'html', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
          if (!tiposPermitidos.includes(ext)) {
            console.error(`[Upload] Arquivo rejeitado: "${file.name}" - extensão "${ext}" inválida`);
            throw new Error(`❌ Arquivo "${file.name}" possui extensão inválida. Tipos aceitos: PDF, DOCX, HTML, CSV, TXT, JPG, PNG, GIF, SVG, WEBP`);
          }

          // Compressão automática de imagens (economia 60-80%)
          let file_url, thumbnail_url;
          const isImagem = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
          
          if (isImagem && file.size > 100 * 1024) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              const compressResponse = await base44.functions.invoke('comprimirImagem', formData);
              
              if (compressResponse.data.compressed) {
                file_url = compressResponse.data.file_url;
                console.log(`[Upload] Comprimido: ${compressResponse.data.savings_percent}% economia`);
              } else {
                const { file_url: url } = await base44.integrations.Core.UploadFile({ file });
                file_url = url;
              }
            } catch (compressError) {
              console.warn('[Upload] Compressão falhou, upload normal:', compressError.message);
              const { file_url: url } = await base44.integrations.Core.UploadFile({ file });
              file_url = url;
            }
          } else {
            const { file_url: url } = await base44.integrations.Core.UploadFile({ file });
            file_url = url;
          }
          
          // Detectar duplicidade em background (não bloqueante)
          let hash = null;
          try {
            const formData = new FormData();
            formData.append('file', file);
            const dupResponse = await Promise.race([
              base44.functions.invoke('detectarDuplicidade', formData),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            if (dupResponse.data?.duplicata) {
              console.warn(`[Upload] Arquivo ${file.name} é duplicado, mas será salvo mesmo assim`);
            }
            hash = dupResponse.data?.hash;
          } catch (dupError) {
            console.warn('[Upload] Detecção de duplicidade falhou (não crítico):', dupError.message);
          }
          
          // Gerar thumbnail se for imagem (economiza bandwidth)
          if (isImagem) {
            try {
              const thumbResponse = await base44.functions.invoke('gerarThumbnail', { file_url });
              thumbnail_url = thumbResponse.data.thumbnail_url;
            } catch (thumbError) {
              console.warn('[Upload] Thumbnail falhou (não crítico):', thumbError.message);
            }
          }

          const doc = await base44.entities.DocumentoCompliance.create({
            clinica_id: isSuperAdmin ? null : clinicaId, // SuperAdmin = documento global
            titulo: file.name.replace(/\.[^/.]+$/, ""),
            pasta_id: pastaAtual,
            categoria: 'outros',
            arquivo_url: file_url,
            thumbnail_url: thumbnail_url || null,
            tipo_arquivo: isImagem ? 'webp' : ext,
            tamanho_bytes: file.size,
            hash_sha256: hash,
            tags: [],
            indexado: false,
            versao: 1
          });

          // Indexar IA em background
          setTimeout(() => {
            base44.functions.invoke('indexarDocumentoIA', { documento_id: doc.id }).catch(() => {});
          }, 1000);

          return { success: true, arquivo: file.name };
        } catch (error) {
          console.error('[Upload] Erro no arquivo:', file.name, error);
          return { success: false, arquivo: file.name, erro: error.message };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      const sucessos = results.filter(r => r.success).length;
      const duplicados = results.filter(r => r.duplicado).length;
      const falhas = results.filter(r => !r.success && !r.duplicado).length;
      
      setProgresso({ total: files.length, processados: sucessos, erros: falhas, duplicados });

      if (duplicados > 0) {
        toast.warning(`${sucessos} enviados, ${duplicados} duplicados ignorados, ${falhas} falharam`);
      } else if (falhas > 0) {
        toast.warning(`${sucessos} enviados, ${falhas} falharam`);
      } else {
        toast.success(`${sucessos} documentos enviados!`);
      }

      queryClient.invalidateQueries(["compliance-docs"]);
      e.target.value = null;
      
      setTimeout(() => {
        setProgresso(null);
      }, 3000);
    } catch (error) {
      console.error('[Repositorio] Erro no upload batch:', error);
      if (error.message.includes('Network')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error(`Erro no upload: ${error.message}`);
      }
      setProgresso(null);
    } finally {
      setUploading(false);
    }
  };

  // Filtrar itens (busca global quando houver texto de busca)
  const itensExibidos = useMemo(() => {
    // Se tiver busca, procura em TODOS os documentos e pastas (busca global)
    if (busca.trim()) {
      const searchLower = busca.toLowerCase().trim();
      const allItems = [
        ...pastas.map(p => ({ ...p, tipo: 'pasta' })),
        ...documentos.map(d => ({ ...d, tipo: 'documento' }))
      ];
      
      return allItems.filter(item => {
        const nome = (item.titulo || item.nome || '').toLowerCase();
        const desc = (item.descricao || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();
        const conteudo = (item.conteudo_extraido || '').toLowerCase();
        const vinculoNome = (item.vinculado_a?.nome || '').toLowerCase();
        return nome.includes(searchLower) || 
               desc.includes(searchLower) || 
               tags.includes(searchLower) ||
               conteudo.includes(searchLower) ||
               vinculoNome.includes(searchLower);
      });
    }

    // Sem busca: mostrar apenas itens da pasta atual
    const docsNaPasta = documentos.filter(doc => doc.pasta_id === pastaAtual);
    const pastasFilhas = pastas.filter(p => p.pasta_pai_id === pastaAtual);

    return [
      ...pastasFilhas.map(p => ({ ...p, tipo: 'pasta' })),
      ...docsNaPasta.map(d => ({ ...d, tipo: 'documento' }))
    ];
  }, [documentos, pastas, pastaAtual, busca]);

  // Context menu handler
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleMenuAction = async (action, item) => {
    const validacao = await validarPermissaoItem(item, action);
    if (!validacao.permitido) {
      toast.error(`🔒 ${validacao.motivo}`);
      return;
    }

    const actions = {
      'visualizar': () => {
        if (item.tipo === 'pasta') setPastaAtual(item.id);
        else if (item.tipo_documento === 'link_externo') window.open(item.url_externa, '_blank');
        else if (item.tipo_arquivo === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(item.tipo_arquivo?.toLowerCase())) setShowVisualizadorPDF(item);
        else setViewerDoc(item);
      },
      'abrir': () => item.tipo === 'pasta' ? setPastaAtual(item.id) : actions.visualizar(),
      'editar': () => editarDocumentoHTML(item),
      'renomear': () => setRenamingItem(item),
      'mover': () => setMovingItem(item),
      'compartilhar': () => setShowCompartilhar({ ...item, tipo: item.tipo }),
      'metadata': () => { setEditingItem(item); setShowEditMetadata(true); },
      'propriedades': () => { setDetailItem(item); setShowDetailPanel(true); },
      'permissions': () => { setPermissionTarget(item); setShowPermissionManager(true); },
      'audit': () => { setAuditLogTarget(item); setShowAuditLog(true); },
      'versoes': () => { setHistoricoVersaoTarget(item); setShowHistoricoVersoes(true); },
      'assinar': () => { setAssinaturaTarget(item); setShowEnviarAssinatura(true); },
      'indexar': () => indexarIAMutation.mutate(item.id),
      'download': () => window.open(item.arquivo_url || item.url_externa, '_blank'),
      'excluir': () => {
        if (confirm(`Excluir "${item.titulo || item.nome}"?`)) {
          deleteMutation.mutate({ tipo: item.tipo, id: item.id });
        }
      }
    };

    actions[action]?.();
  };

  const handleTextEditorUpdate = async (docId, titulo, conteudo) => {
    try {
      const blob = new Blob([conteudo], { type: 'text/html' });
      const file = new File([blob], `${titulo}.html`, { type: 'text/html' });
      
      console.log('[TextEditor] Atualizando documento:', { docId, titulo, size: blob.size });

      // SALVAR VERSÃO ANTERIOR primeiro
      await base44.functions.invoke('salvarVersaoDocumento', {
        documento_id: docId,
        tipo_alteracao: 'edicao_conteudo',
        observacao: 'Edição via editor de texto'
      });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.DocumentoCompliance.update(docId, {
        titulo,
        arquivo_url: file_url,
        tamanho_bytes: blob.size,
        versao: (editingDoc?.versao || 1) + 1
      });

      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("✅ Documento atualizado (versão anterior salva)");
      setShowTextEditor(false);
      setEditingDoc(null);
    } catch (error) {
      console.error('[TextEditor] Erro ao atualizar:', error);
      
      if (error.message.includes('CORS') || (error.message.includes('Network Error') && window.location.origin.includes('preview-sandbox'))) {
        toast.error('⛔ ERRO CORS: Use ambiente de produção. Preview-sandbox bloqueado pela Base44.');
      } else {
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }
  };

  const handleTextEditorSave = async (titulo, conteudo) => {
    try {
      const blob = new Blob([conteudo], { type: 'text/html' });
      const file = new File([blob], `${titulo}.html`, { type: 'text/html' });
      
      console.log('[TextEditor] Iniciando upload:', { titulo, size: blob.size, pastaAtual });
      
      // Tentar upload com diagnóstico detalhado
      let file_url;
      try {
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        file_url = uploadResult.file_url;
        console.log('[TextEditor] Upload bem-sucedido:', file_url);
      } catch (uploadError) {
        console.error('[TextEditor] ERRO DETALHADO NO UPLOAD:', {
          message: uploadError.message,
          stack: uploadError.stack,
          name: uploadError.name,
          response: uploadError.response,
          config: uploadError.config
        });
        
        // Detectar CORS especificamente
        if (uploadError.message.includes('Network Error') && !navigator.onLine) {
          throw new Error('Sem conexão com internet. Verifique sua rede.');
        } else if (uploadError.message.includes('Network Error')) {
          throw new Error('ERRO CORS: Ambiente preview-sandbox bloqueado. Use ambiente de produção.');
        }
        throw uploadError;
      }
      
      // Verificar duplicidade APÓS upload (não bloqueia)
      const formData = new FormData();
      formData.append('file', file);
      
      let isDuplicate = false;
      let existingDoc = null;
      
      try {
        const dupResponse = await Promise.race([
          base44.functions.invoke('detectarDuplicidade', formData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        
        if (dupResponse.data?.duplicata) {
          isDuplicate = true;
          existingDoc = dupResponse.data.documento_existente;
          console.warn('[TextEditor] Duplicado detectado:', existingDoc?.titulo);
        }
      } catch (dupError) {
        console.warn('[TextEditor] Detecção de duplicidade falhou (não crítico)');
      }

      // Se duplicado, mostrar painel de decisão
      if (isDuplicate && existingDoc) {
        setPendingUpload({
          titulo,
          file_url,
          blob,
          tipo: 'text_editor'
        });
        setDuplicateInfo({
          fileName: titulo,
          existingDoc,
          hash: existingDoc.hash_sha256
        });
        setShowDuplicatePanel(true);
        setShowTextEditor(false);
        return;
      }

      // Criar documento normalmente
      await base44.entities.DocumentoCompliance.create({
        clinica_id: isSuperAdmin ? null : clinicaId, // SuperAdmin = global
        titulo,
        pasta_id: pastaAtual,
        categoria: 'outros',
        arquivo_url: file_url,
        tipo_arquivo: 'html',
        tamanho_bytes: blob.size,
        tags: [],
        indexado: false,
        versao: 1
      });

      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success("Documento criado com sucesso");
      setShowTextEditor(false);
    } catch (error) {
      console.error('[Repositorio] ERRO COMPLETO:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      
      if (error.message.includes('CORS')) {
        toast.error('⛔ ERRO DE INFRAESTRUTURA: Ambiente preview bloqueado. Use produção ou reporte ao suporte Base44.');
      } else if (error.message.includes('Network')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        toast.error(`Erro ao salvar: ${error.message}`);
      }
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Fix: Desarmar quando sair da área de drop
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    // Simulate file input change event
    const event = {
      target: {
        files: files,
        value: null
      }
    };
    
    await handleBatchUpload(event);
  };

  // Toggle multi-select - SIMPLES E DIRETO
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(itemId);
        if (!selectionMode) setSelectionMode(true);
      }
      return next;
    });
  };

  // Long-press para mobile (2s) - ATIVADO PARA TODOS OS ITENS
  const handleTouchStart = (e, itemId, item) => {
    const timer = setTimeout(() => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedItems(new Set([itemId]));
        navigator.vibrate?.(50); // Feedback tátil
      }
    }, 2000);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Drag and Drop para itens selecionados
  const handleDragStart = (e, item) => {
    if (selectedItems.size > 0 && selectedItems.has(item.id)) {
      setDraggedItems({ items: Array.from(selectedItems), count: selectedItems.size });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: Array.from(selectedItems) }));
    } else {
      setDraggedItems({ items: [item.id], count: 1 });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: [item.id] }));
    }
  };

  const handleDragEnd = () => {
    setDraggedItems(null);
  };

  // Drop em pasta específica (drag-and-drop para mover)
  const handleDropOnFolder = async (pastaId, itemIds) => {
    console.log('[Repositorio] Drop em pasta:', { pastaId, itemIds });
    
    // Filtrar apenas documentos (pastas não podem ser movidas assim)
    const docs = itemIds
      .map(id => itensExibidos.find(i => i.id === id))
      .filter(item => item && item.tipo === 'documento');

    if (docs.length === 0) {
      toast.error('Apenas documentos podem ser movidos por drag-and-drop');
      return;
    }

    try {
      await Promise.all(docs.map(doc => 
        base44.entities.DocumentoCompliance.update(doc.id, { pasta_id: pastaId })
      ));
      
      queryClient.invalidateQueries(["compliance-docs"]);
      toast.success(`${docs.length} ${docs.length === 1 ? 'arquivo movido' : 'arquivos movidos'}`);
      setSelectedItems(new Set());
      setSelectionMode(false);
    } catch (error) {
      toast.error(`Erro ao mover: ${error.message}`);
    }
  };

  const selectAll = () => {
    const allIds = itensExibidos.map(i => i.id); // INCLUIR PASTAS também
    setSelectedItems(new Set(allIds));
    setSelectionMode(true);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const handleUploadToGoogleDrive = async (files) => {
    setUploading(true);
    setProgresso({ total: files.length, processados: 0, erros: 0, duplicados: 0 });

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('titulo', file.name);
          formData.append('pasta_id', pastaAtual || '');

          const response = await base44.functions.invoke('uploadToGoogleDrive', formData);

          if (response.data.action === 'authorize_drive') {
            toast.error('Conecte seu Google Drive primeiro');
            return { success: false, arquivo: file.name, erro: 'OAuth pendente' };
          }

          const ext = file.name.split('.').pop().toLowerCase();
          await base44.entities.DocumentoCompliance.create({
            clinica_id: isSuperAdmin ? null : clinicaId,
            titulo: file.name.replace(/\.[^/.]+$/, ""),
            pasta_id: pastaAtual,
            categoria: 'outros',
            arquivo_url: response.data.file_url,
            tipo_arquivo: ext,
            tamanho_bytes: file.size,
            tags: ['google_drive'],
            storage_provider: 'google_drive',
            drive_file_id: response.data.drive_file_id,
            versao: 1
          });

          return { success: true, arquivo: file.name };
        } catch (error) {
          return { success: false, arquivo: file.name, erro: error.message };
        }
      });

      const results = await Promise.all(uploadPromises);
      const sucessos = results.filter(r => r.success).length;
      const falhas = results.filter(r => !r.success).length;

      setProgresso({ total: files.length, processados: sucessos, erros: falhas, duplicados: 0 });

      if (falhas > 0) {
        toast.warning(`${sucessos} enviados para Drive, ${falhas} falharam`);
      } else {
        toast.success(`${sucessos} documentos no Google Drive!`);
      }

      queryClient.invalidateQueries(["compliance-docs"]);
      setTimeout(() => setProgresso(null), 3000);
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
      setProgresso(null);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkMove = () => {
    if (selectedItems.size === 0) return;
    const firstId = Array.from(selectedItems)[0];
    const firstItem = itensExibidos.find(i => i.id === firstId);
    setMovingItem({ ...firstItem, isBulk: true, bulkIds: Array.from(selectedItems) });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Excluir ${selectedItems.size} itens?`)) return;

    const items = itensExibidos.filter(i => selectedItems.has(i.id));
    
    await Promise.all(items.map(item => 
      deleteMutation.mutateAsync({ tipo: item.tipo, id: item.id })
    ));

    setSelectedItems(new Set());
    toast.success(`${items.length} itens excluídos`);
  };

  // Função auxiliar para editar HTML
  const editarDocumentoHTML = async (doc) => {
    console.log('[Repositorio] editarDocumentoHTML chamado:', doc.titulo);
    try {
      toast.info("Carregando documento...");
      const response = await fetch(doc.arquivo_url);
      const htmlContent = await response.text();
      const parser = new DOMParser();
      const parsed = parser.parseFromString(htmlContent, 'text/html');
      const contentDiv = parsed.querySelector('#content') || parsed.body;
      let markdown = (contentDiv?.innerHTML || '')
        .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        .replace(/<code>(.*?)<\/code>/g, '`$1`')
        .replace(/<pre><code>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n\n')
        .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
        .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
        .replace(/<li>(.*?)<\/li>/g, '- $1\n')
        .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      console.log('[Repositorio] Abrindo editor com:', { titulo: doc.titulo, markdownLength: markdown.length });
      setEditingDoc({ ...doc, conteudo_original: markdown });
      setShowTextEditor(true);
      toast.success("Documento carregado");
    } catch (error) {
      console.error('[Repositorio] Erro ao carregar documento:', error);
      toast.error(`Erro ao carregar: ${error.message}`);
    }
  };

  const getFileIcon = (item) => {
    if (item.tipo === 'pasta') return <FolderInput className="w-5 h-5 text-purple-600" />;
    if (item.tipo_documento === 'link_externo') return <Globe className="w-5 h-5 text-blue-600" />;
    
    const tipo = item.tipo_arquivo?.toLowerCase();
    const tiposImagem = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    
    if (tiposImagem.includes(tipo)) {
      return <div className="w-full h-full rounded overflow-hidden"><img src={item.arquivo_url} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} /></div>;
    }
    if (tipo === 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
    if (tipo === 'docx') return <FileText className="w-5 h-5 text-blue-600" />;
    if (tipo === 'html') return <Globe className="w-5 h-5 text-orange-600" />;
    if (['csv', 'txt'].includes(tipo)) return <FileText className="w-5 h-5 text-gray-600" />;
    
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const renderItem = (item) => {
    const isSelected = selectedItems.has(item.id);
    const isPasta = item.tipo === 'pasta';

    if (viewMode === 'lista' || viewMode === 'detalhes') {
      return (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onClick={async (e) => {
            if (selectionMode || e.shiftKey || e.ctrlKey) {
              e.preventDefault();
              toggleItemSelection(item.id);
            } else {
              const validacao = await validarPermissaoItem(item, 'visualizar');
              if (!validacao.permitido) {
                toast.error(`🔒 ${validacao.motivo}`);
                return;
              }
              if (isPasta) setPastaAtual(item.id);
              else if (item.tipo_documento === 'link_externo') window.open(item.url_externa, '_blank');
              else if (item.tipo_arquivo === 'pdf' || ['jpg','jpeg','png','gif','webp','svg'].includes(item.tipo_arquivo?.toLowerCase())) setShowVisualizadorPDF(item);
              else setViewerDoc(item);
            }
          }}
          className={`flex items-center gap-3 p-3 border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-purple-50' : ''}`}
        >
          {selectionMode && (
            <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); toggleItemSelection(item.id); }} className="w-4 h-4" />
          )}
          <div className="w-10 h-10 rounded flex items-center justify-center bg-gray-100">
            {getFileIcon(item)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.titulo || item.nome}</p>
            {!isPasta && <p className="text-xs text-gray-500">{item.tipo_arquivo?.toUpperCase()} • {(item.tamanho_bytes / 1024).toFixed(0)} KB</p>}
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-gray-200 rounded">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ zIndex: 99999 }}>
              {isPasta ? (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPastaAtual(item.id); }}>Abrir</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenamingItem(item); }}>Renomear</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if(confirm(`Excluir "${item.nome}"?`)) deleteMutation.mutate({tipo:'pasta',id:item.id}); }} className="text-red-600">Excluir</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); item.tipo_arquivo==='pdf'?setShowVisualizadorPDF(item):setViewerDoc(item); }}>Visualizar</DropdownMenuItem>
                  {item.tipo_arquivo==='html' && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); editarDocumentoHTML(item); }}>Editar</DropdownMenuItem>}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenamingItem(item); }}>Renomear</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMovingItem(item); }}>Mover</DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if(confirm(`Excluir "${item.titulo}"?`)) deleteMutation.mutate({tipo:'documento',id:item.id}); }} className="text-red-600">Excluir</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div key={item.id} draggable onDragStart={(e) => handleDragStart(e, item)} onDragEnd={handleDragEnd} onClick={async () => {
        if (selectionMode) { toggleItemSelection(item.id); return; }
        const validacao = await validarPermissaoItem(item, 'visualizar');
        if (!validacao.permitido) { toast.error(`🔒 ${validacao.motivo}`); return; }
        if (isPasta) setPastaAtual(item.id);
        else if (item.tipo_arquivo==='pdf') setShowVisualizadorPDF(item);
        else setViewerDoc(item);
      }} className={`w-24 p-2 border rounded hover:bg-gray-50 cursor-pointer ${isSelected?'bg-purple-50':''}`}>
        {selectionMode && <input type="checkbox" checked={isSelected} onChange={() => toggleItemSelection(item.id)} className="absolute top-2 left-2 w-4 h-4" />}
        <div className="w-10 h-10 mx-auto mb-1 bg-gray-100 rounded flex items-center justify-center">{getFileIcon(item)}</div>
        <p className="text-[10px] text-center truncate">{item.titulo || item.nome}</p>
      </div>
    );
  };
  return (
    <RouteGuard requireAuth>
      <div className="h-screen flex flex-col">
        <PageHeader
          title="Gerenciador de Arquivos"
          description="Sistema de arquivos com IA, pastas e multiview"
          action={
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FilePlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Novo</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setShowNovaPasta(true); setCreatingSubpasta(null); }}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Nova Pasta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setShowTextEditor(true); setEditingDoc(null); }}>
                    <FilePlus className="w-4 h-4 mr-2" />
                    Novo Texto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowNovoLinkExterno(true)}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Novo Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowImportarPDF(true)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Importar URL
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedItems.size >= 2 && !modoConexao && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const items = itensExibidos.filter(i => selectedItems.has(i.id) && i.tipo === 'documento');
                    if (items.length < 2) {
                      toast.error('Selecione ao menos 2 documentos');
                      return;
                    }
                    setModoConexao(true);
                    setDocumentosParaConectar(Array.from(selectedItems));
                  }}
                >
                  <Magnet className="w-4 h-4 mr-2" />
                  Montar Docker
                </Button>
              )}
              {modoConexao && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setModoConexao(false);
                    setDocumentosParaConectar([]);
                    setSelectedItems(new Set());
                  }}
                >
                  Cancelar Docker
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.html,.csv,.txt,.jpg,.jpeg,.png,.gif,.svg,.webp"
                onChange={handleBatchUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
            </div>
          }
        />

        {/* Progresso */}
        {progresso && (
          <div className="mx-6 mb-4 bg-white rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold">Upload em progresso...</p>
              <p className="text-sm text-gray-600">{progresso.processados}/{progresso.total}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${(progresso.processados / progresso.total) * 100}%` }}
              />
            </div>
            {progresso.duplicados > 0 && (
              <p className="text-xs text-orange-600">⚠️ {progresso.duplicados} duplicados ignorados</p>
            )}
            {progresso.erros > 0 && (
              <p className="text-xs text-red-600">❌ {progresso.erros} erros</p>
            )}
          </div>
        )}

        {/* Main Layout - RESPONSIVO */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* MOBILE: Drawer de Pastas */}
          {showPastasDrawer && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowPastasDrawer(false)} />
              <div className="fixed left-0 top-16 bottom-0 w-72 bg-white shadow-2xl z-50 lg:hidden overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center justify-between bg-purple-50">
                  <h3 className="text-sm font-bold text-gray-900">Pastas</h3>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1.5 hover:bg-purple-100 rounded"
                          aria-label="Opções de armazenamento"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("GestaoArmazenamento")} className="cursor-pointer">
                            <HardDrive className="w-4 h-4 mr-2" />
                            Gestão de Armazenamento
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => queryClient.invalidateQueries(["pastas-compliance", "compliance-docs"])}>
                          <Settings className="w-4 h-4 mr-2" />
                          Sincronizar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button onClick={() => setShowPastasDrawer(false)} className="p-1.5 hover:bg-purple-100 rounded">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  <FolderTree 
                    pastas={pastas} 
                    pastaAtual={pastaAtual} 
                    onSelectPasta={(id) => {
                      setPastaAtual(id);
                      setShowPastasDrawer(false);
                    }}
                    onCreateSubpasta={(pastaId) => {
                      setCreatingSubpasta(pastaId);
                      setShowNovaPasta(true);
                    }}
                    onContextAction={(action, pasta) => {
                      switch (action) {
                        case 'renomear':
                          setRenamingItem({ ...pasta, tipo: 'pasta' });
                          break;
                        case 'compartilhar':
                          setShowCompartilhar({ ...pasta, tipo: 'pasta' });
                          break;
                        case 'excluir':
                          if (confirm(`Excluir "${pasta.nome}"?`)) {
                            deleteMutation.mutate({ tipo: 'pasta', id: pasta.id });
                          }
                          break;
                      }
                    }}
                    onDropOnFolder={handleDropOnFolder}
                  />
                </div>
                <DiskUsageMonitor documentos={documentos} />
              </div>
            </>
          )}

          <ResizablePanelGroup direction="horizontal">
            {/* Sidebar Pastas - DESKTOP */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="hidden lg:block">
              <div className="h-full border-r bg-white overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-500 uppercase">Pastas</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setShowNovaPasta(true); setCreatingSubpasta(null); }}
                      className="p-1 hover:bg-gray-100 rounded"
                      aria-label="Nova pasta"
                    >
                      <FolderPlus className="w-4 h-4 text-purple-600" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 hover:bg-gray-100 rounded"
                          aria-label="Opções de armazenamento"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl("GestaoArmazenamento")} className="cursor-pointer">
                            <HardDrive className="w-4 h-4 mr-2" />
                            Gestão de Armazenamento
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => queryClient.invalidateQueries(["pastas-compliance", "compliance-docs"])}>
                          <Settings className="w-4 h-4 mr-2" />
                          Sincronizar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3">
                  <FolderTree 
                    pastas={pastas} 
                    pastaAtual={pastaAtual} 
                    onSelectPasta={setPastaAtual}
                    onCreateSubpasta={(pastaId) => {
                      setCreatingSubpasta(pastaId);
                      setShowNovaPasta(true);
                    }}
                    onContextAction={(action, pasta) => {
                      switch (action) {
                        case 'renomear':
                          setRenamingItem({ ...pasta, tipo: 'pasta' });
                          break;
                        case 'compartilhar':
                          setShowCompartilhar({ ...pasta, tipo: 'pasta' });
                          break;
                        case 'excluir':
                          if (confirm(`Excluir "${pasta.nome}"?`)) {
                            deleteMutation.mutate({ tipo: 'pasta', id: pasta.id });
                          }
                          break;
                      }
                    }}
                    onDropOnFolder={handleDropOnFolder}
                  />
                </div>
                <DiskUsageMonitor documentos={documentos} />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle className="hidden lg:flex" />

            {/* Content - FULL WIDTH EM MOBILE */}
            <ResizablePanel defaultSize={80} className="w-full">
              <div className="h-full flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b p-2 sm:p-3 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
              {/* MOBILE: Botão Pastas */}
              <button
                onClick={() => setShowPastasDrawer(true)}
                className="lg:hidden p-2 hover:bg-purple-50 rounded-lg border border-purple-200 flex items-center gap-2"
              >
                <FolderInput className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Pastas</span>
              </button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar..."
                    className="pl-10"
                  />
                </div>
                {busca.trim() && (
                 <div className="flex items-center gap-2">
                   <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                     🔍 Busca global
                   </span>
                   {itensExibidos.some(i => i.vinculado_a?.tipo) && (
                     <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                       🔗 {itensExibidos.filter(i => i.vinculado_a?.tipo).length} vinculados
                     </span>
                   )}
                 </div>
                )}
                {modoConexao && documentosParaConectar.length >= 2 && (
                 <div className="flex items-center gap-2 ml-4">
                   <span className="text-sm text-blue-600 font-medium">
                     {documentosParaConectar.length} docs no Docker
                   </span>
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const titulo = prompt('Nome do Docker:', `Docker_${documentosParaConectar.length}_docs`);
                        if (titulo) {
                          conectarDocumentosMutation.mutate({
                            documentos_ids: documentosParaConectar,
                            titulo,
                            pasta_id: pastaAtual
                          });
                        }
                      }}
                    >
                      <Magnet className="w-4 h-4 mr-1" />
                      Finalizar Docker
                    </Button>
                  </div>
                )}
                {!modoConexao && selectedItems.size > 0 && (
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                    <span className="text-sm text-purple-700 font-bold">{selectedItems.size}</span>
                    <Button variant="ghost" size="sm" onClick={handleBulkMove}>Mover</Button>
                    <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-red-600">Excluir</Button>
                    <button onClick={deselectAll} className="p-1 hover:bg-purple-100 rounded"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* MOBILE: Ativar seleção */}
                <Button 
                  variant={selectionMode ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => {
                    if (selectionMode) {
                      deselectAll();
                    } else {
                      setSelectionMode(true);
                    }
                  }}
                  className="lg:hidden h-8 px-3"
                >
                  {selectionMode ? 'Cancelar' : 'Selecionar'}
                </Button>
                {selectionMode && (
                  <Button variant="outline" size="sm" onClick={selectAll} className="h-8 px-3">
                    Tudo
                  </Button>
                )}
                {/* VIEW SWITCHER DROPDOWN - COM ESTADO VISUAL */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      {viewMode === 'lista' && <List className="w-4 h-4" />}
                      {viewMode === 'detalhes' && <Grid className="w-4 h-4" />}
                      {(viewMode === 'blocos' || viewMode.startsWith('icones')) && <LayoutGrid className="w-4 h-4" />}
                      <span className="hidden sm:inline text-xs">{
                        viewMode === 'lista' ? 'Lista' :
                        viewMode === 'detalhes' ? 'Detalhes' :
                        viewMode === 'blocos' ? 'Blocos' :
                        viewMode === 'icones-grandes' ? 'Ícones G' :
                        viewMode === 'icones-medios' ? 'Ícones M' :
                        'Ícones P'
                      }</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewMode('lista')} className={viewMode === 'lista' ? 'bg-purple-50' : ''}>
                      <List className="w-4 h-4 mr-2" />
                      Lista
                      {viewMode === 'lista' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('detalhes')} className={viewMode === 'detalhes' ? 'bg-purple-50' : ''}>
                      <Grid className="w-4 h-4 mr-2" />
                      Detalhes
                      {viewMode === 'detalhes' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('blocos')} className={viewMode === 'blocos' ? 'bg-purple-50' : ''}>
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Blocos
                      {viewMode === 'blocos' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('icones-grandes')} className={viewMode === 'icones-grandes' ? 'bg-purple-50' : ''}>
                      Ícones Grandes
                      {viewMode === 'icones-grandes' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('icones-medios')} className={viewMode === 'icones-medios' ? 'bg-purple-50' : ''}>
                      Ícones Médios
                      {viewMode === 'icones-medios' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('icones-pequenos')} className={viewMode === 'icones-pequenos' ? 'bg-purple-50' : ''}>
                      Ícones Pequenos
                      {viewMode === 'icones-pequenos' && <CheckCircle2 className="w-4 h-4 ml-auto text-purple-600" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Items Grid - Drag & Drop com Badge */}
            <div 
              className={`flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50 transition-colors relative ${isDragging ? 'bg-purple-50 border-2 border-dashed border-purple-400' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Badge de Drag */}
              {draggedItems && (
                <div className="fixed bottom-20 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 pointer-events-none">
                  <Move className="w-4 h-4" />
                  <span className="font-bold">{draggedItems.count} {draggedItems.count === 1 ? 'arquivo' : 'arquivos'}</span>
                </div>
              )}
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-purple-100/90 pointer-events-none">
                  <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
                    <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 mx-auto mb-3 sm:mb-4" />
                    <p className="text-lg sm:text-xl font-bold text-gray-900">Solte os arquivos aqui</p>
                  </div>
                </div>
              )}
              {loadingDocs || loadingPastas ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                </div>
              ) : itensExibidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                  <Upload className="w-12 h-12 sm:w-16 sm:h-16 mb-3" />
                  <p className="text-base sm:text-lg font-medium text-center">Arraste arquivos aqui</p>
                  <p className="text-xs sm:text-sm text-center">ou clique em Upload</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dockers (Conexões) */}
                  {conexoes
                    .filter(c => c.pasta_id === pastaAtual && c.ativo)
                    .map(conexao => (
                      <DockerView
                        key={conexao.id}
                        conexao={conexao}
                        documentos={documentos}
                        onDesconectar={(id) => desconectarDocumentosMutation.mutate(id)}
                      />
                    ))}

                  {/* Itens normais */}
                  <div className={`
                    ${viewMode === 'lista' || viewMode === 'detalhes' ? 'space-y-1' : 'grid gap-2'}
                    ${viewMode === 'blocos' ? 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))]' : ''}
                    ${viewMode === 'icones-grandes' ? 'grid-cols-[repeat(auto-fill,minmax(80px,1fr))]' : ''}
                    ${viewMode === 'icones-medios' ? 'grid-cols-[repeat(auto-fill,minmax(64px,1fr))]' : ''}
                    ${viewMode === 'icones-pequenos' ? 'grid-cols-[repeat(auto-fill,minmax(56px,1fr))]' : ''}
                  `}>
                    {itensExibidos.filter(item => !item.conexao_id).map(item => renderItem(item))}
                  </div>

                  {/* Paginação - Carregar mais */}
                  {!busca && documentos.length >= paginaDocs * DOCS_POR_PAGINA && (
                    <div className="text-center py-6">
                      <Button
                        variant="outline"
                        onClick={() => setPaginaDocs(p => p + 1)}
                        disabled={fetchingDocs}
                      >
                        {fetchingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Carregar mais {DOCS_POR_PAGINA} documentos
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        {documentos.length} de {documentos.length >= paginaDocs * DOCS_POR_PAGINA ? '?' : documentos.length} carregados
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detail Panel - SEMPRE RENDERIZAR */}
            {showDetailPanel && detailItem && (
              <div className="fixed inset-y-0 right-0 z-[9998] w-96 bg-white shadow-2xl border-l overflow-y-auto">
                <DetailPanel item={detailItem} onClose={() => setShowDetailPanel(false)} />
              </div>
            )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            item={contextMenu.item}
            onClose={() => setContextMenu(null)}
            onAction={(action) => handleMenuAction(action, contextMenu.item)}
          />
        )}

        {/* Modal Nova Pasta/Subpasta */}
        {(showNovaPasta || creatingSubpasta !== null) && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">
                {creatingSubpasta !== null ? "Nova Subpasta" : "Nova Pasta"}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                createPastaMutation.mutate({
                  nome: formData.get('nome'),
                  pasta_pai_id: creatingSubpasta !== null ? creatingSubpasta : null,
                  cor: '#7E57FF',
                  ordem: 0
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome da {creatingSubpasta !== null ? 'Subpasta' : 'Pasta'}
                  </label>
                  <Input name="nome" required placeholder="Ex: Políticas ISO" autoFocus />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowNovaPasta(false);
                      setCreatingSubpasta(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPastaMutation.isPending}>
                    {createPastaMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Criar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Metadados - SEM SlideInPanel */}
        {showEditMetadata && editingItem && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Editar Metadados</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                updateMetadataMutation.mutate({
                  id: editingItem.id,
                  data: {
                    titulo: formData.get('titulo'),
                    descricao: formData.get('descricao'),
                    tags: formData.get('tags').split(',').map(t => t.trim()).filter(Boolean)
                  }
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <Input name="titulo" defaultValue={editingItem.titulo} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea
                    name="descricao"
                    defaultValue={editingItem.descricao}
                    className="w-full border rounded p-2 text-sm"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (separadas por vírgula)</label>
                  <Input name="tags" defaultValue={editingItem.tags?.join(', ')} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowEditMetadata(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMetadataMutation.isPending}>
                    {updateMetadataMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Renomear */}
        {renamingItem && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Renomear</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const nome = new FormData(e.target).get('nome');
                renameMutation.mutate({ tipo: renamingItem.tipo, id: renamingItem.id, nome });
              }}>
                <Input
                  name="nome"
                  defaultValue={renamingItem.titulo || renamingItem.nome}
                  required
                  autoFocus
                  className="mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setRenamingItem(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={renameMutation.isPending}>
                    {renameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Renomear'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Mover Avançado */}
        {movingItem && (
          <ModalMoverAvancado
            item={movingItem}
            pastas={pastas}
            onMove={(pasta_id) => moveMutation.mutateAsync({ 
              id: movingItem.id, 
              pasta_id,
              isBulk: movingItem.isBulk,
              bulkIds: movingItem.bulkIds
            })}
            onClose={() => setMovingItem(null)}
            onCreatePasta={async (data) => {
              await createPastaMutation.mutateAsync({ ...data, cor: '#7E57FF', ordem: 0 });
              toast.success("Pasta criada");
            }}
          />
        )}

        {/* Universal Viewer */}
        {viewerDoc && (
          <UniversalDocViewer 
            item={viewerDoc} 
            onClose={() => setViewerDoc(null)}
            onEdit={(doc) => {
              setViewerDoc(null);
              editarDocumentoHTML(doc);
            }}
          />
        )}

        {/* Text Editor - SEM SlideInPanel quebrado */}
        {showTextEditor && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg">{editingDoc ? "✏️ Editar Documento" : "✍️ Novo Documento"}</h3>
                <button
                  onClick={() => {
                    setShowTextEditor(false);
                    setEditingDoc(null);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TextEditor 
                  initialTitle={editingDoc?.titulo || ''}
                  initialContent={editingDoc?.conteudo_original || ''}
                  onSave={(titulo, conteudo) => {
                    if (editingDoc) {
                      handleTextEditorUpdate(editingDoc.id, titulo, conteudo);
                    } else {
                      handleTextEditorSave(titulo, conteudo);
                    }
                  }}
                  onCancel={() => {
                    setShowTextEditor(false);
                    setEditingDoc(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Novo Link Externo */}
        {showNovoLinkExterno && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">Novo Link Externo</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                criarLinkExternoMutation.mutate({
                  titulo: formData.get('titulo'),
                  descricao: formData.get('descricao'),
                  url_externa: formData.get('url_externa'),
                  tipo_documento: formData.get('tipo_documento'),
                  pasta_id: pastaAtual,
                  tags: formData.get('tags').split(',').map(t => t.trim()).filter(Boolean),
                  indexado: false,
                  versao: 1
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título *</label>
                  <Input name="titulo" required placeholder="Ex: API Twilio WhatsApp" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL *</label>
                  <Input name="url_externa" type="url" required placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select name="tipo_documento" className="w-full border rounded p-2 text-sm">
                    <option value="link_externo">Link Externo</option>
                    <option value="api_doc">API Documentation</option>
                    <option value="swagger">Swagger/OpenAPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea name="descricao" className="w-full border rounded p-2 text-sm" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tags (separadas por vírgula)</label>
                  <Input name="tags" placeholder="twilio, api, whatsapp" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowNovoLinkExterno(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarLinkExternoMutation.isPending}>
                    {criarLinkExternoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Criar Link
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Importar PDF via URL */}
        {showImportarPDF && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Importar PDF/Doc via URL</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                importarPDFMutation.mutate({
                  url: formData.get('url'),
                  titulo: formData.get('titulo'),
                  pasta_id: pastaAtual
                });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">URL do Arquivo *</label>
                  <Input name="url" type="url" required placeholder="https://example.com/document.pdf" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Título (opcional)</label>
                  <Input name="titulo" placeholder="Nome do documento" />
                </div>
                <div className="bg-blue-50 p-3 rounded text-xs text-gray-700">
                <p className="font-medium mb-1">Formatos suportados:</p>
                <p>PDF, DOCX, HTML, CSV, TXT, Imagens (JPG, PNG, SVG, WEBP, GIF)</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowImportarPDF(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={importarPDFMutation.isPending}>
                    {importarPDFMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Importar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Universal Viewer - PDF/HTML/Imagens com TOC */}
        {showVisualizadorPDF && (
          <UniversalDocViewer 
            item={showVisualizadorPDF} 
            onClose={() => setShowVisualizadorPDF(null)}
            onEdit={(doc) => {
              setShowVisualizadorPDF(null);
              editarDocumentoHTML(doc);
            }}
          />
        )}

        {/* Painel Duplicados */}
        <DuplicatePanel
          isOpen={showDuplicatePanel}
          onClose={() => {
            setShowDuplicatePanel(false);
            setDuplicateInfo(null);
            setPendingUpload(null);
          }}
          duplicateInfo={duplicateInfo}
          onKeepBoth={async () => {
            try {
              const upload = pendingUpload;
              await base44.entities.DocumentoCompliance.create({
                clinica_id: isSuperAdmin ? null : clinicaId,
                titulo: `${upload.titulo} (cópia)`,
                pasta_id: pastaAtual,
                categoria: 'outros',
                arquivo_url: upload.file_url,
                tipo_arquivo: 'html',
                tamanho_bytes: upload.blob.size,
                tags: [],
                indexado: false,
                versao: 1
              });
              queryClient.invalidateQueries(["compliance-docs"]);
              toast.success("Salvos ambos os documentos");
            } catch (error) {
              toast.error(`Erro: ${error.message}`);
            } finally {
              setShowDuplicatePanel(false);
              setPendingUpload(null);
            }
          }}
          onReplace={async () => {
            try {
              const upload = pendingUpload;
              const existing = duplicateInfo.existingDoc;

              // SALVAR VERSÃO ANTERIOR primeiro
              await base44.functions.invoke('salvarVersaoDocumento', {
                documento_id: existing.id,
                tipo_alteracao: 'substituicao_arquivo',
                observacao: 'Substituição por arquivo duplicado'
              });

              await base44.entities.DocumentoCompliance.update(existing.id, {
                arquivo_url: upload.file_url,
                tamanho_bytes: upload.blob.size,
                versao: (existing.versao || 1) + 1
              });
              queryClient.invalidateQueries(["compliance-docs"]);
              toast.success("✅ Documento substituído (versão anterior salva)");
            } catch (error) {
              toast.error(`Erro: ${error.message}`);
            } finally {
              setShowDuplicatePanel(false);
              setPendingUpload(null);
            }
          }}
          onCancel={() => {
            setShowDuplicatePanel(false);
            setDuplicateInfo(null);
            setPendingUpload(null);
            toast.info("Upload cancelado");
          }}
        />

        {/* Permission Manager */}
        {showPermissionManager && permissionTarget && (
          <PermissionManager
            item={permissionTarget}
            onClose={() => {
              setShowPermissionManager(false);
              setPermissionTarget(null);
            }}
          />
        )}

        {/* Audit Log Panel */}
        {showAuditLog && auditLogTarget && (
          <AuditLogPanel
            item={auditLogTarget}
            onClose={() => {
              setShowAuditLog(false);
              setAuditLogTarget(null);
            }}
          />
        )}

        {/* Histórico de Versões */}
        {showHistoricoVersoes && historicoVersaoTarget && (
          <HistoricoVersoesPanel
            documento={historicoVersaoTarget}
            onClose={() => {
              setShowHistoricoVersoes(false);
              setHistoricoVersaoTarget(null);
            }}
          />
        )}

        {/* Modal Enviar Assinatura */}
        {showEnviarAssinatura && assinaturaTarget && (
          <ModalEnviarAssinatura
            documento={assinaturaTarget}
            onClose={() => {
              setShowEnviarAssinatura(false);
              setAssinaturaTarget(null);
            }}
          />
        )}

        {/* Modal Compartilhar */}
        {showCompartilhar && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                Compartilhar {showCompartilhar.tipo === 'pasta' ? 'Pasta' : 'Documento'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {showCompartilhar.nome || showCompartilhar.titulo}
              </p>
              {showCompartilhar.compartilhamento_publico ? (
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Link público:</p>
                    <p className="text-sm font-mono text-purple-600 break-all">{showCompartilhar.link_compartilhamento}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      navigator.clipboard.writeText(showCompartilhar.link_compartilhamento);
                      toast.success("Link copiado!");
                    }} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button variant="outline" onClick={() => {
                      if (confirm('Revogar compartilhamento público?')) {
                        revogarCompartilhamentoMutation.mutate({ 
                          tipo: showCompartilhar.tipo || 'pasta', 
                          id: showCompartilhar.id 
                        });
                      }
                    }} className="flex-1 text-red-600">
                      Revogar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => {
                  if (showCompartilhar.tipo === 'pasta') {
                    compartilharMutation.mutate(showCompartilhar.id);
                  } else {
                    compartilharDocumentoMutation.mutate(showCompartilhar.id);
                  }
                }} disabled={compartilharMutation.isPending || compartilharDocumentoMutation.isPending} className="w-full">
                  {(compartilharMutation.isPending || compartilharDocumentoMutation.isPending) ? 
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 
                    <Share2 className="w-4 h-4 mr-2" />
                  }
                  Gerar Link Público
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowCompartilhar(null)} className="w-full mt-3">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}