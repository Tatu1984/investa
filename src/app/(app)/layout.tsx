import { Sidebar } from "@/frontend/components/layout/Sidebar";
import { Topbar } from "@/frontend/components/layout/Topbar";
import { QueryProvider } from "@/frontend/components/providers/QueryProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-5 py-6 md:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}
