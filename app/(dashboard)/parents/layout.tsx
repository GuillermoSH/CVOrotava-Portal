import { AppShell } from "@/components/layout/AppShell";

export default function ParentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      navTitle="Área familias"
      sidebarUser={{ name: "Familia López", role: "Familia" }}
    >
      {children}
    </AppShell>
  );
}
