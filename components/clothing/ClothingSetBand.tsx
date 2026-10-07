import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ClothingSetBandProps = {
  label?: string;
  title: string;
  body?: string;
  href?: string;
  hrefLabel?: string;
  score?: { value: string; helper?: string };
  lit?: boolean;
  children?: ReactNode;
  className?: string;
};

/** Banda «Ahora» del marcador: un solo set activo iluminado. */
export function ClothingSetBand({
  label = "Ahora",
  title,
  body,
  href,
  hrefLabel,
  score,
  lit = true,
  children,
  className,
}: ClothingSetBandProps) {
  return (
    <div className={cn("ropa-set-band", lit && "ropa-set-band--lit", className)}>
      <div className="ropa-set-band__main">
        <p className="ropa-set-band__label">{label}</p>
        <h2 className="ropa-set-band__title">{title}</h2>
        {body ? <p className="ropa-set-band__body">{body}</p> : null}
        {href && hrefLabel ? (
          href.startsWith("#") ? (
            <a href={href} className="ropa-set-band__cta">
              {hrefLabel}
            </a>
          ) : (
            <Link href={href} className="ropa-set-band__cta">
              {hrefLabel}
            </Link>
          )
        ) : null}
        {children}
      </div>
      {score ? (
        <div className="ropa-set-band__score">
          <span className="ropa-digit ropa-digit--lg">{score.value}</span>
          {score.helper ? (
            <span className="ropa-set-band__score-helper">{score.helper}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
