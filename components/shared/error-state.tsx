import { TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-rose-200 bg-rose-50/80">
      <CardContent className="flex items-start gap-3 py-6">
        <div className="rounded-full bg-rose-100 p-2 text-rose-600">
          <TriangleAlert className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-rose-700">{title}</p>
          <p className="text-sm text-rose-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
