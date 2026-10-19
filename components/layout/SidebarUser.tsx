"use client";

import { AccountProfileMenu } from "@/components/layout/AccountProfileMenu";
import { signOut } from "@/lib/actions/auth";

const defaultUser = {
  name: "Dirección CVO",
  role: "Dirección",
} as const;

/**
 * Pie del menú lateral: una sola fila compacta de altura fija (tema y cierre de
 * sesión van en el desplegable), para que contraer/expandir no cambie su altura.
 */
export function SidebarUser({
  user = defaultUser,
  collapsed = false,
}: {
  user?: { name: string; role: string };
  collapsed?: boolean;
}) {
  function handleLogout() {
    void signOut();
  }

  return (
    <div className="border-t border-border pt-3">
      <AccountProfileMenu
        layout="row"
        collapsed={collapsed}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
        contentAlign="end"
        contentSide={collapsed ? "right" : "top"}
      />
    </div>
  );
}
