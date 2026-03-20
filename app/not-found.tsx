import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-5">
      <Card className="w-full">
        <CardContent className="space-y-4 py-10 text-center">
          <div>
            <p className="text-sm font-semibold text-primary">404</p>
            <h1 className="mt-2 text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              홈으로 돌아가서 다른 콘텐츠를 둘러보세요.
            </p>
          </div>
          <Button asChild>
            <Link href="/home">홈으로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
