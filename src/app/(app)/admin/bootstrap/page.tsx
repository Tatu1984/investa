import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { BootstrapPanel } from "@/frontend/components/features/admin/BootstrapPanel";
import { FadeIn } from "@/frontend/components/motion/FadeIn";

export const dynamic = "force-dynamic";

export default function BootstrapPage() {
  return (
    <FadeIn>
      <PageHeader
        title="Bootstrap data pipeline"
        description="One-click first-run: ingest equities, mutual funds, 1Y of price history, then run analytics + AI narration. Safe to re-run anytime."
      />
      <BootstrapPanel />
    </FadeIn>
  );
}
