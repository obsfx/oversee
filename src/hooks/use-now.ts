import { useState } from 'react'

export const useNow = () => {
  const [now] = useState(Date.now)
  return now
}
