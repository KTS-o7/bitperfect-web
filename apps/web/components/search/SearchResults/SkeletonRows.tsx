export function SkeletonRows({ count = 12 }: { count?: number }) {
  // Match TrackRow's actual grid: 4-col mobile, 7-col desktop (lg+)
  const rowClass = "grid grid-cols-[32px_36px_1fr_60px] lg:grid-cols-[50px_40px_1fr_180px_120px_80px_100px] gap-2 lg:gap-4 items-center px-2 lg:px-6 py-2 lg:py-3 border-b border-foreground/10";

  return (
    <div className="w-full border-t border-foreground/10">
      <div className={rowClass}>
        <div className="h-3 w-6 bg-foreground/10 mx-auto" />
        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-foreground/10 border border-foreground/10" />
        <div className="space-y-2">
          <div className="h-4 w-2/3 bg-foreground/10" />
          <div className="h-3 w-1/2 bg-foreground/10" />
        </div>
        <div className="hidden lg:block h-3 w-3/4 bg-foreground/10" />
        <div className="hidden lg:block h-3 w-16 bg-foreground/10" />
        <div className="hidden lg:block h-3 w-12 bg-foreground/10 ml-auto" />
        <div className="h-3 w-8 bg-foreground/10 ml-auto" />
      </div>
      {[...Array(count - 1)].map((_, i) => (
        <div key={i} className={`${rowClass} animate-pulse`}>
          <div className="h-3 w-6 bg-foreground/10 mx-auto" />
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-foreground/10 border border-foreground/10" />
          <div className="space-y-2">
            <div className="h-4 w-2/3 bg-foreground/10" />
            <div className="h-3 w-1/2 bg-foreground/10" />
          </div>
          <div className="hidden lg:block h-3 w-3/4 bg-foreground/10" />
          <div className="hidden lg:block h-3 w-16 bg-foreground/10" />
          <div className="hidden lg:block h-3 w-12 bg-foreground/10 ml-auto" />
          <div className="h-3 w-8 bg-foreground/10 ml-auto" />
        </div>
      ))}
    </div>
  );
}
