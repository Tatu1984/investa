"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button";
import { Input } from "@/frontend/components/ui/Input";
import { Label } from "@/frontend/components/ui/Label";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { authApi } from "@/frontend/api/endpoints/auth.api";

function msg(e: unknown) {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string; errors?: Array<{ message: string }> } | undefined;
    if (d?.errors?.length) return d.errors[0]!.message;
    return d?.detail ?? e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mismatch = pw && pw2 && pw !== pw2;
  const tooShort = pw.length > 0 && pw.length < 8;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("This reset link is missing its token. Request a new one."); return; }
    if (mismatch || tooShort) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword({ token, newPassword: pw });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(msg(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FadeIn className="w-full max-w-md">
      <Card className="border border-border/80 shadow-xl">
        <CardContent className="p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your new password below. You'll be asked to sign in again afterwards.
          </p>

          {done ? (
            <div className="mt-6 flex items-start gap-2 rounded-md border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div>Password updated. Redirecting to sign-in…</div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-3 py-2 text-xs">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="pw">New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pw" type="password" minLength={8} className="pl-8" value={pw} onChange={(e) => setPw(e.target.value)} required />
                </div>
                {tooShort && <p className="text-[11px] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">At least 8 characters.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Confirm new password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pw2" type="password" className="pl-8" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
                </div>
                {mismatch && <p className="text-[11px] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">Passwords don't match.</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !pw || !pw2 || !!mismatch || tooShort}>
                {submitting ? "Updating…" : (<>Update password <ArrowRight className="size-4" /></>)}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground hover:underline">Back to log in</Link>
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
