"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle } from "lucide-react";
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
    const d = e.response?.data as { detail?: string; title?: string; errors?: Array<{ message: string }> } | undefined;
    if (d?.errors?.length) return d.errors[0]!.message;
    return d?.detail || d?.title || e.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function RegisterForm() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await authApi.register({ name, email, password });
      setUser({ id: user.id, name: user.name, email: user.email });
      router.push("/for-you");
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
          <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free to try. Research-only — not investment advice.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-3 py-2 text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" className="pl-8" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-8" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" minLength={8} className="pl-8" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <p className="text-[11px] text-muted-foreground">Min 8 chars.</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : (<>Create account <ArrowRight className="size-4" /></>)}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
