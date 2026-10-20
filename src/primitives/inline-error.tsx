export function InlineError({ children }: { children: string }) {
  return <span className={'text-mini text-danger'}>{children}</span>
}
