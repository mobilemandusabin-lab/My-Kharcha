import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNPR(amount) {
  const n = Number(amount || 0);
  return `रु ${n.toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
