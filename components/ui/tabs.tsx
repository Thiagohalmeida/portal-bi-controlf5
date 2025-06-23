// components/ui/Tabs.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ className, children }: TabsProps) {
  return <div className={cn("flex flex-col space-y-4", className)}>{children}</div>;
}

interface TabListProps {
  children: React.ReactNode;
}
export function TabList({ children }: TabListProps) {
  return <div className="flex space-x-2 border-b">{children}</div>;
}

interface TabTriggerProps {
  value: string;
  activeTab: string;
  setActiveTab: (v: string) => void;
  children: React.ReactNode;
}
export function TabTrigger({ value, activeTab, setActiveTab, children }: TabTriggerProps) {
  const isActive = value === activeTab;
  return (
    <button
      className={cn(
        "px-4 py-2 text-sm font-medium",
        isActive ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600 hover:text-gray-800"
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

interface TabContentProps {
  value: string;
  activeTab: string;
  children: React.ReactNode;
}
export function TabContent({ value, activeTab, children }: TabContentProps) {
  return value === activeTab ? <div className="mt-4">{children}</div> : null;
}

