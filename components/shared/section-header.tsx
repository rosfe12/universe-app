import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  title,
  description,
  eyebrow,
  href,
  actionLabel = "더보기",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="app-kicker">{eyebrow}</p> : null}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
