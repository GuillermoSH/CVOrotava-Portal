"use client";

import { motion } from "framer-motion";
import { Home, Shirt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { appRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SidebarNav({
  homeHref,
  collapsed = false,
  variant = "sidebar",
}: {
  homeHref: string;
  collapsed?: boolean;
  variant?: "sidebar" | "dock";
}) {
  const pathname = usePathname();
  const homeActive = pathname === homeHref || pathname.startsWith(`${homeHref}/`);
  const showClothing = homeHref === appRoutes.admin;
  const clothingActive =
    pathname === appRoutes.clothing.hub || pathname.startsWith(`${appRoutes.clothing.hub}/`);

  const items = [
    {
      href: homeHref,
      label: "Inicio",
      icon: Home,
      active: homeActive && !clothingActive,
    },
    ...(showClothing
      ? [
          {
            href: appRoutes.clothing.hub,
            label: "Ropa",
            icon: Shirt,
            active: clothingActive,
          },
        ]
      : []),
  ];

  if (variant === "dock") {
    return (
      <div className="flex h-full w-full items-stretch justify-around px-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn("dock-link", item.active && "dock-link--active")}
          >
            {item.active ? (
              <motion.span
                layoutId="dock-active"
                className="dock-link__indicator"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            ) : null}
            <item.icon className="relative z-10 size-5 shrink-0" aria-hidden />
            <span className="relative z-10 truncate">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Principal" className={cn("mt-2", collapsed && "mt-0")}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "nav-link",
                item.active && "nav-link--active",
                collapsed && "justify-center px-0 py-2.5",
              )}
            >
              {item.active && !collapsed ? (
                <motion.span
                  layoutId="sidebar-active"
                  className="nav-link__pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <item.icon
                className={cn(
                  "relative z-10 size-4 shrink-0",
                  item.active && "text-brand",
                  collapsed && item.active && "rounded-md bg-[var(--club-surface)] p-1.5",
                )}
                aria-hidden
              />
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : (
                <span className="relative z-10">{item.label}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
