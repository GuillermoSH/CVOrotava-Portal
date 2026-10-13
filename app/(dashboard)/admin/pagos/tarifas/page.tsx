import { FeeTariffsPageClient } from "@/components/payments/FeeTariffsPageClient";
import { RuntimePage } from "@/components/shared/RuntimePage";
import { requirePaymentsWriteAccess } from "@/lib/payments/auth";
import { getCachedSeasonFeeLines } from "@/lib/payments/cached-fees";
import { getCurrentSeason, getSeasonSelectOptions } from "@/lib/season";

async function FeeTariffsContent({
  searchParams,
}: {
  searchParams: Promise<{ season?: string | string[] }>;
}) {
  await requirePaymentsWriteAccess();

  const params = await searchParams;
  const current = getCurrentSeason();
  const requested = Array.isArray(params.season) ? params.season[0] : params.season;
  const season = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : current;

  const lines = await getCachedSeasonFeeLines(season);
  const seasonOptions = getSeasonSelectOptions([season], { pastCount: 3, futureCount: 1 });

  return (
    <FeeTariffsPageClient
      season={season}
      currentSeason={current}
      seasonOptions={seasonOptions}
      lines={lines}
    />
  );
}

export default function FeeTariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string | string[] }>;
}) {
  return (
    <RuntimePage kind="products">
      <FeeTariffsContent searchParams={searchParams} />
    </RuntimePage>
  );
}
