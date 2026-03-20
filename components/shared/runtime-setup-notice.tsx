"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { getRuntimeSnapshot } from "@/lib/runtime-state";

export function RuntimeSetupNotice() {
  const snapshot = useMemo(() => getRuntimeSnapshot(), []);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setIsLocalhost(["localhost", "127.0.0.1"].includes(window.location.hostname));
  }, []);

  if (!isLocalhost || snapshot.setupStatus !== "supabase-error" || !snapshot.setupIssue) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/95">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <p className="text-sm leading-6 text-amber-900">{snapshot.setupIssue}</p>
      </CardContent>
    </Card>
  );
}
