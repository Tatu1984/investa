import Link from "next/link";
import { Download, Sparkles } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Button } from "@/frontend/components/ui/Button";
import { ForYouBanner } from "@/frontend/components/features/simple/ForYouBanner";
import { DashboardLive } from "@/frontend/components/features/dashboard/DashboardLive";
import { FadeIn } from "@/frontend/components/motion/FadeIn";

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <FadeIn>
      <PageHeader
        title="Good morning, investor."
        description={`Live intelligence brief for ${today}. Data from NeonDB · NSE + AMFI + Yahoo feeds.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/reports`}>
                <Download className="size-4" /> Reports
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signals">
                <Sparkles className="size-4" /> Explore signals
              </Link>
            </Button>
          </>
        }
      />

      <ForYouBanner />
      <DashboardLive />
    </FadeIn>
  );
}
