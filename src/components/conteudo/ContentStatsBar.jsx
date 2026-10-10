import React from "react";

/**
 * STATS BAR - KPIs genéricos
 */
export default function ContentStatsBar({ stats = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="pc-card p-5">
            <Icon className="w-8 h-8 mb-2" style={{ color: stat.color || 'var(--brand-primary)' }} />
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}