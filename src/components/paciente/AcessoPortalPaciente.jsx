import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Key, Link as LinkIcon, Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useModuloAtivo } from "@/components/hooks/useModuloAtivo";
import { createPageUrl } from "@/utils";

export default function AcessoPortalPaciente({ contato }) {
  const queryClient = useQueryClient();
  const [linkMagico, setLinkMagico] = useState("");
  const { ativo: portalAtivo, isLoading: loadingModulo } = useModuloAtivo('portal');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user-portal", contato.user_id],
    queryFn: async () => {
      if (!contato.user_id) return null;
      const users = await base44.entities.User.filter({ id: contato.user_id });
      return users[0] || null;
    },
    enabled: !!contato.user_id
  });

  const enviarConviteMutation = useMutation({
    mutationFn: async () => {
      if (!contato.email) throw new Error("Paciente sem email cadastrado");
      
      const user = await base44.auth.me();
      
      // Enviar convite via backend function
      const response = await base44.functions.invoke('enviarConviteUsuario', {
        email: contato.email,
        nome: contato.nome_completo,
        clinica_id: user.clinica_id,
        role: 'paciente',
        metadata: {
          contato_id: contato.id,
          tipo: 'portal_paciente'
        }
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      setLinkMagico(data.link_convite || '');
      toast.success("Convite enviado por email!");
    },
    onError: (error) => {
      console.error('Erro ao enviar convite:', error);
      toast.error(error.message || "Erro ao enviar convite");
    }
  });

  const vincularUsuarioMutation = useMutation({
    mutationFn: async (email) => {
      const response = await base44.functions.invoke('vincularPacienteUser', {
        contato_id: contato.id,
        email: email || contato.email
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["contato", contato.id]);
      queryClient.invalidateQueries(["user-portal"]);
      toast.success("Usuário vinculado!");
    }
  });

  if (loadingModulo || userLoading) return <div className="text-sm" style={{ color: "#5f6368" }}>Verificando acesso...</div>;

  // CRITICAL: Módulo Portal não ativo no plano
  if (!portalAtivo) {
    return (
      <div className="pc-card p-6" style={{ backgroundColor: "#fef9e5", borderColor: "#fbbc04" }}>
        <div className="flex items-start gap-4">
          <XCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#fbbc04" }} />
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-2" style={{ color: "#202124" }}>Módulo Portal não disponível</h4>
            <p className="text-sm mb-4" style={{ color: "#5f6368" }}>
              O acesso ao Portal do Paciente não está incluído no seu plano atual. 
              Faça upgrade para desbloquear este recurso.
            </p>
            <Button onClick={() => window.location.href = createPageUrl("GerenciarAssinatura")}>
              Fazer Upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: "#202124" }}>Gestão de Acesso ao Portal</h3>
      </div>

      {/* STATUS DO ACESSO */}
      <div className="pc-card p-5" style={{ backgroundColor: user ? "#e6f7ed" : "#fde7e7" }}>
        <div className="flex items-start gap-4">
          {user ? (
            <CheckCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#34a853" }} />
          ) : (
            <XCircle className="w-8 h-8 flex-shrink-0" style={{ color: "#ea4335" }} />
          )}
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-1" style={{ color: "#202124" }}>
              {user ? "Acesso Ativo" : "Sem Acesso"}
            </h4>
            {user ? (
              <div className="space-y-1 text-sm" style={{ color: "#5f6368" }}>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Cadastro:</strong> {new Date(user.created_date).toLocaleDateString('pt-BR')}</p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#5f6368" }}>Este paciente ainda não tem acesso ao portal</p>
            )}
          </div>
        </div>
      </div>

      {/* AÇÕES */}
      {!user ? (
        <div className="space-y-4">
          <div className="pc-card p-5">
            <p className="text-sm mb-3" style={{ color: "#5f6368" }}>Configure o acesso ao portal para que o paciente possa:</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4 mb-4" style={{ color: "#5f6368" }}>
              <li>Ver histórico de consultas e exames</li>
              <li>Acessar prontuários e prescrições</li>
              <li>Agendar consultas online</li>
              <li>Fazer compras de produtos/serviços</li>
            </ul>
            <Button 
              onClick={() => enviarConviteMutation.mutate()} 
              disabled={enviarConviteMutation.isPending || !contato.email}
            >
              <Mail className="w-4 h-4 mr-2" /> 
              {enviarConviteMutation.isPending ? "Enviando convite..." : "Enviar Convite de Registro"}
            </Button>
            {!contato.email && <p className="text-xs mt-2" style={{ color: "#ea4335" }}>* Necessário cadastrar email do paciente</p>}
            {linkMagico && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "#e6f7ed", border: "1px solid #34a853" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "#1b5e20" }}>✅ Convite enviado!</p>
                <Input value={linkMagico} readOnly onClick={e => e.target.select()} className="mb-2 text-xs" />
                <Button size="sm" variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(linkMagico);
                  toast.success("Link copiado!");
                }}>
                  Copiar Link
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="pc-card p-5">
            <h4 className="font-bold mb-2" style={{ color: "#202124" }}>Reenviar Credenciais</h4>
            <p className="text-sm mb-3" style={{ color: "#5f6368" }}>Enviar novo link de acesso caso o paciente tenha perdido as credenciais</p>
            <Button onClick={() => enviarConviteMutation.mutate()} disabled={enviarConviteMutation.isPending}>
              <Mail className="w-4 h-4 mr-2" /> 
              {enviarConviteMutation.isPending ? "Enviando..." : "Reenviar Acesso"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}