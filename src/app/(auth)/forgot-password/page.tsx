"use client";
import * as React from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setDone(true);
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the email you use with Investa. We'll send you a link to set a new password.
          </p>

          {done ? (
            <div className="mt-6 flex items-start gap-2 rounded-md border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-3 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div>
                If an account exists for <strong>{email}</strong>, we've emailed a reset link. It expires in 60 minutes.
                Check your spam folder if you don't see it.
              </div>
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
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" className="pl-8" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !email}>
                {submitting ? "Sending…" : (<>Send reset link <ArrowRight className="size-4" /></>)}
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
