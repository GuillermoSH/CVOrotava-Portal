const eurFormat = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  // es-ES no agrupa los números de 4 cifras ("2950,00 €"): se fuerza para que todas las cifras
  // de una pantalla lleven separador de miles.
  useGrouping: "always",
});

/** Importe en euros con separador de miles y dos decimales: 2.950,00 €. */
export function formatEur(value: number): string {
  return eurFormat.format(value);
}
