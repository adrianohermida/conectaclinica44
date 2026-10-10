import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * ModuleCard - Card de módulo/suite/categoria reutilizável
 * Usado em TestesE2E, RoadmapProjeto, Auditoria
 */
export default function ModuleCard({ 
  title, 
  status = 'pending',
  passed = 0,
  failed = 0,
  badge,
  onClick,
  children
}) {
  const isPassed = failed === 0 && passed > 0;
  const bgColor = isPassed ? '#f0fdf4' : status === 'pending' ? '#f8f9fa' : '#fef2f2';
  const borderColor = isPassed ? '#86efac' : status === 'pending' ? '#e8eaed' : '#fecaca';
  const textColor = isPassed ? '#16a34a' : '#dc2626';

  return (
    <div 
      className="p-5 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer"
      style={{ borderColor, backgroundColor: bgColor }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isPassed ? (
            <CheckCircle className="w-6 h-6" style={{ color: '#34a853' }} />
          ) : (
            <AlertCircle className="w-6 h-6" style={{ color: status === 'pending' ? '#80868b' : '#ea4335' }} />
          )}
          <p className="font-bold text-sm" style={{ color: '#202124' }}>
            {title}
          </p>
        </div>
        {badge && (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: isPassed ? '#dcfce7' : '#fee2e2',
                  color: textColor
                }}>
            {badge}
          </span>
        )}
      </div>
      
      {(passed > 0 || failed > 0) && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" style={{ color: '#34a853' }} />
            <span className="font-medium">{passed}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" style={{ color: '#ea4335' }} />
            <span className="font-medium">{failed}</span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}