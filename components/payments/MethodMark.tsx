import { Banknote, Landmark } from "lucide-react";

import type { PaymentMethod } from "@/lib/payments/constants";
import { cn } from "@/lib/utils";

const ICON_CLASS = "size-3.5 shrink-0";

/** Icono del método: banco para transferencia, billete para efectivo. */
export function MethodIcon({
  method,
  className,
}: {
  method: PaymentMethod;
  className?: string;
}) {
  const Icon = method === "transferencia" ? Landmark : Banknote;
  return <Icon className={cn(ICON_CLASS, className)} aria-hidden />;
}

/** Icono + letra (T / E). La letra se mantiene para escanear como en el Excel. */
export function MethodMark({
  method,
  className,
  iconClassName,
}: {
  method: PaymentMethod;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <MethodIcon method={method} className={iconClassName} />
      <span>{method === "transferencia" ? "T" : "E"}</span>
    </span>
  );
}

/** Pinta "T", "E" o "T+E" (salida de `methodLetters`) con sus iconos. */
export function MethodLetters({ letters }: { letters: string }) {
  const parts = letters.split("+").filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {parts.map((letter) => (
        <MethodMark
          key={letter}
          method={letter === "E" ? "efectivo" : "transferencia"}
          iconClassName="size-3"
        />
      ))}
    </span>
  );
}
