import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { CompareView } from "@/frontend/components/features/assets/CompareView";
import { FadeIn } from "@/frontend/components/motion/FadeIn";

type Props = { searchParams: Promise<{ a?: string | string[] }> };

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.a;
  const initial = Array.isArray(raw) ? raw : raw ? [raw] : ["RELIANCE", "HDFCBANK"];
  return (
    <FadeIn>
      <PageHeader
        title="Comparison tool"
        description="Normalize two to four assets against a common start date. Toggle signals and metrics."
      />
      <CompareView initial={initial} />
    </FadeIn>
  );
}
