import React from "react";
import { Drawer as VaulDrawer } from "vaul";
import { X } from "lucide-react";

/**
 * Drawer (Mobile Slide Up) - PADRONIZA 4 implementações customizadas
 * Usa biblioteca Vaul já instalada
 * 
 * USO:
 * <Drawer open={show} onClose={() => setShow(false)} title="Título">
 *   {children}
 * </Drawer>
 */
export default function Drawer({ 
  open, 
  onClose, 
  title, 
  children,
  description 
}) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onClose}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay 
          className="fixed inset-0 bg-black/40 z-50" 
        />
        <VaulDrawer.Content 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto z-50"
          style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
        >
          {/* Handle */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <VaulDrawer.Title className="text-xl font-bold" style={{ color: '#202124' }}>
                {title}
              </VaulDrawer.Title>
              {description && (
                <VaulDrawer.Description className="text-sm mt-1" style={{ color: '#5f6368' }}>
                  {description}
                </VaulDrawer.Description>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-gray-100 transition-all"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Fechar"
            >
              <X className="w-5 h-5" style={{ color: '#5f6368' }} />
            </button>
          </div>

          {/* Content */}
          <div>
            {children}
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}