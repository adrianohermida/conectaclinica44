import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Modal - Wrapper Radix Dialog
 * PADRONIZA 19 modais inline espalhados pelo app
 * USO: <Modal open={show} onClose={() => setShow(false)} title="Título">{children}</Modal>
 */
export default function Modal({ 
  open, 
  onClose, 
  title, 
  children, 
  maxWidth = "500px",
  description 
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm" style={{ color: '#5f6368' }}>{description}</p>
          )}
        </DialogHeader>
        <div className="mt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}