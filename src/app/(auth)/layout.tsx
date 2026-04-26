import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GradientBlob } from "@/frontend/components/motion/GradientBlob";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <GradientBlob />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 self-start">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Investa</span>
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Research-only platform. Not investment advice.
        </p>
      </div>
    </div>
  );
}
