import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Image, Eye, Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

/**
 * GALERIA DE EXAMES - Mostrar documentos vinculados a Prontuário
 */
export default function GaleriaExames({ prontuario }) {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);

  const { data: exames = [], isLoading } = useQuery({
    queryKey: ['exames-prontuario', prontuario.id],
    queryFn: async () => {
      return await base44.entities.DocumentoCompliance.filter({
        'vinculado_a.tipo': 'prontuario',
        'vinculado_a.id': prontuario.id
      }, '-created_date', 50);
    },
    enabled: !!prontuario.id
  });

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const results = [];
      for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const doc = await base44.entities.DocumentoCompliance.create({
          titulo: file.name.replace(/\.[^/.]+$/, ""),
          categoria: ext === 'pdf' ? 'laudo' : 'exame',
          arquivo_url: file_url,
          tipo_arquivo: ext,
          tamanho_bytes: file.size,
          versao: 1,
          vinculado_a: {
            tipo: 'prontuario',
            id: prontuario.id,
            nome: prontuario.paciente_nome
          }
        });

        results.push(doc);
      }
      return results;
    },
    onSuccess: (docs) => {
      queryClient.invalidateQueries(['exames-prontuario']);
      toast.success(`✅ ${docs.length} exame(s) anexado(s)`);
      setUploading(false);
    }
  });

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    uploadMutation.mutate(files);
    e.target.value = null;
  };

  const examesImagem = exames.filter(e => 
    ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(e.tipo_arquivo?.toLowerCase())
  );

  const examesPDF = exames.filter(e => e.tipo_arquivo?.toLowerCase() === 'pdf');

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
      </div>
    );
  }

  if (exames.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm">Nenhum exame anexado a este prontuário</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Imagens */}
      {examesImagem.length > 0 && (
        <div>
          <h4 className="font-bold text-sm text-gray-700 mb-3">Imagens ({examesImagem.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {examesImagem.map((img) => (
              <div key={img.id} className="relative group">
                <img 
                  src={img.arquivo_url} 
                  alt={img.titulo}
                  className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition"
                  onClick={() => window.open(img.arquivo_url, '_blank')}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 rounded-lg">
                  <button
                    onClick={() => window.open(img.arquivo_url, '_blank')}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4 text-gray-900" />
                  </button>
                  <button
                    onClick={() => window.open(img.arquivo_url, '_blank')}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4 text-gray-900" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">{img.titulo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDFs e Laudos */}
      {examesPDF.length > 0 && (
        <div>
          <h4 className="font-bold text-sm text-gray-700 mb-3">Laudos e PDFs ({examesPDF.length})</h4>
          <div className="space-y-2">
            {examesPDF.map((pdf) => (
              <div key={pdf.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50">
                <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{pdf.titulo}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(pdf.created_date).toLocaleDateString('pt-BR')} • {(pdf.tamanho_bytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => window.open(pdf.arquivo_url, '_blank')}
                    className="p-2 hover:bg-blue-50 rounded"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => window.open(pdf.arquivo_url, '_blank')}
                    className="p-2 hover:bg-green-50 rounded"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}