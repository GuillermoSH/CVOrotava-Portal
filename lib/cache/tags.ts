export function clothingProductsTag(): string {
  return "clothing:products";
}

export function rosterSeasonTag(season: string): string {
  return `roster:season:${season}`;
}

export function playerTag(id: string): string {
  return `roster:player:${id}`;
}
