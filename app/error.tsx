"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError() {
  return (
    <div className="mx-auto max-w-md p-5">
      <ErrorState
        title="화면을 불러오지 못했습니다"
        description="잠시 후 다시 시도해주세요."
      />
    </div>
  );
}
