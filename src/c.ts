import { clsx, type ClassValue } from 'clsx'

export const c = (...inputs: ClassValue[]) => {
  return clsx(inputs)
}
