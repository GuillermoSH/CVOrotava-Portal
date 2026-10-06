import { DashboardPageSkeleton } from "@/components/shared/skeletons";

/** Suspense de segmento: cookies/searchParams/datos de página streaman detrás del skeleton. */
export default function AdminLoading() {
  return <DashboardPageSkeleton />;
}
