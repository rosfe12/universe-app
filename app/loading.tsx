export default function GlobalLoading() {
  return (
    <div className="app-page-backdrop flex min-h-screen items-center justify-center px-5 py-10">
      <div className="app-shell-surface flex w-full max-w-[440px] flex-col items-center justify-center gap-3 rounded-[36px] px-8 py-16 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.26em] text-indigo-500 dark:text-indigo-300">
          CAMVERSE
        </p>
        <p className="text-sm text-muted-foreground">캠퍼스를 연결하다</p>
      </div>
    </div>
  );
}
