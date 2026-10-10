import React from 'react';

/**
 * StatCard - KPI reutilizável (Google Workspace style)
 * Elimina duplicação de 50+ linhas por página
 */
export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  color = "#7E57FF",
  bgColor = "#f5f3ff",
  loading = false,
  onClick
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
        <div className="w-12 h-12 rounded-xl bg-gray-200 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-16" />
      </div>
    );
  }

  const content = (
    <>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bgColor }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <p className="text-sm mb-1" style={{ color: '#80868b' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: '#202124' }}>{value}</p>
      {trend && (
        <p className="text-xs mt-1" style={{ color: trend > 0 ? '#34a853' : '#ea4335' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </p>
      )}
    </>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick} 
        className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer text-left w-full" 
        style={{ borderColor: '#e8eaed' }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#e8eaed' }}>
      {content}
    </div>
  );
}