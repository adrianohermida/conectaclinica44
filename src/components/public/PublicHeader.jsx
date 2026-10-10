import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, LogIn, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";

export default function PublicHeader({ scrolled }) {
  const navigate = useNavigate();

  // Check auth status
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user-public"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const handleLoginGoogle = async () => {
    try {
      await base44.auth.loginWithProvider("google");
      // Após login, redirect automático para Dashboard
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex items-center gap-2 md:gap-3 min-w-0">
            <Building2 
              className="w-7 h-7 md:w-9 md:h-9 flex-shrink-0" 
              style={{ color: scrolled ? 'var(--brand-primary)' : 'white' }} 
            />
            <span 
              className={`text-lg md:text-xl font-bold truncate ${
                scrolled ? 'text-gray-900' : 'text-white'
              }`}
            >
              ConectaClínica
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <a 
              href="#recursos" 
              className={`font-medium hover:opacity-80 transition-opacity text-sm lg:text-base whitespace-nowrap ${
                scrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              Recursos
            </a>
            <Link 
              to={createPageUrl("PlanosPrecos")}
              className={`font-medium hover:opacity-80 transition-opacity text-sm lg:text-base whitespace-nowrap ${
                scrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              Planos
            </Link>
            <a 
              href="#depoimentos" 
              className={`font-medium hover:opacity-80 transition-opacity text-sm lg:text-base whitespace-nowrap ${
                scrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              Depoimentos
            </a>
            <Link 
              to={createPageUrl("CentralAjudaPublica")}
              className={`font-medium hover:opacity-80 transition-opacity text-sm lg:text-base whitespace-nowrap ${
                scrolled ? 'text-gray-700' : 'text-white'
              }`}
            >
              Ajuda
            </Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-20 h-10 bg-gray-200 rounded-full animate-pulse" />
            ) : user ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button
                  variant={scrolled ? "default" : "secondary"}
                  className="flex items-center gap-2 min-h-[44px]"
                  aria-label="Ir para dashboard"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            ) : (
              <>
                <button
                  onClick={handleLoginGoogle}
                  className={`hidden sm:flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-full font-medium transition-all min-h-[44px] whitespace-nowrap ${
                    scrolled 
                      ? 'text-gray-700 hover:bg-gray-100' 
                      : 'text-white hover:bg-white/10'
                  }`}
                  aria-label="Entrar com Google"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm md:text-base">Entrar</span>
                </button>
                <Link to={createPageUrl("Dashboard")}>
                  <button
                    className="px-4 md:px-6 py-2.5 md:py-3 rounded-full font-bold text-white text-sm md:text-base hover:opacity-90 transition-all min-h-[44px] whitespace-nowrap"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                    aria-label="Criar conta grátis"
                  >
                    Trial Grátis
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}