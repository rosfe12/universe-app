import { cn } from "@/lib/utils";

export function FeedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-gray-100 bg-white", className)}>
      {children}
    </div>
  );
}
