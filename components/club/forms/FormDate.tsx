import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Input } from "@/components/club/Input";
import { Label } from "@/components/club/Label";
import { FormFieldError } from "@/components/club/forms/FormFieldError";
import { cn } from "@/lib/utils";

interface FormDateProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormDate({ label, name, id, register, error, className, ...props }: FormDateProps) {
  const fieldId = id ?? name;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        type="date"
        aria-invalid={Boolean(error)}
        className={cn(error && "border-destructive focus:ring-destructive/30", className)}
        {...register}
        {...props}
      />
      <FormFieldError message={error?.message} />
    </div>
  );
}
