"use client";
import { motion } from "framer-motion";

export function GradientBlob() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle at center, color-mix(in oklab, var(--accent) 55%, transparent), transparent 60%)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-0 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle at center, color-mix(in oklab, var(--info) 40%, transparent), transparent 60%)" }}
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
