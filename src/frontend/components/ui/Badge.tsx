import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/frontend/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        buy: "border-transparent bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]",
        hold: "border-transparent bg-muted text-muted-foreground",
        avoid: "border-transparent bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]",
        warning: "border-transparent bg-[color-mix(in_oklab,var(--warning)_22%,transparent)] text-[color-mix(in_oklab,var(--warning)_70%,var(--foreground))]",
        info: "border-transparent bg-[color-mix(in_oklab,var(--info)_16%,transparent)] text-[color-mix(in_oklab,var(--info)_80%,var(--foreground))]",
        accent: "border-transparent bg-accent/20 text-accent-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...p }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...p} />;
}
