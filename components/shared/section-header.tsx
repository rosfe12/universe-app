import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
        >
          더보기
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
