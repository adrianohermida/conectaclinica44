/**
 * DIA 2 - Critical CSS Inline
 * Reduz FCP ao carregar estilos essenciais inline
 */

export const criticalCSS = `
/* Layout crítico */
body { 
  margin: 0; 
  font-family: 'DM Sans', -apple-system, sans-serif;
  background-color: #F4F7FA;
}

/* Header fixo */
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  z-index: 50;
  border-bottom: 1px solid #e8eaed;
}

/* Sidebar */
aside {
  position: fixed;
  top: 64px;
  left: 0;
  width: 256px;
  height: calc(100vh - 64px);
  background: white;
  border-right: 1px solid #e8eaed;
}

/* Main content */
main {
  margin-left: 256px;
  padding-top: 80px;
  min-height: 100vh;
}

/* Loading spinner */
.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f5f3ff;
  border-top: 4px solid #7E57FF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mobile */
@media (max-width: 1024px) {
  aside { transform: translateX(-100%); }
  main { margin-left: 0; }
}
`;

// Injetar no <head> via React.useEffect no Layout
export function injectCriticalCSS() {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'critical-css';
    style.textContent = criticalCSS;
    document.head.insertBefore(style, document.head.firstChild);
  }
}