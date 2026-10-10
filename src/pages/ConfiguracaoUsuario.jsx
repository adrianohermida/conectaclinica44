import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, Globe, Save } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";

export default function ConfiguracaoUsuario() {
  return (
    <RouteGuard requireAuth>
      <ConfiguracaoUsuarioContent />
    </RouteGuard>
  );
}

function ConfiguracaoUsuarioContent() {
  const queryClient = useQueryClient();
  
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const [timezone, setTimezone] = useState(user?.timezone_configurado || 'America/Sao_Paulo');

  const salvarMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ timezone_configurado: timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["auth-user"]);
      toast.success("✅ Preferências salvas");
      setTimeout(() => window.location.reload(), 1000);
    }
  });

  const timezonesBrasil = [
    { value: 'America/Sao_Paulo', label: '🇧🇷 São Paulo (Brasília) - UTC-3', estados: 'SP, RJ, MG, PR, SC, RS, DF' },
    { value: 'America/Manaus', label: '🇧🇷 Manaus - UTC-4', estados: 'AM, RR, RO, MT' },
    { value: 'America/Fortaleza', label: '🇧🇷 Fortaleza (Fernando de Noronha) - UTC-3', estados: 'CE, MA, PI, RN, PB, PE, AL, SE, BA, TO' },
    { value: 'America/Belem', label: '🇧🇷 Belém - UTC-3', estados: 'PA, AP' },
    { value: 'America/Rio_Branco', label: '🇧🇷 Rio Branco - UTC-5', estados: 'AC' },
    { value: 'America/Noronha', label: '🇧🇷 Fernando de Noronha - UTC-2', estados: 'PE (arquipélago)' }
  ];

  if (!user) return <div className="flex items-center justify-center min-h-screen"><Clock className="w-8 h-8 animate-spin" style={{ color: '#7E57FF' }} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="⚙️ Preferências"
        description="Configure seu perfil e preferências do sistema"
      />

      <div className="pc-card p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
              <Clock className="w-6 h-6" style={{ color: '#7E57FF' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold" style={{ color: '#202124' }}>Fuso Horário</h3>
              <p className="text-sm" style={{ color: '#5f6368' }}>Todos timestamps serão exibidos no seu horário local</p>
            </div>
          </div>

          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezonesBrasil.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  <div>
                    <div className="font-semibold">{tz.label}</div>
                    <div className="text-xs text-gray-500">{tz.estados}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#e8f4fd' }}>
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 mt-0.5" style={{ color: '#0B7A9E' }} />
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: '#0B7A9E' }}>Preview de Horário</p>
                <p className="text-xs" style={{ color: '#5f6368' }}>
                  Agora: {new Intl.DateTimeFormat('pt-BR', {
                    timeZone: timezone,
                    dateStyle: 'full',
                    timeStyle: 'long'
                  }).format(new Date())}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: '#e8eaed' }}>
          <Button
            onClick={() => salvarMutation.mutate()}
            disabled={salvarMutation.isPending}
            className="rounded-xl font-semibold"
            style={{ backgroundColor: '#7E57FF', color: 'white', minHeight: '48px' }}
          >
            <Save className="w-4 h-4 mr-2" />
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar Preferências'}
          </Button>
        </div>
      </div>
    </div>
  );
}