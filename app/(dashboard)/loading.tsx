import { DashboardPageSkeleton } from "@/components/shared/skeletons";

/** Cubre rutas del grupo dashboard fuera de admin/parents (p. ej. /perfil). */
export default function DashboardLoading() {
  return <DashboardPageSkeleton />;
}
