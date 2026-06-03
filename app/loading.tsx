export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-primary/10 bg-surface-container-lowest">
        <div className="mx-auto max-w-container px-margin-mobile py-4 md:px-margin-desktop">
          <div className="flex items-center justify-between gap-4">
            <div className="h-14 w-32 animate-pulse rounded bg-surface-container-high" />
            <div className="flex flex-1 items-center justify-evenly gap-4 md:flex-none md:justify-end md:gap-6">
              <div className="h-4 w-20 animate-pulse rounded bg-surface-container-high" />
              <div className="h-4 w-16 animate-pulse rounded bg-surface-container-high" />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="mx-auto max-w-container px-margin-mobile py-16 md:px-margin-desktop md:py-24">
          <div className="space-y-4">
            <div className="h-12 w-3/4 animate-pulse rounded bg-surface-container-high" />
            <div className="h-12 w-2/3 animate-pulse rounded bg-surface-container-high" />
            <div className="mt-8 h-5 w-full animate-pulse rounded bg-surface-container-high" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
      </main>
    </div>
  );
}
