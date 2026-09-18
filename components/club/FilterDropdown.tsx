"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type FilterDropdownProps = {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
};

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left text-xs" ref={dropdownRef}>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-9 cursor-pointer touch-manipulation items-center gap-2 rounded-lg border px-3.5 py-2 font-medium transition-all duration-200",
          value
            ? "border-[color-mix(in_srgb,var(--club-brand)_32%,transparent)] bg-[var(--club-brand-soft)] text-brand hover:bg-[color-mix(in_srgb,var(--club-brand)_18%,transparent)]"
            : "border-border bg-[var(--club-surface-2)] text-muted-foreground hover:bg-[var(--club-surface-hover)] hover:text-foreground",
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value || label}
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="size-3.5" aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1.5 max-h-60 w-full min-w-max overflow-y-auto rounded-lg border border-border bg-[var(--club-drawer-bg)] text-xs shadow-xl shadow-black/25"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={cn(
                  "block w-full cursor-pointer px-3.5 py-2.5 text-left transition-all duration-150 first:rounded-t-lg",
                  option === value
                    ? "bg-[var(--club-brand-soft)] font-semibold text-brand"
                    : "text-muted-foreground hover:bg-[var(--club-surface-hover)] hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-b-lg border-t border-border px-3.5 py-2.5 text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Limpiar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
