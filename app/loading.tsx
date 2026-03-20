import { LoadingState } from "@/components/shared/loading-state";

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-md p-5">
      <LoadingState />
    </div>
  );
}
