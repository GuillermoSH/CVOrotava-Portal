export function clothingProductsTag(): string {
  return "clothing:products";
}

export function clothingInventoryTag(): string {
  return "clothing:inventory";
}

export function clothingOrdersTag(): string {
  return "clothing:orders";
}

export function paymentFeesTag(): string {
  return "payments:fees";
}

export function paymentsTag(): string {
  return "payments:records";
}

export function rosterSeasonTag(season: string): string {
  return `roster:season:${season}`;
}

export function playerTag(id: string): string {
  return `roster:player:${id}`;
}
