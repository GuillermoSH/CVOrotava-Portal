import type { ClothingDb } from "@/lib/clothing/repository/client";
import { dbErrorMessage } from "@/lib/clothing/repository/helpers";
import { mapProduct } from "@/lib/clothing/repository/mappers";
import type {
  ClothingProduct,
  ClothingProductBrand,
  ClothingProductCategory,
  ClothingProductColor,
} from "@/lib/types/db";

export async function listProducts(db: ClothingDb): Promise<ClothingProduct[]> {
  const { data, error } = await db
    .from("clothing_products")
    .select("*")
    .order("model", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapProduct);
}

export async function listActiveProducts(db: ClothingDb): Promise<ClothingProduct[]> {
  const { data, error } = await db
    .from("clothing_products")
    .select("*")
    .eq("is_active", true)
    .order("model", { ascending: true });

  if (error) throw new Error(dbErrorMessage(error));
  return (data ?? []).map(mapProduct);
}

export async function getProductById(
  db: ClothingDb,
  id: string,
): Promise<ClothingProduct | null> {
  const { data, error } = await db.from("clothing_products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapProduct(data) : null;
}

export async function findDuplicateProduct(
  db: ClothingDb,
  model: string,
  brand: ClothingProductBrand,
  color: ClothingProductColor,
  category: ClothingProductCategory,
  season: string,
  excludeId?: string,
): Promise<ClothingProduct | null> {
  let query = db
    .from("clothing_products")
    .select("*")
    .eq("season", season.trim())
    .eq("brand", brand)
    .eq("color", color)
    .eq("category", category)
    .ilike("model", model.trim());

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(dbErrorMessage(error));
  return data ? mapProduct(data) : null;
}

export async function createProduct(
  db: ClothingDb,
  input: {
    model: string;
    brand: ClothingProductBrand;
    category: ClothingProductCategory;
    color: ClothingProductColor;
    season: string;
    notes?: string | null;
    is_shop_item?: boolean;
  },
): Promise<ClothingProduct> {
  const { data, error } = await db
    .from("clothing_products")
    .insert({
      model: input.model.trim(),
      brand: input.brand,
      category: input.category,
      color: input.color,
      season: input.season.trim(),
      notes: input.notes ?? null,
      is_shop_item: input.is_shop_item ?? false,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapProduct(data);
}

export async function updateProduct(
  db: ClothingDb,
  input: {
    id: string;
    model: string;
    brand: ClothingProductBrand;
    category: ClothingProductCategory;
    color: ClothingProductColor;
    season: string;
    notes?: string | null;
    is_shop_item?: boolean;
    is_active?: boolean;
  },
): Promise<ClothingProduct> {
  const patch: Record<string, unknown> = {
    model: input.model.trim(),
    brand: input.brand,
    category: input.category,
    color: input.color,
    season: input.season.trim(),
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.is_shop_item !== undefined) patch.is_shop_item = input.is_shop_item;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { data, error } = await db
    .from("clothing_products")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw new Error(dbErrorMessage(error));
  return mapProduct(data);
}

export async function productUsedInOrders(db: ClothingDb, productId: string): Promise<boolean> {
  const { count, error } = await db
    .from("clothing_supplier_order_lines")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) throw new Error(dbErrorMessage(error));
  return (count ?? 0) > 0;
}

export async function productUsedInInventory(db: ClothingDb, productId: string): Promise<boolean> {
  const { count, error } = await db
    .from("clothing_inventory_lots")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId);

  if (error) throw new Error(dbErrorMessage(error));
  return (count ?? 0) > 0;
}

export async function deleteProduct(db: ClothingDb, id: string): Promise<void> {
  const { error } = await db.from("clothing_products").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
}

export async function deleteProductsByIds(db: ClothingDb, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db.from("clothing_products").delete().in("id", ids);
  if (error) throw new Error(dbErrorMessage(error));
}
