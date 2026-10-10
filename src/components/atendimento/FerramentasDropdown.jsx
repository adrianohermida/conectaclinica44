import React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/Button";
import { MoreVertical, Search, Sparkles, GitMerge, Mail, BarChart3 } from "lucide-react";

/**
 * Dropdown consolidado de ferramentas secundárias do Atendimento
 * Evita poluição do header com múltiplos botões
 */
export default function FerramentasDropdown({ onSelect }) {
  const ferramentas = [
    { 
      id: 'debug', 
      label: 'Debug de Email', 
      icon: Search, 
      description: 'Rastrear entregas SendGrid',
      color: '#0B7A9E'
    },
    { 
      id: 'templates', 
      label: 'Templates', 
      icon: Sparkles, 
      description: 'Respostas rápidas',
      color: '#7E57FF'
    },
    { 
      id: 'duplicatas', 
      label: 'Duplicatas', 
      icon: GitMerge, 
      description: 'Detectar e mesclar',
      color: '#9334e9'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      description: 'SLA, sentimento, volume',
      color: '#34a853'
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center rounded-xl transition-all hover:bg-gray-50"
          style={{ 
            border: '1px solid #e8eaed',
            minWidth: '48px',
            minHeight: '48px',
            width: '48px',
            height: '48px'
          }}
          aria-label="Mais ferramentas"
        >
          <MoreVertical className="w-5 h-5" style={{ color: '#5f6368' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" style={{ zIndex: 99999 }}>
        {ferramentas.map(tool => {
          const Icon = tool.icon;
          return (
            <DropdownMenuItem
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: tool.color + '15' }}
              >
                <Icon className="w-5 h-5" style={{ color: tool.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#202124' }}>{tool.label}</p>
                <p className="text-xs text-gray-600">{tool.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}