import { Card, CardContent } from "@/components/ui/card";

export function LoadingState() {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/88">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 animate-pulse rounded-[20px] bg-muted" />
          <div className="h-12 animate-pulse rounded-[20px] bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}
