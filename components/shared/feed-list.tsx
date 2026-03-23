import { cn } from "@/lib/utils";

export function FeedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-section-surface overflow-hidden rounded-[26px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
