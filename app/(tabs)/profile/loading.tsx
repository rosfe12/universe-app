import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/shared/loading-state";

export default function Loading() {
  return (
    <AppShell title="마이">
      <LoadingState />
    </AppShell>
  );
}
