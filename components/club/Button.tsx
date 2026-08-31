import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-xs";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  destructive: "btn-destructive",
};

const sizeClass: Record<ButtonSize, string | null> = {
  default: null,
  sm: "btn-sm",
  lg: "btn-lg",
  icon: "btn-icon",
  "icon-xs": "btn-icon-xs",
};

export function buttonClassName({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(variantClass[variant], sizeClass[size], className);
}

/** @deprecated Alias for `buttonClassName` — use on links styled as buttons. */
export const buttonVariants = buttonClassName;

export function Button({
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
