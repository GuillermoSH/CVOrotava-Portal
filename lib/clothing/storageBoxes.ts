import type {
  ClothingInventoryLotWithDetails,
  ClothingStorageLocation,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export type BoxHome = {
  box: ClothingStorageLocationNode;
  cabinet: ClothingStorageLocationNode | null;
  shelf: ClothingStorageLocationNode | null;
};

export type CabinetGroup = {
  cabinet: ClothingStorageLocationNode;
  boxes: ClothingStorageLocationNode[];
};

export type BoxBoard = {
  loose: ClothingStorageLocationNode[];
  cabinets: CabinetGroup[];
};

export function flattenBoxNodes(
  nodes: ClothingStorageLocationNode[],
): ClothingStorageLocationNode[] {
  const boxes: ClothingStorageLocationNode[] = [];
  for (const node of nodes) {
    if (node.location_type === "box") boxes.push(node);
    boxes.push(...flattenBoxNodes(node.children));
  }
  return boxes;
}

export function flattenCabinets(
  nodes: ClothingStorageLocationNode[],
): ClothingStorageLocationNode[] {
  return nodes.filter((node) => node.location_type === "cabinet");
}

export function buildBoxPath(
  boxId: string,
  nodes: ClothingStorageLocationNode[],
  trail: string[] = [],
): string | null {
  for (const node of nodes) {
    const path = [...trail, node.label];
    if (node.id === boxId) return path.join(" › ");
    const child = buildBoxPath(boxId, node.children, path);
    if (child) return child;
  }
  return null;
}

export function collectBoxHomes(nodes: ClothingStorageLocationNode[]): BoxHome[] {
  const homes: BoxHome[] = [];

  function walk(
    node: ClothingStorageLocationNode,
    cabinet: ClothingStorageLocationNode | null,
    shelf: ClothingStorageLocationNode | null,
  ) {
    if (node.location_type === "box") {
      homes.push({ box: node, cabinet, shelf });
      return;
    }
    const nextCabinet = node.location_type === "cabinet" ? node : cabinet;
    const nextShelf = node.location_type === "shelf" ? node : shelf;
    for (const child of node.children) walk(child, nextCabinet, nextShelf);
  }

  for (const node of nodes) walk(node, null, null);
  return homes;
}

export function buildBoxBoard(nodes: ClothingStorageLocationNode[]): BoxBoard {
  const homes = collectBoxHomes(nodes);
  const cabinets = flattenCabinets(nodes).map((cabinet) => ({
    cabinet,
    boxes: homes.filter((home) => home.cabinet?.id === cabinet.id).map((home) => home.box),
  }));
  const loose = homes.filter((home) => !home.cabinet).map((home) => home.box);
  return { loose, cabinets };
}

export function boxHomeLabel(home: BoxHome): string {
  if (!home.cabinet) return "Suelta";
  if (home.shelf) return `${home.cabinet.label} · ${home.shelf.label}`;
  return home.cabinet.label;
}

export function findBoxHome(
  boxId: string,
  nodes: ClothingStorageLocationNode[],
): BoxHome | null {
  return collectBoxHomes(nodes).find((home) => home.box.id === boxId) ?? null;
}

export function suggestNextBoxCode(locations: Pick<ClothingStorageLocation, "code">[]): string {
  const used = new Set(locations.map((loc) => loc.code.trim().toUpperCase()));
  let n = 1;
  while (used.has(`CAJ-${String(n).padStart(2, "0")}`)) n += 1;
  return `CAJ-${String(n).padStart(2, "0")}`;
}

export function suggestNextCabinetCode(
  locations: Pick<ClothingStorageLocation, "code">[],
): string {
  const used = new Set(locations.map((loc) => loc.code.trim().toUpperCase()));
  for (let i = 0; i < 26; i += 1) {
    const code = `ARM-${String.fromCharCode(65 + i)}`;
    if (!used.has(code)) return code;
  }
  return `ARM-${locations.length + 1}`;
}

export type BoxInventoryGroup = {
  box: ClothingStorageLocationNode;
  home: string;
  lots: ClothingInventoryLotWithDetails[];
  units: number;
};

export function groupLotsByBox(
  lots: ClothingInventoryLotWithDetails[],
  tree: ClothingStorageLocationNode[],
): { pending: ClothingInventoryLotWithDetails[]; groups: BoxInventoryGroup[] } {
  const homes = collectBoxHomes(tree);
  const pending = lots.filter((lot) => !lot.storage_location_id);
  const groups = homes
    .map((home) => {
      const boxLots = lots.filter((lot) => lot.storage_location_id === home.box.id);
      return {
        box: home.box,
        home: boxHomeLabel(home),
        lots: boxLots,
        units: boxLots.reduce((sum, lot) => sum + lot.quantity, 0),
      };
    })
    .sort((a, b) => a.box.code.localeCompare(b.box.code, "es"));

  return { pending, groups };
}
