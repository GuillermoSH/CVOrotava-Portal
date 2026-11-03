import { TitleTooltips } from "@/components/club/TitleTooltips";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TitleTooltips />
    </>
  );
}
