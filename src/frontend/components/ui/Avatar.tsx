"use client";
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/frontend/utils/cn";

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...p }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted", className)}
    {...p}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...p }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center bg-muted text-xs font-medium text-foreground", className)}
    {...p}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
