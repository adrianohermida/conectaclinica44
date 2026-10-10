import React from "react";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";

export default function SuperAdminBilling() {
  usePerformanceTracker('/SuperAdminBilling');
  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Billing"
        description="Cobranças"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Billing" }]}
      />
      <div className="oneui-card p-8 text-center">
        <p className="text-on-surface-variant">Módulo em desenvolvimento</p>
      </div>
      </div>
    </RouteGuard>
  );
}