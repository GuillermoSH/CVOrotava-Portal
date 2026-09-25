export const CLOTHING_ORDERS_VIEW_KEY = "cvo.clothingOrdersView";

export type ClothingOrdersView = "kanban" | "list";

export function readClothingOrdersView(): ClothingOrdersView {
  if (typeof window === "undefined") return "kanban";
  const stored = window.localStorage.getItem(CLOTHING_ORDERS_VIEW_KEY);
  return stored === "list" ? "list" : "kanban";
}

export function writeClothingOrdersView(view: ClothingOrdersView) {
  window.localStorage.setItem(CLOTHING_ORDERS_VIEW_KEY, view);
}
