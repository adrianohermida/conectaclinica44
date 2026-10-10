import { useEffect } from 'react';

/**
 * CRITICAL: Detecta imports órfãos em DEV mode
 * Previne "X is not defined" em runtime
 * 
 * ATENÇÃO: Apenas detecta - não impede build quebrado
 */
export default function ImportValidator({ userRole }) {
  useEffect(() => {
    if (userRole !== 'admin') return;
    if (!import.meta.env.DEV) return;

    const checkOrphanImports = () => {
      const errors = [];
      
      // Pegar todos os scripts da página
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      
      // Avisos comuns de imports órfãos
      const commonOrphans = [
        'SlideInPanel',
        'Dialog',
        'Modal',
        'Popover',
        'Drawer'
      ];

      // Escanear window para detectar undefined
      commonOrphans.forEach(name => {
        try {
          if (typeof window[name] === 'undefined') {
            // Tentar eval (perigoso mas é dev mode)
            eval(name);
          }
        } catch (e) {
          if (e instanceof ReferenceError) {
            errors.push({
              component: name,
              error: `${name} is not defined - provável import faltando`,
              suggestion: `import ${name} from "@/components/ui/${name}"`
            });
          }
        }
      });

      if (errors.length > 0) {
        console.warn('⚠️ IMPORT VALIDATOR - Possíveis imports órfãos:', errors);
      }
    };

    // Rodar após DOM carregar
    setTimeout(checkOrphanImports, 1000);
  }, [userRole]);

  return null;
}