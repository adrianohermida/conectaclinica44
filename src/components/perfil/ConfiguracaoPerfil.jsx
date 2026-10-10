import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { User, Upload } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracaoPerfil({ user }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
    onSuccess: async (fileUrl) => {
      await base44.auth.updateMe({ avatar_url: fileUrl });
      queryClient.invalidateQueries(["auth-user"]);
      setUploading(false);
      toast.success("Foto atualizada");
    },
    onError: (error) => {
      setUploading(false);
      toast.error("Erro ao enviar: " + error.message);
    }
  });

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return;
    }
    
    setUploading(true);
    uploadAvatarMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3" style={{ color: '#202124' }}>
          Foto de Perfil
        </label>
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                className="w-20 h-20 rounded-full object-cover border-2"
                style={{ borderColor: '#7E57FF' }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#f5f3ff] flex items-center justify-center border-2"
                style={{ borderColor: '#7E57FF' }}>
                <User className="w-10 h-10" style={{ color: '#7E57FF' }} />
              </div>
            )}
            {user?.status_online && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-all"
              style={{ backgroundColor: uploading ? '#bdc1c6' : '#7E57FF' }}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Alterar Foto
                </>
              )}
            </label>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF (máx 5MB)</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
          Nome Completo
        </label>
        <Input
          value={user?.full_name || ''}
          disabled
          className="bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">Contate o administrador para alterar</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
          Email
        </label>
        <Input
          value={user?.email || ''}
          disabled
          className="bg-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
          Perfil
        </label>
        <Input
          value={user?.perfil || 'user'}
          disabled
          className="bg-gray-100"
        />
      </div>
    </div>
  );
}