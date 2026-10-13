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

/**
 * Pinta "T", "E" o "T+E" (salida de `methodLetters`). Un método: icono grande + letra;
 * los dos a la vez: solo iconos, para que quepan en la celda.
 */
export function MethodLetters({ letters }: { letters: string }) {
  const parts = letters.split("+").filter(Boolean);
  if (parts.length === 0) return null;

  if (parts.length > 1) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {parts.map((letter) => (
          <MethodIcon
            key={letter}
            method={letter === "E" ? "efectivo" : "transferencia"}
            className="size-[1.125rem]"
          />
        ))}
      </span>
    );
  }

  return (
    <MethodMark
      method={parts[0] === "E" ? "efectivo" : "transferencia"}
      iconClassName="size-[1.125rem]"
    />
  );
}
