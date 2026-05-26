import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely (shadcn-style).
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
