"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSubmenu() {
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
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Icon className="size-4" />
        Tema
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent alignOffset={-4} className="min-w-40">
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
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
