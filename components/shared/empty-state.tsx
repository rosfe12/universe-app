import { Inbox } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
}) {
  return (
    <Card className="app-section-surface rounded-[28px] border border-white/10 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {actionLabel && href ? (
          <Button asChild variant="outline" className="min-w-28">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
