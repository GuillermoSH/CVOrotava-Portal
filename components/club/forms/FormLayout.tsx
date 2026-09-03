import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/club/Button";
import { Card } from "@/components/club/Card";

interface FormLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  buttonText: string;
  onDelete?: () => void;
}

export function FormLayout({
  title,
  description,
  children,
  onSubmit,
  loading,
  buttonText,
  onDelete,
}: FormLayoutProps) {
  return (
    <form onSubmit={onSubmit} className="w-full">
      <Card className="flex flex-col gap-4 p-6 sm:gap-6 sm:p-8">
        <div>
          <h1 className="mb-1 text-xl font-bold text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="h-px bg-border" />

        {children}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={loading} className="min-w-[7rem]">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Guardando…
              </span>
            ) : (
              buttonText
            )}
          </Button>
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onDelete}
              aria-label="Eliminar"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </Card>
    </form>
  );
}
