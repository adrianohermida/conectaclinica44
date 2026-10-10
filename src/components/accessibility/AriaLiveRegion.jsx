import React, { useEffect, useState } from "react";

/**
 * AriaLiveRegion - Componente para anúncios dinâmicos acessíveis
 * 
 * Uso:
 * const { announce } = useAriaLive();
 * announce("Paciente cadastrado com sucesso", "polite");
 */

export function AriaLiveRegion({ message, politeness = "polite" }) {
  return (
    <div
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Hook para gerenciar anúncios
export function useAriaLive() {
  const [announcements, setAnnouncements] = useState([]);

  const announce = (message, politeness = "polite") => {
    const id = Date.now();
    setAnnouncements(prev => [...prev, { id, message, politeness }]);
    
    // Remove após 3s
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, 3000);
  };

  return {
    announce,
    announcements
  };
}

// Componente global para incluir no Layout
export default function GlobalAriaLive() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const handleAnnounce = (event) => {
      const { message, politeness = "polite" } = event.detail;
      const id = Date.now();
      setAnnouncements(prev => [...prev, { id, message, politeness }]);
      
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }, 3000);
    };

    window.addEventListener("aria-announce", handleAnnounce);
    return () => window.removeEventListener("aria-announce", handleAnnounce);
  }, []);

  return (
    <>
      {announcements.map(({ id, message, politeness }) => (
        <AriaLiveRegion key={id} message={message} politeness={politeness} />
      ))}
    </>
  );
}

// Helper global
export function ariaAnnounce(message, politeness = "polite") {
  window.dispatchEvent(new CustomEvent("aria-announce", {
    detail: { message, politeness }
  }));
}