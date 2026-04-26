"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import * as React from "react";

type Props = HTMLMotionProps<"div"> & { delay?: number; y?: number };

export function FadeIn({ delay = 0, y = 8, children, ...p }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
      {...p}
    >
      {children}
    </motion.div>
  );
}
