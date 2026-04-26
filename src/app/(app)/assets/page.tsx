import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { AssetsTable } from "@/frontend/components/features/assets/AssetsTable";
import { FadeIn } from "@/frontend/components/motion/FadeIn";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AssetsPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <FadeIn>
      <PageHeader
        title="Asset explorer"
        description="Search and filter across equities, mutual funds, ETFs, indices, commodities and currency."
      />
      <AssetsTable initialQuery={sp.q ?? ""} />
    </FadeIn>
  );
}
