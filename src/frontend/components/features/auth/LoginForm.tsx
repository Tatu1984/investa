"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/frontend/components/ui/Button";
import { Input } from "@/frontend/components/ui/Input";
import { Label } from "@/frontend/components/ui/Label";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { useAuthStore } from "@/frontend/store/authStore";
import { authApi } from "@/frontend/api/endpoints/auth.api";

function extractApiError(e: unknown): string {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string; title?: string } | undefined;
    return d?.detail || d?.title || e.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/for-you";
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = React.useState("demo@investa.local");
  const [password, setPassword] = React.useState("Demo@123");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await authApi.login({ email, password });
      setUser({ id: user.id, name: user.name, email: user.email });
      // Only allow same-origin relative paths; everything else falls back to /for-you.
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/for-you";
      router.push(safeNext);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FadeIn className="w-full max-w-md">
      <Card className="border border-border/80 shadow-xl">
        <CardContent className="p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in to view today's signals and report.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-8" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" className="pl-8" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : (<>Log in <ArrowRight className="size-4" /></>)}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
