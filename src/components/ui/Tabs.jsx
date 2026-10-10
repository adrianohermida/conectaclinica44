import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

// Wrapper to fix activeTab prop warning
const Tabs = React.forwardRef((props, ref) => {
  const { activeTab, ...rest } = props;
  return <TabsPrimitive.Root ref={ref} value={activeTab} {...rest} />;
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef((props, ref) => {
  const { className = "", ...rest } = props;
  return (
    <TabsPrimitive.List
      ref={ref}
      className={`inline-flex items-center justify-center rounded-xl bg-gray-100 p-1 ${className}`}
      {...rest}
    />
  );
});
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef((props, ref) => {
  const { className = "", ...rest } = props;
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:shadow-sm ${className}`}
      {...rest}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef((props, ref) => {
  const { className = "", ...rest } = props;
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={`mt-2 focus-visible:outline-none ${className}`}
      {...rest}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };