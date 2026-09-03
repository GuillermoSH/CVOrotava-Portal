"use client";

import { Controller, type Control, type FieldError } from "react-hook-form";

import { Label } from "@/components/club/Label";
import { Select, type SelectOptions } from "@/components/club/Select";
import { FormFieldError } from "@/components/club/forms/FormFieldError";
import { cn } from "@/lib/utils";

interface FormSelectProps {
  label: string;
  name: string;
  id?: string;
  options: SelectOptions;
  error?: FieldError;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: Control<any>;
  value?: string;
  onChange?: (e: { target: { name: string; value: string } }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function FormSelect({
  label,
  name,
  id,
  options,
  error,
  control,
  value,
  onChange,
  disabled,
  placeholder = "Selecciona una opción",
  className,
}: FormSelectProps) {
  const fieldId = id ?? name;

  const field = (current: string, setValue: (next: string) => void, onBlur?: () => void) => (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Select
        id={fieldId}
        value={current}
        onChange={setValue}
        onBlur={onBlur}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(error)}
      />
      <FormFieldError message={error?.message} />
    </div>
  );

  if (control) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field: f }) => field(String(f.value ?? ""), f.onChange, f.onBlur)}
      />
    );
  }

  return field(value ?? "", (next) => {
    onChange?.({ target: { name, value: next } });
  });
}
