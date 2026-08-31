import type { ClothingStorageLocationNode } from "@/lib/types/db";

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
