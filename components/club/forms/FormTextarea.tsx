import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Label } from "@/components/club/Label";
import { FormFieldError } from "@/components/club/forms/FormFieldError";
import { cn } from "@/lib/utils";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  register?: UseFormRegisterReturn;
  error?: FieldError;
}

export function FormTextarea({
  label,
  name,
  id,
  register,
  error,
  className,
  ...props
}: FormTextareaProps) {
  const fieldId = id ?? name;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        className={cn(
          "form-input min-h-[6rem] resize-y",
          error && "border-destructive focus:ring-destructive/30",
          className,
        )}
        {...register}
        {...props}
      />
      <FormFieldError message={error?.message} />
    </div>
  );
}
