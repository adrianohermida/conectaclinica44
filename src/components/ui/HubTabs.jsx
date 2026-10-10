import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * HubTabs - Componente genérico para páginas hub com abas internas
 * Consolida múltiplas páginas em uma só com navegação por abas
 */
export default function HubTabs({ tabs, defaultTab, className = "" }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find(t => t.id === activeTab);

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap pc-transition flex items-center gap-2",
                isActive 
                  ? "bg-[var(--pc-primary)] text-white shadow-md" 
                  : "bg-white text-[var(--pc-text-secondary)] hover:bg-gray-50"
              )}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {tab.badge && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-yellow-100 text-yellow-800"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pc-card p-6">
        {activeContent?.content}
      </div>
    </div>
  );
}