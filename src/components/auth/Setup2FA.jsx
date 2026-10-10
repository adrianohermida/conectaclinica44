import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Copy, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import QRCode from "qrcode";

export default function Setup2FA({ onComplete }) {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const generateSecret = async () => {
      const user = await base44.auth.me();
      const newSecret = generateBase32Secret();
      const otpauth = `otpauth://totp/PrevenClin:${user.email}?secret=${newSecret}&issuer=PrevenClin`;
      
      const qr = await QRCode.toDataURL(otpauth);
      setQrCode(qr);
      setSecret(newSecret);
    };

    generateSecret();
  }, []);

  const enable2FAMutation = useMutation({
    mutationFn: async ({ secret, code }) => {
      const isValid = await base44.functions.invoke("validate2FA", { secret, code });
      if (!isValid.data.valid) throw new Error("Código inválido");
      
      await base44.auth.updateMe({ 
        twofa_enabled: true, 
        twofa_secret: secret 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["currentUser"]);
      alert("✅ 2FA ativado com sucesso!");
      onComplete?.();
    }
  });

  const handleEnable = () => {
    if (code.length !== 6) {
      alert("Código deve ter 6 dígitos");
      return;
    }
    enable2FAMutation.mutate({ secret, code });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <Shield className="w-16 h-16 text-[#0B7A9E] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Configurar Autenticação em 2 Fatores</h2>
        <p className="text-gray-600">Escaneie o QR code com Google Authenticator ou Authy</p>
      </div>

      {qrCode && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <img src={qrCode} alt="QR Code" className="mx-auto mb-4" />
          <p className="text-sm text-gray-600 mb-2">Ou insira manualmente:</p>
          <div className="flex items-center gap-2 justify-center">
            <code className="bg-gray-100 px-3 py-2 rounded text-sm">{secret}</code>
            <button onClick={copySecret} className="p-2 hover:bg-gray-100 rounded">
              {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Digite o código de 6 dígitos do app
        </label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="text-center text-2xl tracking-widest"
          maxLength={6}
        />
      </div>

      <button
        onClick={handleEnable}
        disabled={code.length !== 6 || enable2FAMutation.isPending}
        className="w-full bg-[#0B7A9E] hover:bg-[#0a6582] text-white font-bold py-3 rounded-lg disabled:opacity-50"
      >
        {enable2FAMutation.isPending ? "Verificando..." : "Ativar 2FA"}
      </button>
    </div>
  );
}

function generateBase32Secret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}