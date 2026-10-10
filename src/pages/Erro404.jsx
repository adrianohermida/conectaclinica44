import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home } from "lucide-react";
import MetaTags from "@/components/seo/MetaTags";

export default function Erro404() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden" style={{ backgroundColor: '#081828' }}>
        <div className="animate-pulse">
          <div className="h-32 w-32 bg-gray-700 rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags 
        title="404 - Página Não Encontrada | ConectaClínica"
        description="A página que você procura não existe ou foi removida."
      />
      <div className="min-h-screen flex items-center justify-center relative overflow-x-hidden" style={{ backgroundColor: '#081828' }}>
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-10 hidden md:block" style={{ backgroundColor: '#7E57FF' }} />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full opacity-10 hidden md:block" style={{ backgroundColor: '#7E57FF' }} />

        <div className="text-center px-4 relative z-10 w-full min-w-0">
          <div className="bg-white rounded-2xl p-8 md:p-16 max-w-2xl mx-auto shadow-2xl overflow-hidden">
            <h1 className="font-bold mb-6 break-words" style={{ color: '#7E57FF', fontSize: 'clamp(64px, 15vw, 112px)', lineHeight: '1' }}>404</h1>
            <h2 className="font-bold mb-4 break-words" style={{ color: '#202124', fontSize: 'clamp(20px, 5vw, 28px)', lineHeight: '1.3' }}>
              A página que você procura<br />não existe mais.
            </h2>
            <p className="mb-8 break-words" style={{ color: '#5f6368', fontSize: '16px', lineHeight: '1.5' }}>
              Ela pode ter sido movida ou excluída.
            </p>
            <Link to={createPageUrl("Home")}>
              <button aria-label="Voltar ao início" className="font-bold rounded-full hover:opacity-90 transition-all min-h-[56px] inline-flex items-center gap-2 px-8" style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}>
                <Home className="w-5 h-5 flex-shrink-0" />
                Voltar ao Início
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}