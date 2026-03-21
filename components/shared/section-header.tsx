import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  title,
  href,
}: {
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
        >
          더보기
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
