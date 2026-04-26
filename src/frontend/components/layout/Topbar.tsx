"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, Command, LogOut } from "lucide-react";
import { Input } from "@/frontend/components/ui/Input";
import { Button } from "@/frontend/components/ui/Button";
import { Avatar, AvatarFallback } from "@/frontend/components/ui/Avatar";
import { useAuthStore } from "@/frontend/store/authStore";
import { authApi } from "@/frontend/api/endpoints/auth.api";
import { alertsApi } from "@/frontend/api/endpoints/alerts.api";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = (user?.name ?? "DU")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  // Poll alert events; show count of items newer than the last "seen" timestamp on this device.
  const events = useQuery({
    queryKey: ["alerts", "events", "topbar"],
    queryFn: () => alertsApi.events({ limit: 25 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const unread = React.useMemo(() => {
    const list = events.data?.data ?? [];
    if (list.length === 0) return 0;
    const seen = typeof window !== "undefined" ? localStorage.getItem("investa-alerts-seen-at") : null;
    if (!seen) return list.length;
    const seenT = new Date(seen).getTime();
    return list.filter((e) => new Date(e.triggeredAt).getTime() > seenT).length;
  }, [events.data]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-5 backdrop-blur-md">
      <div className="relative hidden md:block md:w-96">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets, funds, tickers…"
          className="pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v) router.push(`/assets?q=${encodeURIComponent(v)}`);
            }
          }}
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex">
          <Command className="size-3" />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label={unread > 0 ? `Alerts (${unread} new)` : "Alerts"}>
          <Link href="/alerts" className="relative">
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-medium leading-none text-accent-foreground ring-2 ring-background">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <Avatar className="size-7">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{user?.name ?? "Demo User"}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Log out"
          onClick={async () => {
            try { await authApi.logout(); } catch { /* ignore */ }
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
