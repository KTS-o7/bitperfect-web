export function SkeletonRows({ count = 12 }: { count?: number }) {
  return (
    <div className="w-full border-t border-foreground/10">
      <div className="grid grid-cols-[50px_40px_1fr_180px_120px_80px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px] md:grid-cols-[40px_40px_1fr_60px] gap-4 items-center px-6 py-3 border-b border-foreground/10">
        <div className="h-3 w-6 bg-foreground/10 mx-auto" />
        <div className="w-10 h-10 bg-foreground/10 border border-foreground/10" />
        <div className="space-y-2">
          <div className="h-4 w-2/3 bg-foreground/10" />
          <div className="h-3 w-1/2 bg-foreground/10" />
        </div>
        <div className="hidden lg:block h-3 w-3/4 bg-foreground/10" />
        <div className="hidden lg:block h-3 w-16 bg-foreground/10" />
        <div className="h-3 w-12 bg-foreground/10 ml-auto" />
      </div>
      {[...Array(count - 1)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[50px_40px_1fr_180px_120px_80px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px] md:grid-cols-[40px_40px_1fr_60px] gap-4 items-center px-6 py-3 border-b border-foreground/10 animate-pulse"
        >
          <div className="h-3 w-6 bg-foreground/10 mx-auto" />
          <div className="w-10 h-10 bg-foreground/10 border border-foreground/10" />
          <div className="space-y-2">
            <div className="h-4 w-2/3 bg-foreground/10" />
            <div className="h-3 w-1/2 bg-foreground/10" />
          </div>
          <div className="hidden lg:block h-3 w-3/4 bg-foreground/10" />
          <div className="hidden lg:block h-3 w-16 bg-foreground/10" />
          <div className="h-3 w-12 bg-foreground/10 ml-auto" />
        </div>
      ))}
    </div>
  );
}
