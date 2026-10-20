export function ErrorLog({ children }: { children: string }) {
  return (
    <pre
      className={
        'max-h-28 overflow-auto rounded bg-surface-subtle p-1.5 font-editor text-mini wrap-break-word whitespace-pre-wrap text-fg-muted'
      }
    >
      {children}
    </pre>
  )
}
