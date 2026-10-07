import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ClothingOpsLane = {
  href: string;
  title: string;
  meta?: string;
  score?: string;
  accent?: boolean;
  icon: ReactNode;
};

export function ClothingOpsLanes({ lanes }: { lanes: ClothingOpsLane[] }) {
  return (
    <div className="ropa-panel overflow-hidden">
      <ul className="ropa-quick-links">
        {lanes.map((lane, index) => (
          <li key={lane.href + lane.title}>
            <Link
              href={lane.href}
              className={cn(
                "ropa-quick-link",
                lane.accent && "ropa-quick-link--accent",
                index > 0 && "ropa-quick-link--bordered",
              )}
            >
              <span className="ropa-quick-link__icon" aria-hidden>
                {lane.icon}
              </span>
              <span className="ropa-quick-link__text">
                <span className="ropa-quick-link__title">{lane.title}</span>
                {lane.meta ? <span className="ropa-quick-link__meta">{lane.meta}</span> : null}
              </span>
              <span className="ropa-quick-link__trail" aria-hidden>
                {lane.score != null ? (
                  <span className="ropa-digit ropa-quick-link__score">{lane.score}</span>
                ) : (
                  <ChevronRight className="size-4 shrink-0 opacity-45" />
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
