interface DataToggleProps<T extends string> {
  options: readonly T[]
  labels: Record<T, string>
  value: T
  onChange: (value: T) => void
}

export function DataToggle<T extends string>({
  options,
  labels,
  value,
  onChange,
}: DataToggleProps<T>) {
  return (
    <div
      role={'radiogroup'}
      aria-label={'Story data'}
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        background: '#d4d4d4',
        font: '12px system-ui, sans-serif',
      }}
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type={'button'}
            role={'radio'}
            aria-checked={active}
            onClick={() => {
              onChange(option)
            }}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '4px 10px',
              cursor: 'pointer',
              background: active ? '#ffffff' : 'transparent',
              color: '#171717',
              font: 'inherit',
            }}
          >
            {labels[option]}
          </button>
        )
      })}
    </div>
  )
}
