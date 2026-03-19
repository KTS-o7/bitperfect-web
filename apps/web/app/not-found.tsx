import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6 px-6">
      <p className="text-[10px] font-mono uppercase tracking-widest text-foreground/40">
        404
      </p>
      <h1 className="text-2xl font-medium tracking-tight">Page not found</h1>
      <p className="text-sm text-foreground/50 text-center max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="text-[10px] font-mono uppercase tracking-widest border border-foreground/20 px-6 py-2 hover:border-foreground/60 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
