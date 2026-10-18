export function LoadingBar() {
  return (
    <div
      role={'progressbar'}
      aria-label={'Loading'}
      className={'absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-accent/15'}
    >
      <div className={'h-full w-1/3 animate-loading-bar bg-accent'} />
    </div>
  )
}
