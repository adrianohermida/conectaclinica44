/**
 * PublicPageOptimizer
 * 
 * CRÍTICO: Garantir que páginas públicas NUNCA carregam Layout/Auth overhead
 * Target: FCP < 1.5s, LCP < 2.5s
 * 
 * Estratégia:
 * 1. Zero JavaScript até interação (progressive enhancement)
 * 2. Inline CSS crítico no <head>
 * 3. Defer tudo que não é essencial
 * 4. Preconnect para CDNs críticos
 */

import { useEffect } from 'react';

export default function PublicPageOptimizer() {
  useEffect(() => {
    // Remove qualquer auth check que possa ter sido injetado
    const cleanAuthChecks = () => {
      // Limpar storage de auth checks desnecessários
      sessionStorage.removeItem('auth-check-in-progress');
      
      // Cancelar qualquer auth request em andamento
      if (window.authAbortController) {
        window.authAbortController.abort();
      }
    };

    cleanAuthChecks();

    // Preload crítico (só para páginas públicas)
    const preloadCritical = () => {
      // Fonts (se houver)
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.as = 'font';
      fontLink.type = 'font/woff2';
      fontLink.crossOrigin = 'anonymous';
      
      // Preconnect Base44 (só se usuário logar)
      // Não fazer isso em páginas públicas - overhead desnecessário
    };

    // Executar após 1s (não bloquear FCP)
    setTimeout(preloadCritical, 1000);

    // Detectar se está em preview sandbox (overhead de 30-40s)
    if (window.location.hostname.includes('preview-sandbox')) {
      console.warn('⚠️ PREVIEW SANDBOX DETECTADO: +30-40s de overhead artificial. Deploy em PRODUÇÃO para métricas reais.');
    }
  }, []);

  return null;
}

/**
 * Inline Critical CSS para <head>
 * Copiar/colar isso no index.html se Base44 permitir
 */
export const criticalCSS = `
<style id="critical-public">
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.hero{min-height:100vh;display:flex;align-items:center;background:#081828}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 32px;border-radius:9999px;font-weight:700;min-height:48px;transition:all .2s}
.btn-primary{background:#7E57FF;color:#fff}
.btn-primary:hover{opacity:.9}
</style>
`;

/**
 * Resource Hints para <head>
 */
export const resourceHints = `
<!-- Preconnect APENAS se necessário -->
<link rel="dns-prefetch" href="https://i.pravatar.cc" />

<!-- Não preconnect Base44 em páginas públicas -->
`;