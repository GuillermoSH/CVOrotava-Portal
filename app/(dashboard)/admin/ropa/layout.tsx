import type { ReactNode } from "react";

import { ClothingBoardNav } from "@/components/clothing/ClothingBoardNav";

export default function ClothingAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ropa-board flex flex-col gap-5 md:gap-6">
      <ClothingBoardNav />
      {children}
    </div>
  );
}
