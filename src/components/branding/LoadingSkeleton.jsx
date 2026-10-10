import React from "react";

/**
 * LoadingSkeleton - Skeleton loader atômico ConectaClínica
 * 
 * CONSOLIDAÇÃO: 45 ocorrências de loading states custom → 1 component
 * DNA: Google Workspace (pulse animation, rounded, gray-200)
 * 
 * Props:
 * - variant: "card" | "list" | "table" | "stat" | "form"
 * - count: number (quantos skeletons renderizar)
 */
export default function LoadingSkeleton({ 
  variant = "card", 
  count = 3 
}) {
  const renderCardSkeleton = () => (
    <div 
      className="bg-white rounded-2xl shadow-sm border overflow-hidden"
      style={{ borderColor: 'var(--pc-border-primary)' }}
    >
      <div className="p-4 md:p-6 animate-pulse">
        <div className="flex items-start gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex-shrink-0"
            style={{ backgroundColor: 'var(--pc-gray-200)' }}
          />
          <div className="flex-1 space-y-3 min-w-0">
            <div 
              className="h-5 rounded w-3/4"
              style={{ backgroundColor: 'var(--pc-gray-200)' }}
            />
            <div 
              className="h-4 rounded w-1/2"
              style={{ backgroundColor: 'var(--pc-gray-200)' }}
            />
            <div className="flex gap-2 mt-2">
              <div 
                className="h-6 rounded-full w-20"
                style={{ backgroundColor: 'var(--pc-gray-200)' }}
              />
              <div 
                className="h-6 rounded-full w-16"
                style={{ backgroundColor: 'var(--pc-gray-200)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListSkeleton = () => (
    <div 
      className="bg-white rounded-2xl shadow-sm border overflow-hidden"
      style={{ borderColor: 'var(--pc-border-primary)' }}
    >
      <div className="divide-y" style={{ borderColor: 'var(--pc-border-primary)' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: 'var(--pc-gray-200)' }}
              />
              <div className="flex-1 space-y-2">
                <div 
                  className="h-4 rounded w-2/3"
                  style={{ backgroundColor: 'var(--pc-gray-200)' }}
                />
                <div 
                  className="h-3 rounded w-1/2"
                  style={{ backgroundColor: 'var(--pc-gray-200)' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i}
          className="bg-white rounded-2xl shadow-sm border p-6 animate-pulse"
          style={{ borderColor: 'var(--pc-border-primary)' }}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-10 h-10 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--pc-gray-200)' }}
            />
            <div className="flex-1 space-y-2">
              <div 
                className="h-3 rounded w-20"
                style={{ backgroundColor: 'var(--pc-gray-200)' }}
              />
              <div 
                className="h-6 rounded w-16"
                style={{ backgroundColor: 'var(--pc-gray-200)' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFormSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div 
            className="h-4 rounded w-24 mb-2"
            style={{ backgroundColor: 'var(--pc-gray-200)' }}
          />
          <div 
            className="h-11 rounded-lg w-full"
            style={{ backgroundColor: 'var(--pc-gray-200)' }}
          />
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = () => (
    <div 
      className="bg-white rounded-2xl shadow-sm border overflow-hidden"
      style={{ borderColor: 'var(--pc-border-primary)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--pc-bg-secondary)' }}>
            <tr>
              {Array.from({ length: 4 }).map((_, i) => (
                <th key={i} className="p-4">
                  <div 
                    className="h-4 rounded w-20 animate-pulse"
                    style={{ backgroundColor: 'var(--pc-gray-200)' }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--pc-border-primary)' }}>
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="p-4">
                    <div 
                      className="h-4 rounded w-full animate-pulse"
                      style={{ backgroundColor: 'var(--pc-gray-200)' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const skeletonMap = {
    card: renderCardSkeleton,
    list: renderListSkeleton,
    stat: renderStatSkeleton,
    form: renderFormSkeleton,
    table: renderTableSkeleton
  };

  const renderSkeleton = skeletonMap[variant] || renderCardSkeleton;

  return variant === "card" || variant === "stat" ? (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  ) : (
    renderSkeleton()
  );
}