import { useWorkerPool } from '@pierre/diffs/react'
import { useEffect } from 'react'
import { useDiffTheme } from '@/src/hooks/use-diff-theme.ts'

export const useDiffThemeSync = () => {
  const pool = useWorkerPool()
  const { themes } = useDiffTheme()

  useEffect(() => {
    void pool?.setRenderOptions({ theme: { light: themes.light, dark: themes.dark } })
  }, [pool, themes.light, themes.dark])
}
