import React, { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Activity, Box, Zap, CheckCircle, Eye, Shield } from "lucide-react";
import AIControlDoc from "@/components/styleguide/AIControlDoc";
import AtomicityGuide from "@/components/styleguide/AtomicityGuide";
import TokensTab from "@/components/styleguide/TokensTab";
import ComponentsTab from "@/components/styleguide/ComponentsTab";
import PerformanceTab from "@/components/styleguide/PerformanceTab";
import AccessibilityTab from "@/components/styleguide/AccessibilityTab";
import SecurityTab from "@/components/styleguide/SecurityTab";
import LintingGuide from "@/components/styleguide/LintingGuide";

/**
 * STYLEGUIDE - Design System, Tokens CSS, Contratos de Performance
 * Fonte única de verdade para branding, componentes e compliance
 */
import CodeExamplesSection from "@/components/styleguide/CodeExamplesSection";
import AIPromptGenerator from "@/components/styleguide/AIPromptGenerator";

export default function StyleGuide() {
  const [activeTab, setActiveTab] = useState('ai-control');

  const tabs = [
    { id: 'ai-control', label: 'AI Control', icon: Activity },
    { id: 'ai-prompt', label: 'AI Prompt Gen', icon: Zap },
    { id: 'atomicity', label: 'Atomicidade', icon: Box },
    { id: 'tokens', label: 'Tokens CSS', icon: Zap },
    { id: 'components', label: 'Componentes', icon: CheckCircle },
    { id: 'examples', label: 'Exemplos', icon: CheckCircle },
    { id: 'linting', label: 'Linting', icon: Shield },
    { id: 'performance', label: 'Performance', icon: Shield },
    { id: 'accessibility', label: 'Acessibilidade', icon: Eye },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="StyleGuide - Design System"
          description="Fonte única de verdade: tokens, componentes, contratos de compliance"
          breadcrumbs={[{ label: "SuperAdmin" }, { label: "StyleGuide" }]}
        />

        <div className="pc-card">
          <div className="border-b px-2 py-2" style={{ borderColor: '#e8eaed' }}>
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === tab.id ? 'bg-[#f5f3ff] text-[#7E57FF]' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'ai-control' && <AIControlDoc />}
            {activeTab === 'ai-prompt' && <AIPromptGenerator />}
            {activeTab === 'atomicity' && <AtomicityGuide />}
            {activeTab === 'tokens' && <TokensTab />}
            {activeTab === 'components' && <ComponentsTab />}
            {activeTab === 'examples' && <CodeExamplesSection />}
            {activeTab === 'linting' && <LintingGuide />}
            {activeTab === 'performance' && <PerformanceTab />}
            {activeTab === 'accessibility' && <AccessibilityTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}