const formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function formatMxn(cents: number): string {
  return formatter.format(cents / 100);
}
