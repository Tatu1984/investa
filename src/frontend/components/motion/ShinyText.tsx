"use client";
import { motion } from "framer-motion";
import { cn } from "@/frontend/utils/cn";

export function ShinyText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-block text-foreground", className)}>
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden
        className="absolute inset-0 z-0 bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--accent) 80%, transparent) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        {children}
      </motion.span>
    </span>
  );
}
