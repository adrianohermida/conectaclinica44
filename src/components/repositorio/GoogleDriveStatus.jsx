import React from 'react';
import { Cloud, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GoogleDriveStatus({ onConnect }) {
  const [connected, setConnected] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    // Simples check - tentar chamar função que requer OAuth
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/functions/uploadToGoogleDrive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_only: true })
        });
        setConnected(response.status !== 403);
      } catch {
        setConnected(false);
      } finally {
        setChecking(false);
      }
    };
    checkConnection();
  }, []);

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Cloud className="w-4 h-4 animate-pulse" />
        Verificando Google Drive...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {connected ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Google Drive conectado
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            Drive desconectado
          </div>
          <Button
            size="sm"
            onClick={onConnect}
            className="flex items-center gap-2"
          >
            <Cloud className="w-4 h-4" />
            Conectar Drive
          </Button>
        </div>
      )}
      {connected && (
        <a
          href="https://drive.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Abrir Drive
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}