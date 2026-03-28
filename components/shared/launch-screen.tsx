export function LaunchScreen({
  id,
  fixed = false,
  exiting = false,
  hidden = false,
}: {
  id?: string;
  fixed?: boolean;
  exiting?: boolean;
  hidden?: boolean;
}) {
  return (
    <div
      id={id}
      aria-hidden={hidden}
      className={`app-page-backdrop ${fixed ? "fixed inset-0 z-[120]" : ""} flex min-h-[100dvh] items-center justify-center px-5 py-10 ${
        fixed ? "transition-opacity duration-200" : ""
      } ${exiting ? "opacity-0" : "opacity-100"} ${hidden ? "pointer-events-none hidden" : ""}`}
      style={{
        position: fixed ? "fixed" : "relative",
        inset: fixed ? 0 : undefined,
        zIndex: fixed ? 120 : undefined,
        minHeight: "100dvh",
        display: hidden ? "none" : "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1.25rem",
        background:
          "radial-gradient(circle at top, rgba(79,70,229,0.18), transparent 34%), #0b1020",
        opacity: exiting ? 0 : 1,
      }}
    >
      <div
        className="app-shell-surface flex w-full max-w-[440px] flex-col items-center justify-center gap-5 rounded-[36px] px-8 py-16 text-center"
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          borderRadius: 36,
          padding: "4rem 2rem",
          textAlign: "center",
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(15,23,42,0.92)",
          boxShadow: "0 30px 80px rgba(2,6,23,0.35)",
        }}
      >
        <div
          className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/5 shadow-[0_22px_48px_-28px_rgba(99,102,241,0.85)]"
          style={{
            display: "flex",
            height: 96,
            width: 96,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 22px 48px -28px rgba(99,102,241,0.85)",
          }}
        >
          <img
            src="/icons/icon-192.png"
            alt="CAMVERSE"
            width={72}
            height={72}
            fetchPriority="high"
            decoding="sync"
            loading="eager"
            className="h-[72px] w-[72px] rounded-[22px]"
            style={{ height: 72, width: 72, borderRadius: 22 }}
          />
        </div>
        <p
          className="text-sm font-bold uppercase tracking-[0.26em] text-indigo-500 dark:text-indigo-300"
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "#a5b4fc",
          }}
        >
          CAMVERSE
        </p>
        <p
          className="text-sm text-muted-foreground"
          style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}
        >
          캠퍼스를 연결하다
        </p>
        <div
          className="h-1.5 w-40 overflow-hidden rounded-full bg-white/8"
          style={{
            height: 6,
            width: 160,
            overflow: "hidden",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,rgba(99,102,241,0.45),rgba(129,140,248,0.95),rgba(56,189,248,0.65))]"
            style={{
              height: "100%",
              width: "66.666667%",
              borderRadius: 9999,
              background:
                "linear-gradient(90deg, rgba(99,102,241,0.45), rgba(129,140,248,0.95), rgba(56,189,248,0.65))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
