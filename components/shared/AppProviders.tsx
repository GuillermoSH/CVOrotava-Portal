"use client";

import * as React from "react";

import { TabFreshness } from "@/components/shared/TabFreshness";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "@/components/club/Toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster />
      <TabFreshness />
    </ThemeProvider>
  );
}
