import { z } from "zod";

import {
  CLOTHING_BRANDS,
  CLOTHING_CATEGORIES,
  CLOTHING_COLORS,
  CLOTHING_SIZES,
  LOCATION_TYPES,
  ORDER_STATUSES,
} from "@/lib/clothing/constants";

export const orderLineSchema = z.object({
  product_id: z.string().uuid(),
  size: z.enum(CLOTHING_SIZES),
  quantity_ordered: z.coerce.number().int().min(1).max(9999),
});

export const createOrderSchema = z.object({
  reference: z.string().min(2).max(40).optional(),
  supplier_name: z.string().min(1).max(120),
  season: z.string().min(4).max(20),
  notes: z.string().max(2000).optional(),
  lines: z.array(orderLineSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
});

export const createLocationSchema = z.object({
  parent_id: z.string().uuid().nullable(),
  location_type: z.enum(LOCATION_TYPES),
  label: z.string().min(1).max(80),
  code: z.string().min(1).max(40),
  season: z.string().min(4).max(20),
  notes: z.string().max(500).optional(),
});

export const assignInventorySchema = z.object({
  lot_id: z.string().uuid(),
  storage_location_id: z.string().uuid(),
});

export const createManualInventorySchema = z.object({
  product_id: z.string().uuid(),
  size: z.enum(CLOTHING_SIZES),
  quantity: z.coerce.number().int().min(1).max(9999),
  storage_location_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const createProductSchema = z.object({
  model: z.string().min(1).max(120),
  brand: z.enum(CLOTHING_BRANDS),
  category: z.enum(CLOTHING_CATEGORIES),
  color: z.enum(CLOTHING_COLORS),
  season: z.string().min(4).max(20),
  is_shop_item: z.boolean().optional().default(false),
  notes: z.string().max(500).optional(),
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
});

export const updateOrderLineReceivedSchema = z.object({
  line_id: z.string().uuid(),
  quantity_received: z.coerce.number().int().min(0).max(9999),
});

export const updateLocationSchema = createLocationSchema.extend({
  id: z.string().uuid(),
});

export const moveLocationSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
});
