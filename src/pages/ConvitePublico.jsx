import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";
import { Building2, Mail, User, Lock, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Página PÚBLICA de aceite de convite via link
 * NÃO requer autenticação prévia
 */
export default function ConvitePublico() {
  const [token, setToken] = useState("");
  const [convite, setConvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [etapa, setEtapa] = useState("validando"); // validando | formulario | processando | sucesso

  // Dados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenUrl = urlParams.get("token");
    
    if (!tokenUrl) {
      setErro("Token de convite não encontrado na URL");
      setLoading(false);
      return;
    }

    setToken(tokenUrl);
    validarToken(tokenUrl);
  }, []);

  const validarToken = async (tokenValue) => {
    try {
      const response = await base44.functions.invoke('validarTokenConvite', { token: tokenValue });

      if (response.data.valido) {
        setConvite(response.data.convite);
        setEtapa("formulario");
      } else {
        setErro(response.data.motivo || "Convite inválido ou expirado");
      }
    } catch (error) {
      setErro("Erro ao validar convite: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAceitar = async (e) => {
    e.preventDefault();

    if (!nome || !email || !senha) {
      alert("Preencha todos os campos");
      return;
    }

    if (senha !== confirmaSenha) {
      alert("As senhas não conferem");
      return;
    }

    if (senha.length < 6) {
      alert("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setEtapa("processando");

    try {
      const response = await base44.functions.invoke('aceitarConvite', {
        token,
        nome_completo: nome,
        email,
        senha
      });

      if (response.data.success) {
        setEtapa("sucesso");
        
        // Redirecionar após 3s
        setTimeout(() => {
          window.location.href = createPageUrl("DashboardCompleto");
        }, 3000);
      } else {
        throw new Error(response.data.error || "Erro ao processar convite");
      }
    } catch (error) {
      alert("Erro: " + error.message);
      setEtapa("formulario");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Clock className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-700">Validando convite...</p>
        </Card>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center mb-4">Convite Inválido</h1>
          <p className="text-gray-700 text-center mb-6">{erro}</p>
          <Button 
            onClick={() => window.location.href = createPageUrl("Home")}
            className="w-full"
          >
            Voltar ao Início
          </Button>
        </Card>
      </div>
    );
  }

  if (etapa === "sucesso") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">Bem-vindo(a)!</h1>
          <p className="text-gray-700 mb-2">
            Sua conta foi criada com sucesso em <strong>{convite.clinica_nome}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Redirecionando para o painel...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Você foi convidado!</h1>
          <p className="text-gray-700">
            Para fazer parte de <strong className="text-purple-600">{convite.clinica_nome}</strong>
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-900">
            <strong>Perfil atribuído:</strong> {convite.perfil_atribuido}
            <br />
            <strong>Válido até:</strong> {new Date(convite.data_expiracao).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <form onSubmit={handleAceitar} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Nome Completo *
            </label>
            <Input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
              disabled={etapa === "processando"}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email *
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={etapa === "processando"}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Senha *
            </label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={etapa === "processando"}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Confirmar Senha *
            </label>
            <Input
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              placeholder="Repita a senha"
              required
              disabled={etapa === "processando"}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={etapa === "processando"}
            disabled={etapa === "processando"}
          >
            {etapa === "processando" ? "Criando conta..." : "Aceitar Convite"}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Ao aceitar, você concorda com os Termos de Uso e Política de Privacidade da ConectaClínica
        </p>
      </Card>
    </div>
  );
}