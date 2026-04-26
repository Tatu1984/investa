"use client";
import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Input } from "@/frontend/components/ui/Input";
import { Label } from "@/frontend/components/ui/Label";
import { Button } from "@/frontend/components/ui/Button";
import { Switch } from "@/frontend/components/ui/Switch";
import { Separator } from "@/frontend/components/ui/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/Tabs";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { useAuthStore } from "@/frontend/store/authStore";
import { authApi } from "@/frontend/api/endpoints/auth.api";
import { usersApi } from "@/frontend/api/endpoints/users.api";

function msgFrom(e: unknown) {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string; errors?: Array<{ message: string }> } | undefined;
    if (d?.errors?.length) return d.errors[0]!.message;
    return d?.detail ?? e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

export default function SettingsPage() {
  const setUser = useAuthStore((s) => s.setUser);

  // Hydrate from server so settings form is authoritative.
  const me = useQuery({ queryKey: ["auth","me"], queryFn: authApi.me });

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [curr, setCurr] = React.useState("");
  const [next1, setNext1] = React.useState("");
  const [next2, setNext2] = React.useState("");
  const [digest, setDigest] = React.useState(true);
  const [alertEmail, setAlertEmail] = React.useState(true);
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setEmail(me.data.email);
    }
  }, [me.data]);

  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark"); else root.classList.remove("dark");
  }, [dark]);

  const saveProfile = useMutation({
    mutationFn: () => usersApi.updateMe({ name, email }),
    onSuccess: (u) => {
      setUser({ id: u.id, name: u.name, email: u.email });
    },
  });

  const changePw = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword: curr, newPassword: next1 }),
    onSuccess: () => { setCurr(""); setNext1(""); setNext2(""); },
  });

  const pwMismatch = next1 && next2 && next1 !== next2;

  return (
    <FadeIn>
      <PageHeader title="Settings" description="Profile, notifications, appearance, and data controls." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="api">API keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card><CardContent className="max-w-xl space-y-4 p-6">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending || !name || !email}>
                {saveProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
              {saveProfile.isSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]">
                  <CheckCircle2 className="size-3.5" /> Saved
                </span>
              )}
              {saveProfile.error && (
                <span className="inline-flex items-center gap-1 text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">
                  <AlertCircle className="size-3.5" /> {msgFrom(saveProfile.error)}
                </span>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="security">
          <Card><CardContent className="max-w-xl space-y-4 p-6">
            <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Confirm new password</Label><Input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} /></div>
            {pwMismatch && (
              <p className="text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">New passwords don't match.</p>
            )}
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => changePw.mutate()} disabled={changePw.isPending || !curr || !next1 || pwMismatch || next1.length < 8}>
                {changePw.isPending ? "Updating…" : "Update password"}
              </Button>
              {changePw.isSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]">
                  <CheckCircle2 className="size-3.5" /> Password updated · other sessions signed out
                </span>
              )}
              {changePw.error && (
                <span className="inline-flex items-center gap-1 text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">
                  <AlertCircle className="size-3.5" /> {msgFrom(changePw.error)}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Two-factor authentication</div>
                <div className="text-xs text-muted-foreground">Adds a TOTP code to every login. <span className="italic">Coming in Phase G.</span></div>
              </div>
              <Switch defaultChecked={false} disabled />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card><CardContent className="max-w-xl space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Daily digest</div>
                <div className="text-xs text-muted-foreground">Email the daily report at 07:30 IST. <span className="italic">Email delivery lands in Phase E.</span></div>
              </div>
              <Switch checked={digest} onCheckedChange={setDigest} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Alert emails</div>
                <div className="text-xs text-muted-foreground">Signal-change and risk alerts to your inbox.</div>
              </div>
              <Switch checked={alertEmail} onCheckedChange={setAlertEmail} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card><CardContent className="max-w-xl space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Dark mode</div>
                <div className="text-xs text-muted-foreground">Toggle Claude-style dark palette.</div>
              </div>
              <Switch checked={dark} onCheckedChange={setDark} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="api">
          <Card><CardContent className="max-w-xl space-y-3 p-6">
            <div className="text-sm font-medium">Personal API tokens</div>
            <p className="text-xs text-muted-foreground">
              Programmatic access to signals, metrics and reports. <span className="italic">Token issuance lands in Phase G alongside rate-limit tiers.</span>
            </p>
            <Button size="sm" disabled>Generate token</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
