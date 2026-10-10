import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, Mail, Lock, User } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AceitarConvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [convite, setConvite] = useState(null);
  const [error, setError] = useState(null);
  const [processando, setProcessando] = useState(false);
  
  // Form data
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token de convite não fornecido");
      setLoading(false);
      return;
    }

    validarToken();
  }, [token]);

  const validarToken = async () => {
    try {
      const response = await base44.functions.invoke('validarTokenConvite', { token });
      
      if (response.data.valido) {
        setConvite(response.data.convite);
      } else {
        setError(response.data.mensagem || "Convite inválido ou expirado");
      }
    } catch (err) {
      console.error('Erro validação:', err);
      const errorMsg = err.response?.data?.error || err.message || "Erro ao validar convite";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAceitar = async (e) => {
    e.preventDefault();
    
    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }

    if (senha.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    setProcessando(true);
    setError(null);

    try {
      // Verificar se user já existe
      const responseAceite = await base44.functions.invoke('aceitarConvite', { token });

      if (!responseAceite.data.success) {
        const errorMsg = typeof responseAceite.data.error === 'string' 
          ? responseAceite.data.error 
          : "Erro ao processar convite";
        setError(errorMsg);
        setProcessando(false);
        return;
      }

      // Se action = criar_usuario, criar conta
      if (responseAceite.data.action === 'criar_usuario') {
        try {
          await base44.auth.register(convite.email_convidado, senha, {
            full_name: nomeCompleto
          });
        } catch (registerError) {
          // Se erro = user já existe, redirecionar para login
          if (registerError.message?.includes('already exists')) {
            base44.auth.redirectToLogin(createPageUrl("Dashboard"));
            return;
          } else {
            throw registerError;
          }
        }

        // Aceitar novamente agora que user existe
        const responseAceite2 = await base44.functions.invoke('aceitarConvite', { token });
        
        if (!responseAceite2.data.success) {
          setError(responseAceite2.data.error);
          setProcessando(false);
          return;
        }
      } else {
        // User já existe - redirecionar para login
        base44.auth.redirectToLogin(createPageUrl("Dashboard"));
        return;
      }

      // Redirecionar para dashboard
      window.location.href = createPageUrl("Dashboard");
      
    } catch (err) {
      console.error('Erro ao aceitar:', err);
      const errorMsg = err.response?.data?.error || err.message || "Erro ao processar convite";
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FA' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#7E57FF' }} />
          <p style={{ color: '#5f6368' }}>Validando convite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F4F7FA' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ea4335' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#202124' }}>Convite Inválido</h2>
          <p className="mb-6" style={{ color: '#5f6368' }}>{error}</p>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F4F7FA' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#34a853' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#202124' }}>
            Convite para {convite.clinica_nome}
          </h1>
          <p style={{ color: '#5f6368' }}>
            Você foi convidado como <strong>{convite.perfil_atribuido}</strong>
          </p>
        </div>

        <form onSubmit={handleAceitar} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
              <User className="w-4 h-4 inline mr-2" />
              Nome Completo
            </label>
            <Input
              type="text"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <Input
              type="email"
              value={convite.email_convidado}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
              <Lock className="w-4 h-4 inline mr-2" />
              Senha
            </label>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>
              <Lock className="w-4 h-4 inline mr-2" />
              Confirmar Senha
            </label>
            <Input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={processando}
            disabled={!senha || !confirmarSenha || !nomeCompleto}
          >
            {processando ? 'Processando...' : 'Aceitar Convite e Criar Conta'}
          </Button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: '#5f6368' }}>
          Ao aceitar, você concorda com nossos <a href="/TermosUso" className="underline">Termos de Uso</a>
        </p>
      </div>
    </div>
  );
}