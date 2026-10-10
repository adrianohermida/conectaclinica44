import React from "react";
import { Button } from "./Button";

/**
 * EmptyState - Design System ConectaClínica
 * 
 * Estado vazio reutilizável - elimina 200+ linhas duplicadas
 * 
 * Props:
 * - icon: Component (Lucide icon)
 * - title: string
 * - description: string (opcional)
 * - action: { label: string, onClick: () => void, icon?: Component } (opcional)
 * - iconColor: string (default: '#dadce0')
 */
export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  iconColor = '#dadce0'
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 text-center overflow-hidden" style={{ borderColor: '#e8eaed' }}>
      <Icon className="w-16 h-16 mx-auto mb-4" style={{ color: iconColor }} aria-hidden="true" />
      <h3 className="font-bold mb-2" style={{ color: '#202124', fontSize: '18px' }}>{title}</h3>
      {description && (
        <p className="mb-6" style={{ color: '#5f6368', fontSize: '14px' }}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          aria-label={action.label}
          className="inline-flex items-center gap-2 font-bold rounded-full hover:opacity-90 transition-all min-h-[48px] px-6"
          style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '14px' }}
        >
          {action.icon && <action.icon className="w-5 h-5 flex-shrink-0" />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}