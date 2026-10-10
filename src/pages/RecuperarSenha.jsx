import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simular envio de email
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden" style={{ backgroundColor: '#F4F7FA' }}>
        <div className="w-full max-w-md px-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
          <div className="bg-white rounded-2xl p-8 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
            <div className="h-8 bg-gray-200 rounded w-full mb-4" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-8" />
            <div className="h-12 bg-gray-200 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 overflow-x-hidden" style={{ backgroundColor: '#F4F7FA' }}>
      <div className="w-full max-w-md min-w-0">
        {/* Logo */}
        <Link to={createPageUrl("Home")} className="flex items-center gap-2 mb-8" aria-label="Voltar para página inicial">
          <Building2 className="w-9 h-9 md:w-8 md:h-8 flex-shrink-0" style={{ color: '#7E57FF' }} />
          <span className="font-bold truncate" style={{ color: '#202124', fontSize: 'clamp(20px, 5vw, 24px)' }}>ConectaClínica</span>
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border overflow-hidden" style={{ borderColor: '#e8eaed' }}>
          <Link 
            to={createPageUrl("Login")} 
            className="inline-flex items-center gap-2 font-bold mb-6 hover:opacity-80 transition-opacity min-h-[48px]"
            style={{ color: '#7E57FF', fontSize: '14px' }}
            aria-label="Voltar ao login"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Voltar ao login
          </Link>

          {!success ? (
            <>
              <h1 className="font-bold mb-2 break-words" style={{ color: '#202124', fontSize: 'clamp(24px, 6vw, 32px)', lineHeight: '1.2' }}>Recuperar senha</h1>
              <p className="mb-8 break-words" style={{ color: '#5f6368', fontSize: '16px', lineHeight: '1.5' }}>
                Digite seu email e enviaremos um link para redefinir sua senha
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-hidden">
                <div>
                  <label className="block font-bold mb-2" style={{ color: '#5f6368', fontSize: '14px' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 flex-shrink-0" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-12 border border-gray-300 rounded-xl min-h-[48px]"
                      style={{ fontSize: '16px' }}
                      required
                      aria-label="Digite seu email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold rounded-full hover:opacity-90 transition-all min-h-[56px] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}
                  aria-label="Enviar link de recuperação"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    "Enviar link de recuperação"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-8 overflow-hidden">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-bold mb-4 break-words" style={{ color: '#202124', fontSize: 'clamp(20px, 5vw, 24px)' }}>Email enviado!</h2>
              <p className="mb-8 break-words" style={{ color: '#5f6368', fontSize: '16px', lineHeight: '1.5' }}>
                Enviamos um link de recuperação para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to={createPageUrl("Login")}>
                <button className="font-bold rounded-full hover:opacity-90 transition-all min-h-[56px] px-8 inline-flex items-center justify-center" style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}>
                  Voltar ao login
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}