import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { useEnforceLimits } from "@/components/hooks/useEnforceLimits";

/**
 * Botão com validação preventiva de limites
 * Desabilita automaticamente se limite atingido
 * Mostra tooltip com ação necessária
 */
export default function BotaoComLimite({ 
  recurso, 
  onClick, 
  children, 
  className = "",
  variant = "primary",
  ...props 
}) {
  const { getUIState, showUpgradePrompt } = useEnforceLimits();
  const { disabled, tooltip } = getUIState(recurso);

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      showUpgradePrompt(recurso);
      return;
    }
    onClick?.(e);
  };

  const baseClassName = variant === "primary"
    ? "oneui-button inline-flex items-center gap-2"
    : className;

  const button = (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
      {disabled && <AlertCircle className="w-4 h-4 ml-1" />}
    </button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}