import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SlideInPanel - Design System ConectaClínica
 * 
 * MOBILE: Bottom sheet (slide up from bottom)
 * DESKTOP: Side panel (slide in from right)
 * 
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - title: string
 * - children: ReactNode
 * - maxWidth: string (desktop only)
 * - steps: array (para navegação multi-passo)
 * - currentStep: number
 * - onStepChange: (step) => void
 */
export default function SlideInPanel({ 
  open, 
  onClose, 
  maxWidth = "600px",
  title,
  children,
  steps = null,
  currentStep = 0,
  onStepChange = null
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const hasMultipleSteps = steps && steps.length > 1;
  const canGoBack = hasMultipleSteps && currentStep > 0;
  const canGoForward = hasMultipleSteps && currentStep < steps.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            style={{ zIndex: 99998, top: 0, left: 0, right: 0, bottom: 0 }}
            role="presentation"
            aria-hidden="true"
          />

          {/* Panel - MOBILE: Bottom Sheet / DESKTOP: Side Panel */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ 
              maxWidth: isMobile ? "100%" : maxWidth,
              zIndex: 99999,
              maxHeight: isMobile ? "90vh" : "100vh"
            }}
            className={`fixed bg-white shadow-2xl flex flex-col overflow-hidden ${
              isMobile 
                ? "bottom-0 left-0 right-0 rounded-t-3xl" 
                : "right-0 top-0 h-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
          >
            {/* Header - ConectaClínica Branding */}
            <div 
              className="px-4 py-3.5 md:px-6 md:py-4 flex items-center justify-between flex-shrink-0 border-b"
              style={{ 
                backgroundColor: 'var(--pc-primary)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                minHeight: '64px'
              }}
            >
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                {/* Mobile: ChevronLeft sempre visível */}
                <button
                  onClick={onClose}
                  type="button"
                  className="md:hidden p-2.5 hover:bg-white/15 active:bg-white/25 rounded-full transition-all flex-shrink-0"
                  aria-label="Fechar"
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: '#ffffff' }} />
                </button>
                
                {/* Título */}
                <h2 
                  id="panel-title"
                  className="text-base md:text-lg font-bold truncate" 
                  style={{ 
                    color: '#ffffff',
                    fontFamily: 'DM Sans, system-ui, sans-serif'
                  }}
                >
                  {title}
                </h2>

                {/* Step indicator (se multi-passo) */}
                {hasMultipleSteps && (
                  <span 
                    className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff'
                    }}
                  >
                    {currentStep + 1}/{steps.length}
                  </span>
                )}
              </div>
              
              {/* Desktop: X button */}
              <button
                onClick={onClose}
                type="button"
                className="hidden md:flex p-2.5 hover:bg-white/15 active:bg-white/25 rounded-full transition-all flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" style={{ color: '#ffffff' }} />
              </button>
            </div>

            {/* Drag indicator (Mobile only) */}
            {isMobile && (
              <div className="flex justify-center py-2 flex-shrink-0">
                <div 
                  className="w-12 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--pc-border-primary)' }}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* Content Area - Scrollable */}
            <div 
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-6"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: '#bdc1c6 #f8f9fa'
              }}
            >
              <div className="max-w-full">
                {children}
              </div>
            </div>

            {/* Navigation Footer (se multi-passo) */}
            {hasMultipleSteps && onStepChange && (
              <div 
                className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-4 border-t flex-shrink-0"
                style={{ 
                  backgroundColor: 'var(--pc-bg-tertiary)',
                  borderColor: 'var(--pc-border-primary)'
                }}
              >
                <button
                  type="button"
                  onClick={() => onStepChange(currentStep - 1)}
                  disabled={!canGoBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                  style={{
                    backgroundColor: canGoBack ? 'var(--pc-bg-primary)' : 'var(--pc-bg-tertiary)',
                    color: 'var(--pc-text-secondary)',
                    border: '1px solid var(--pc-border-primary)'
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </button>

                <span className="text-sm font-medium" style={{ color: 'var(--pc-text-secondary)' }}>
                  {steps[currentStep]}
                </span>

                <button
                  type="button"
                  onClick={() => onStepChange(currentStep + 1)}
                  disabled={!canGoForward}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                  style={{
                    backgroundColor: canGoForward ? 'var(--pc-primary)' : 'var(--pc-border-primary)',
                    color: 'var(--pc-text-on-primary)'
                  }}
                >
                  <span className="hidden sm:inline">Avançar</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}