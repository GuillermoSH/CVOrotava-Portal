"use client";

import * as React from "react";

import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "@/components/club/Toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}
