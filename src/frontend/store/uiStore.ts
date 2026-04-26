"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Horizon = "short" | "medium" | "long";        // <1y / 1–3y / 5y+
export type Risk = "careful" | "balanced" | "growth";
export type Frequency = "onetime" | "monthly";            // lumpsum vs SIP

interface UiState {
  amount: number;            // rupees — one-time total OR monthly contribution
  horizon: Horizon;
  risk: Risk;
  frequency: Frequency;
  setAmount: (n: number) => void;
  setHorizon: (h: Horizon) => void;
  setRisk: (r: Risk) => void;
  setFrequency: (f: Frequency) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      amount: 50000,
      horizon: "medium",
      risk: "balanced",
      frequency: "onetime",
      setAmount: (amount) => set({ amount }),
      setHorizon: (horizon) => set({ horizon }),
      setRisk: (risk) => set({ risk }),
      setFrequency: (frequency) => set({ frequency }),
    }),
    { name: "investa-ui" }
  )
);

/** Months to project for SIPs, based on horizon */
export function horizonMonths(h: Horizon): number {
  return h === "short" ? 12 : h === "medium" ? 36 : 60;
}
