import Image from "next/image";

export default function GlobalLoading() {
  return (
    <div className="app-page-backdrop flex min-h-screen items-center justify-center px-5 py-10">
      <div className="app-shell-surface flex w-full max-w-[440px] flex-col items-center justify-center gap-5 rounded-[36px] px-8 py-16 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 shadow-[0_22px_48px_-28px_rgba(99,102,241,0.85)]">
          <Image
            src="/icons/icon-192.png"
            alt="CAMVERSE"
            width={72}
            height={72}
            priority
            className="h-[72px] w-[72px] rounded-[22px]"
          />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.26em] text-indigo-500 dark:text-indigo-300">
          CAMVERSE
        </p>
        <p className="text-sm text-muted-foreground">캠퍼스를 연결하다</p>
      </div>
    </div>
  );
}
