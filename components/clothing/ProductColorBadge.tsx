import {
  CLOTHING_COLOR_LABELS,
  isClothingComboColor,
  parseClothingComboColor,
} from "@/lib/clothing/constants";
import type { ClothingProductColor } from "@/lib/types/db";
import { cn } from "@/lib/utils";

function ColorSwatch({ color }: { color: ClothingProductColor }) {
  if (isClothingComboColor(color)) {
    const parts = parseClothingComboColor(color);
    if (!parts) return null;
    const [first, second] = parts;

    return (
      <span className="product-color-badge__swatch product-color-badge__swatch--duo" aria-hidden>
        <span
          className={cn(
            "product-color-badge__swatch-half",
            `product-color-badge__swatch-half--${first}`,
          )}
        />
        <span
          className={cn(
            "product-color-badge__swatch-half",
            `product-color-badge__swatch-half--${second}`,
          )}
        />
      </span>
    );
  }

  return <span className="product-color-badge__swatch" aria-hidden />;
}

export function ProductColorBadge({
  color,
  className,
}: {
  color: ClothingProductColor;
  className?: string;
}) {
  const combo = isClothingComboColor(color);

  return (
    <span
      className={cn(
        "product-color-badge",
        combo ? "product-color-badge--combo" : `product-color-badge--${color}`,
        combo && `product-color-badge--${color}`,
        className,
      )}
    >
      <ColorSwatch color={color} />
      {CLOTHING_COLOR_LABELS[color]}
    </span>
  );
}
