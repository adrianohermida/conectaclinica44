import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Image, Trash2, Eye, Download, Loader2, X, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * GALERIA DE DOCUMENTOS - Upload direto vinculado a Paciente/Contato
 * Solução P0: Contextualizar repositório com entidades clínicas
 */
export default function GaleriaDocumentos({ paciente, tipo = "paciente" }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['docs-vinculados', tipo, paciente.id],
    queryFn: async () => {
      return await base44.entities.DocumentoCompliance.filter({
        'vinculado_a.tipo': tipo,
        'vinculado_a.id': paciente.id
      }, '-created_date', 100);
    },
    enabled: !!paciente.id
  });

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      // Auto-criar pasta do paciente se não existir
      const pastaResponse = await base44.functions.invoke('criarSubpastaPaciente', {
        paciente_id: paciente.id,
        clinica_id: paciente.clinica_id
      });
      
      const pasta_id = pastaResponse.data.pasta_id;

      const results = [];
      for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const doc = await base44.entities.DocumentoCompliance.create({
          titulo: file.name.replace(/\.[^/.]+$/, ""),
          categoria: detectarCategoria(file.name, ext),
          arquivo_url: file_url,
          tipo_arquivo: ext,
          tamanho_bytes: file.size,
          versao: 1,
          pasta_id,
          vinculado_a: {
            tipo,
            id: paciente.id,
            nome: paciente.nome_completo
          }
        });

        results.push(doc);
      }
      return results;
    },
    onSuccess: (docs) => {
      queryClient.invalidateQueries(['docs-vinculados']);
      toast.success(`✅ ${docs.length} documento(s) anexado(s)`);
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DocumentoCompliance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['docs-vinculados']);
      toast.success("Documento removido");
    }
  });

  const detectarCategoria = (filename, ext) => {
    const lower = filename.toLowerCase();
    if (lower.includes('exame')) return 'exame';
    if (lower.includes('laudo')) return 'laudo';
    if (lower.includes('atestado')) return 'atestado';
    if (lower.includes('receita')) return 'receita';
    if (lower.includes('prontuario') || lower.includes('prontuário')) return 'prontuario';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'exame';
    if (ext === 'pdf') return 'laudo';
    return 'outros';
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    uploadMutation.mutate(files);
    e.target.value = null;
  };

  const getIcon = (doc) => {
    const tipo = doc.tipo_arquivo?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(tipo)) {
      return <Image className="w-5 h-5 text-blue-600" />;
    }
    return <FileText className="w-5 h-5 text-purple-600" />;
  };

  const getCategoriaColor = (cat) => {
    const colors = {
      'exame': 'bg-blue-100 text-blue-700',
      'laudo': 'bg-purple-100 text-purple-700',
      'atestado': 'bg-green-100 text-green-700',
      'receita': 'bg-orange-100 text-orange-700',
      'prontuario': 'bg-indigo-100 text-indigo-700',
      'outros': 'bg-gray-100 text-gray-700'
    };
    return colors[cat] || colors.outros;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-dashed border-purple-300">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">Documentos Clínicos</h4>
            <p className="text-xs text-gray-600">Exames, laudos, atestados vinculados automaticamente</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </div>
      </div>

      {/* Lista de Documentos */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
        </div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2" />
          <p className="text-sm">Nenhum documento anexado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentos.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getIcon(doc)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoriaColor(doc.categoria)}`}>
                      {doc.categoria}
                    </span>
                    <span className="text-xs text-gray-500">v{doc.versao || 1}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.created_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => window.open(doc.arquivo_url, '_blank')}
                    className="p-1.5 hover:bg-blue-50 rounded"
                    title="Visualizar"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => window.open(doc.arquivo_url, '_blank')}
                    className="p-1.5 hover:bg-green-50 rounded"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir "${doc.titulo}"?`)) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 rounded"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}