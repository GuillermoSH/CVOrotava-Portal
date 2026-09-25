import type {
  ClothingProduct,
  ClothingStorageLocation,
  ClothingStorageLocationNode,
} from "@/lib/types/db";

export function buildLocationPath(
  locationId: string | null,
  locations: ClothingStorageLocation[],
): string | null {
  if (!locationId) return null;
  const byId = new Map(locations.map((l) => [l.id, l]));
  const parts: string[] = [];
  let current = byId.get(locationId);
  while (current) {
    parts.unshift(current.label);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return parts.length ? parts.join(" › ") : null;
}

export function buildStorageTreeFromFlat(
  locations: ClothingStorageLocation[],
): ClothingStorageLocationNode[] {
  const nodeMap = new Map<string, ClothingStorageLocationNode>();
  for (const loc of locations) {
    nodeMap.set(loc.id, { ...loc, children: [] });
  }

  const roots: ClothingStorageLocationNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else if (!node.parent_id) {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: ClothingStorageLocationNode[]) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label, "es"));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export function productMapFromList(products: ClothingProduct[]): Map<string, ClothingProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

export function dbErrorMessage(error: { message: string } | null): string {
  return error?.message ?? "Error de base de datos";
}
