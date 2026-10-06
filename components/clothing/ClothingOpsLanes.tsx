import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ClothingOpsLane = {
  href: string;
  title: string;
  meta?: string;
  score?: string;
  accent?: boolean;
  icon?: ReactNode;
};

export function ClothingOpsLanes({ lanes }: { lanes: ClothingOpsLane[] }) {
  return (
    <ul className="ropa-ops-lanes">
      {lanes.map((lane) => (
        <li key={lane.href + lane.title}>
          <Link
            href={lane.href}
            className={cn("ropa-ops-lane", lane.accent && "ropa-ops-lane--accent")}
          >
            {lane.icon ? <span className="ropa-ops-lane__icon">{lane.icon}</span> : null}
            <span className="ropa-ops-lane__text">
              <span className="ropa-ops-lane__title">{lane.title}</span>
              {lane.meta ? <span className="ropa-ops-lane__meta">{lane.meta}</span> : null}
            </span>
            {lane.score != null ? (
              <span className="ropa-digit ropa-ops-lane__score">{lane.score}</span>
            ) : (
              <span className="ropa-ops-lane__chev" aria-hidden>
                →
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
