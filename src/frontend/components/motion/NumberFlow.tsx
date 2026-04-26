"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import * as React from "react";

export function NumberFlow({ value, format = (v) => v.toFixed(2), className }: { value: number; format?: (v: number) => string; className?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => format(v));
  React.useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
