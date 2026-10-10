import React, { Suspense, lazy } from "react";

const DadosPacienteCard = lazy(() => import("./DadosPacienteCard"));

export default function DadosPacienteCardLazy(props) {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl p-6 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-5 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    }>
      <DadosPacienteCard {...props} />
    </Suspense>
  );
}