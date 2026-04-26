import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { PlanBuilder } from "@/frontend/components/features/simple/PlanBuilder";
import { PlanResult } from "@/frontend/components/features/simple/PlanResult";
import { FadeIn } from "@/frontend/components/motion/FadeIn";

export default function ForYouPage() {
  return (
    <FadeIn>
      <PageHeader
        title="For you"
        description="A plain-English plan: what to buy, how much, and how long to hold. No jargon."
      />

      <div className="space-y-6">
        <PlanBuilder />
        <PlanResult />
      </div>
    </FadeIn>
  );
}
