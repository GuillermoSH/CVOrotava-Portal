"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  align = "end",
}: {
  align?: "start" | "center" | "end";
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const Icon =
    !mounted || resolvedTheme === undefined
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  const value = theme ?? "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Elegir tema"
            className={cn(!mounted && "opacity-70")}
          />
        }
      >
        <Icon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            setTheme(String(v));
          }}
        >
          <DropdownMenuRadioItem value="system" inset>
            Sistema
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" inset>
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" inset>
            Oscuro
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
