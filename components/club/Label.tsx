import { cn } from "@/lib/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label className={cn("form-label", className)} {...props}>
      {children}
      {required ? (
        <span className="ms-0.5 font-semibold text-destructive" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}