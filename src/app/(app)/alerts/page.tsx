"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Bell, Plus, Trash2, AlertCircle, ArrowUpRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/frontend/components/ui/Table";
import { Switch } from "@/frontend/components/ui/Switch";
import { Input } from "@/frontend/components/ui/Input";
import { Label } from "@/frontend/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/Tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/frontend/components/ui/Select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/frontend/components/ui/Dialog";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { alertsApi, type AlertDto } from "@/frontend/api/endpoints/alerts.api";

function readError(e: unknown): string {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string; errors?: Array<{ message: string }> } | undefined;
    if (d?.errors?.length) return d.errors[0]!.message;
    return d?.detail ?? e.message;
  }
  return "Something went wrong";
}

const TYPE_LABEL: Record<AlertDto["type"], string> = {
  signal_change: "signal change",
  risk_flag: "risk flag",
  trend_reversal: "trend reversal",
};

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AlertsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["alerts"], queryFn: alertsApi.list });
  const events = useQuery({
    queryKey: ["alerts", "events"],
    queryFn: () => alertsApi.events({ limit: 100 }),
    refetchInterval: 30_000,                   // poll every 30s
    refetchIntervalInBackground: false,
  });

  // Mark events as "read" by stamping the latest triggeredAt to localStorage when this page is open.
  React.useEffect(() => {
    const latest = events.data?.data[0]?.triggeredAt;
    if (latest) localStorage.setItem("investa-alerts-seen-at", latest);
  }, [events.data]);

  const create = useMutation({ mutationFn: alertsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }) });
  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Pick<AlertDto, "active" | "channel" | "threshold">> }) => alertsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const remove = useMutation({ mutationFn: alertsApi.remove, onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }) });

  const [open, setOpen] = React.useState(false);
  const [symbol, setSymbol] = React.useState("");
  const [type, setType] = React.useState<AlertDto["type"]>("signal_change");
  const [threshold, setThreshold] = React.useState("");
  const [channel, setChannel] = React.useState<AlertDto["channel"]>("in_app");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ symbol: symbol.trim().toUpperCase(), type, threshold: threshold || undefined, channel });
    setOpen(false);
    setSymbol(""); setThreshold(""); setType("signal_change"); setChannel("in_app");
  };

  return (
    <FadeIn>
      <PageHeader
        title="Alerts"
        description="Get notified when an asset's signal changes, volatility spikes, or a 50/200-DMA crosses. Live from Neon."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => events.refetch()} disabled={events.isFetching}>
              <RefreshCw className={`size-4 ${events.isFetching ? "animate-spin" : ""}`} /> Refresh events
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> New alert</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New alert</DialogTitle>
                  <DialogDescription>Tell us what to watch and how to notify you.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5"><Label>Symbol</Label><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. RELIANCE" required /></div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as AlertDto["type"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signal_change">Signal change (BUY/HOLD/AVOID flips)</SelectItem>
                        <SelectItem value="risk_flag">Risk flag (volatility spike)</SelectItem>
                        <SelectItem value="trend_reversal">Trend reversal (50DMA × 200DMA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Threshold (optional)</Label>
                    <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder='e.g. 35  (vol % for "risk flag"; ignored for the others)' />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v as AlertDto["channel"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_app">In-app</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {create.error && (
                    <div className="flex items-center gap-2 text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">
                      <AlertCircle className="size-3.5" /> {readError(create.error)}
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create alert"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">
            Recent events
            {(events.data?.data.length ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono text-accent-foreground">
                {events.data!.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card><CardContent className="p-5">
            {events.isLoading && <div className="py-8 text-center text-xs text-muted-foreground">Loading events…</div>}
            {events.error && <div className="py-8 text-center text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">Couldn't load events.</div>}
            {!events.isLoading && !events.error && (events.data?.data.length ?? 0) === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No events fired yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  The evaluator runs nightly at 23:15 IST. To trigger one manually right now, hit{" "}
                  <code className="rounded bg-muted px-1">POST /api/v1/admin/alerts/evaluate</code> as an admin.
                </p>
              </div>
            )}
            {!events.isLoading && !events.error && (events.data?.data.length ?? 0) > 0 && (
              <Table>
                <THead><TR><TH>Fired</TH><TH>Asset</TH><TH>Type</TH><TH>Detail</TH><TH>Channel</TH></TR></THead>
                <TBody>
                  {events.data!.data.map((e) => (
                    <TR key={e.id}>
                      <TD className="font-mono text-xs">{relTime(e.triggeredAt)}</TD>
                      <TD className="font-mono text-sm"><Link href={`/assets/${e.symbol}`} className="hover:underline">{e.symbol}</Link></TD>
                      <TD className="text-xs uppercase tracking-wider text-muted-foreground">{TYPE_LABEL[e.type]}</TD>
                      <TD className="text-xs text-muted-foreground max-w-md">
                        <EventDetail payload={e.payload} type={e.type} />
                      </TD>
                      <TD><Badge variant="info">{e.channel.replace("_", "-")}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
            <p className="mt-4 text-[11px] text-muted-foreground">Polling every 30 s. Last refreshed {events.dataUpdatedAt ? relTime(new Date(events.dataUpdatedAt).toISOString()) : "—"}.</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card><CardContent className="p-5">
            {list.isLoading && <div className="py-10 text-center text-xs text-muted-foreground">Loading alerts…</div>}
            {list.error && <div className="py-10 text-center text-xs text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">Couldn't load alerts.</div>}
            {!list.isLoading && !list.error && (list.data?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <Bell className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No alerts yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Click + New alert to watch an asset.</p>
              </div>
            )}
            {!list.isLoading && !list.error && (list.data?.length ?? 0) > 0 && (
              <Table>
                <THead><TR><TH>Asset</TH><TH>Type</TH><TH>Threshold</TH><TH>Channel</TH><TH>Active</TH><TH></TH></TR></THead>
                <TBody>
                  {list.data!.map((a) => (
                    <TR key={a.id}>
                      <TD className="font-mono text-sm"><Link href={`/assets/${a.symbol}`} className="hover:underline inline-flex items-center gap-1">{a.symbol}<ArrowUpRight className="size-3 opacity-60" /></Link></TD>
                      <TD className="text-xs uppercase tracking-wider text-muted-foreground">{TYPE_LABEL[a.type]}</TD>
                      <TD className="text-xs text-muted-foreground">{a.threshold ?? "—"}</TD>
                      <TD><Badge variant="info">{a.channel.replace("_", "-")}</Badge></TD>
                      <TD>
                        <Switch
                          checked={a.active}
                          onCheckedChange={(val) => patch.mutate({ id: a.id, input: { active: val } })}
                        />
                      </TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove.mutate(a.id)} disabled={remove.isPending}>
                          <Trash2 className="size-4" />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}

function EventDetail({ payload, type }: { payload: Record<string, unknown>; type: AlertDto["type"] }) {
  if (type === "signal_change") {
    const p = payload as { previous?: { signal: string }; current?: { signal: string; probability: number; rationale: string } };
    return <span><strong>{p.previous?.signal}</strong> → <strong>{p.current?.signal}</strong> ({p.current?.probability}%) · {p.current?.rationale}</span>;
  }
  if (type === "risk_flag") {
    const p = payload as { vol30d: number; threshold: number };
    return <span>Volatility <strong>{p.vol30d?.toFixed(1)}%</strong> &gt; threshold {p.threshold}%</span>;
  }
  if (type === "trend_reversal") {
    const p = payload as { direction: "golden" | "death"; today: { ma50: number; ma200: number } };
    return <span><strong>{p.direction === "golden" ? "Golden cross" : "Death cross"}</strong> · 50D {p.today?.ma50?.toFixed(2)} vs 200D {p.today?.ma200?.toFixed(2)}</span>;
  }
  return <code className="text-[11px]">{JSON.stringify(payload).slice(0, 80)}</code>;
}
