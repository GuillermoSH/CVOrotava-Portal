"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { ClothingBottomSheet } from "@/components/clothing/ClothingBottomSheet";
import { downloadPlayerTemplateAction, importPlayersAction } from "@/lib/actions/roster/import";
import { appToast } from "@/lib/toast";

function downloadBase64(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PlayersImportSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [issues, setIssues] = useState<{ row: number; message: string }[]>([]);

  function reset() {
    setFile(null);
    setIssues([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDownload() {
    startTransition(async () => {
      const result = await downloadPlayerTemplateAction();
      if (!result.ok) {
        appToast.error(result.error);
        return;
      }
      downloadBase64(result.filename, result.base64);
      appToast.success("Plantilla descargada");
    });
  }

  function handleImport() {
    if (!file) {
      appToast.error("Elige el Excel rellenado");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const result = await importPlayersAction(formData);
      if (!result.ok) {
        setIssues(result.issues ?? []);
        appToast.error(result.error);
        return;
      }
      setIssues(result.issues);
      appToast.success(
        result.created === 1 ? "1 jugador importado" : `${result.created} jugadores importados`,
      );
      if (result.issues.length === 0) {
        handleClose();
      }
      router.refresh();
    });
  }

  return (
    <ClothingBottomSheet
      open={open}
      onClose={handleClose}
      title="Importar jugadores"
      description="Descarga la plantilla, rellena en Excel y súbela. Las columnas cerradas tienen lista; si pones otro valor, Excel avisa. Los equipos tienen que existir ya en esta temporada."
      primaryAction={{
        label: file ? "Importar Excel" : "Elegir archivo",
        pending,
        onClick: file ? handleImport : () => inputRef.current?.click(),
      }}
      secondaryAction={{
        label: "Cancelar",
        onClick: handleClose,
      }}
    >
      <div className="flex flex-col gap-4">
        <button
          type="button"
          className="btn-secondary min-h-11 w-full justify-center"
          disabled={pending}
          onClick={handleDownload}
        >
          <FileSpreadsheet className="size-4" aria-hidden />
          Descargar plantilla
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setIssues([]);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const next = event.dataTransfer.files[0];
            if (next) {
              setFile(next);
              setIssues([]);
            }
          }}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--club-border)] px-4 py-6 text-center transition-colors hover:border-[var(--club-border-hover)] hover:bg-[var(--club-surface-hover)]"
        >
          <Upload className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            {file ? file.name : "Suelta aquí el Excel o elige un archivo"}
          </span>
          <span className="text-xs text-muted-foreground">.xlsx, .xls o .csv · máximo 200 filas</span>
        </button>

        {issues.length > 0 ? (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--club-border)] px-3 py-2">
            <p className="text-xs font-medium text-foreground">
              {issues.length === 1 ? "1 fila no se importó" : `${issues.length} filas no se importaron`}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
              {issues.slice(0, 12).map((issue, index) => (
                <li key={`${issue.row}-${index}`}>
                  {issue.row > 0 ? `Fila ${issue.row}: ` : null}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </ClothingBottomSheet>
  );
}
