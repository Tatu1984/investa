"use client";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/frontend/utils/cn";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...p }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-xs font-medium text-foreground/80", className)}
    {...p}
  />
));
Label.displayName = "Label";
