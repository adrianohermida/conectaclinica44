import React, { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

const ContactSidebar = lazy(() => import("./ContactSidebar"));

export default function ContactSidebarLazy(props) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border animate-pulse" style={{ borderColor: '#e8eaed' }}>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    }>
      <ContactSidebar {...props} />
    </Suspense>
  );
}