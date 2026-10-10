import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AvatarUploadModal({ contato, open, onClose }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    // Validação
    if (!selectedFile.type.startsWith('image/')) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }

    setFile(selectedFile);
    
    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult?.file_url) {
        throw new Error("Erro no upload");
      }

      // Capturar metadata de auditoria (IP, geolocalização, timestamp)
      const metadata = {
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip: 'capturado_no_backend', // IP só é confiável no backend
        geolocation: null // Pedir permissão se necessário
      };

      // Tentar capturar geolocalização (opcional)
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        metadata.geolocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (e) {
        // Geolocalização negada ou indisponível
      }

      await base44.entities.Contato.update(contato.id, {
        avatar_url: uploadResult.file_url,
        avatar_metadata: metadata
      });

      return uploadResult.file_url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["contato", contato.id]);
      queryClient.invalidateQueries(["contatos"]);
      toast.success("Foto atualizada com registro de auditoria!");
      onClose();
      setFile(null);
      setPreview(null);
    },
    onError: (error) => {
      console.error("Erro upload avatar:", error);
      toast.error("Erro ao atualizar foto");
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="pc-card max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 pc-transition"
        >
          <X className="w-5 h-5" style={{ color: 'var(--pc-text-tertiary)' }} />
        </button>

        <h2 className="pc-heading-4 mb-4">Alterar Foto de Perfil</h2>

        {/* PREVIEW */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold"
            style={{ 
              backgroundColor: preview ? 'transparent' : 'var(--pc-primary-50)',
              color: 'var(--pc-primary)',
              backgroundImage: preview ? `url(${preview})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {!preview && contato.nome_completo?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* UPLOAD */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files[0])}
          className="hidden"
        />

        <div className="space-y-3">
          <Button 
            variant="secondary"
            onClick={() => inputRef.current?.click()} 
            className="w-full"
            disabled={uploading}
          >
            <Camera className="w-4 h-4 mr-2" />
            Selecionar Foto
          </Button>

          {file && (
            <Button 
              onClick={() => uploadMutation.mutate()} 
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar Upload
                </>
              )}
            </Button>
          )}
        </div>

        <p className="pc-caption text-center mt-4">
          Formatos: JPG, PNG, GIF (máx 5MB)
        </p>
      </div>
    </div>
  );
}