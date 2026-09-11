import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names, letting a later Tailwind class win a conflict (`px-4` then `px-8` gives `px-8`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
