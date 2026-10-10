import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Copy, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function ConviteUsuario() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("user");
  const [linkCriado, setLinkCriado] = useState(null);

  const { data: convites = [], isLoading } = useQuery({
    queryKey: ["convites"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.ConviteUsuario.filter({ clinica_id: user.clinica_id });
    }
  });

  const enviarConviteMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("enviarConviteUsuario", {
        email_convidado: email,
        perfil_atribuido: perfil
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["convites"]);
      setLinkCriado(data.link);
      setEmail("");
    }
  });

  const copiarLink = (link) => {
    navigator.clipboard.writeText(link);
    alert("Link copiado!");
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4">Convidar Novo Usuário</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 rounded-xl"
          />
          <Select value={perfil} onValueChange={setPerfil}>
            <SelectTrigger className="border border-gray-300 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="medico">Médico</SelectItem>
              <SelectItem value="recepcionista">Recepcionista</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => enviarConviteMutation.mutate()}
            disabled={!email || enviarConviteMutation.isPending}
            className="pc-btn pc-btn-primary"
          >
            {enviarConviteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Convite
              </>
            )}
          </Button>
        </div>

        {linkCriado && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-bold text-green-800 mb-2">Convite enviado com sucesso!</p>
            <div className="flex items-center gap-2">
              <Input value={linkCriado} readOnly className="flex-1 text-sm" />
              <Button variant="outline" onClick={() => copiarLink(linkCriado)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Convites */}
      <div className="pc-card p-6">
        <h3 className="text-lg font-bold mb-4">Convites Enviados</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          </div>
        ) : convites.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum convite enviado ainda</p>
        ) : (
          <div className="space-y-3">
            {convites.map(convite => (
              <div key={convite.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium">{convite.email_convidado}</p>
                  <p className="text-sm text-gray-500">
                    {convite.perfil_atribuido} • Enviado em {format(new Date(convite.data_envio), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {convite.status === "aceito" && (
                    <span className="pc-badge pc-badge-success flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Aceito
                    </span>
                  )}
                  {convite.status === "pendente" && (
                    <span className="pc-badge pc-badge-warning">Pendente</span>
                  )}
                  {convite.status === "expirado" && (
                    <span className="pc-badge pc-badge-error flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Expirado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}