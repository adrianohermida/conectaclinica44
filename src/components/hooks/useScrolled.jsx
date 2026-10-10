import { useState, useEffect } from "react";

/**
 * Hook para detectar scroll da página
 * @param {number} threshold - Pixel threshold para considerar scrolled (default: 50)
 * @returns {boolean} true se scrollY > threshold
 */
export function useScrolled(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}