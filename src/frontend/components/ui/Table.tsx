import * as React from "react";
import { cn } from "@/frontend/utils/cn";

export function Table({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto thin-scroll">
      <table className={cn("w-full caption-bottom text-sm", className)} {...p} />
    </div>
  );
}
export function THead({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...p} />;
}
export function TBody({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />;
}
export function TR({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...p}
    />
  );
}
export function TH({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-[11px] uppercase tracking-wide font-medium text-muted-foreground",
        className
      )}
      {...p}
    />
  );
}
export function TD({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-4 align-middle", className)} {...p} />;
}
