import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * BrandedStat - Card de estatística com tokens CSS
 */
export default function BrandedStat({ 
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary", // primary | success | warning | error | info
  subtitle
}) {
  const colorMap = {
    primary: { bg: 'var(--pc-primary-50)', text: 'var(--pc-primary)', icon: 'var(--pc-primary)' },
    success: { bg: 'var(--pc-success-50)', text: 'var(--pc-success)', icon: 'var(--pc-success)' },
    warning: { bg: 'var(--pc-warning-50)', text: 'var(--pc-warning)', icon: 'var(--pc-warning)' },
    error: { bg: 'var(--pc-error-50)', text: 'var(--pc-error)', icon: 'var(--pc-error)' },
    info: { bg: 'var(--pc-info-50)', text: 'var(--pc-info)', icon: 'var(--pc-info)' }
  };
  
  const colors = colorMap[color];
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <div 
      className="pc-card"
      style={{
        padding: 'var(--pc-space-6)',
        borderRadius: 'var(--pc-radius-lg)',
        backgroundColor: 'var(--pc-surface)',
        border: '1px solid var(--pc-border-secondary)',
        boxShadow: 'var(--pc-shadow-xs)',
        transition: 'var(--pc-transition-base)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--pc-space-4)' }}>
        <span className="pc-body-sm" style={{ color: 'var(--pc-text-secondary)' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--pc-radius-lg)',
            backgroundColor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon style={{ width: '20px', height: '20px', color: colors.icon }} />
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--pc-space-2)', marginBottom: 'var(--pc-space-2)' }}>
        <span className="pc-heading-2" style={{ color: 'var(--pc-text-primary)' }}>
          {value}
        </span>
        {trend && trendValue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pc-space-1)' }}>
            <TrendIcon style={{ 
              width: '16px', 
              height: '16px', 
              color: trend === 'up' ? 'var(--pc-success)' : 'var(--pc-error)' 
            }} />
            <span style={{ 
              fontSize: 'var(--pc-text-sm)', 
              color: trend === 'up' ? 'var(--pc-success)' : 'var(--pc-error)',
              fontWeight: 'var(--pc-font-medium)'
            }}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      
      {subtitle && (
        <p className="pc-caption" style={{ color: 'var(--pc-text-tertiary)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}