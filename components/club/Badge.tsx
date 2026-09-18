import { cn } from "@/lib/utils";

const variantClass = {
  default: "status-badge status-badge--danger",
  secondary: "status-badge status-badge--neutral",
  outline: "status-badge status-badge--neutral",
  success: "status-badge status-badge--success",
  warning: "status-badge status-badge--warning",
  info: "status-badge status-badge--info",
  destructive: "status-badge status-badge--danger",
} as const;

export function Badge({
  variant = "default",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: keyof typeof variantClass;
}) {
  return <span className={cn(variantClass[variant], className)} {...props} />;
}
