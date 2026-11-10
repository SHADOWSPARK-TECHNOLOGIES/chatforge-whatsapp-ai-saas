import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format Naira with Nigerian locale, no trailing decimals. */
export function formatNgn(value: number): string {
  return `₦${Math.round(value).toLocaleString('en-NG')}`;
}

/** Format a Nigerian phone number to display form. */
export function formatPhone(phone: string): string {
  return phone;
}

/** Parse an arbitrary phone string into a worst-case-valid +234 form. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) return `+234 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  if (digits.length === 13 && digits.startsWith('234')) return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  if (digits.length === 10) return `+234 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return raw;
}

/** Format minutes into a friendly "Xh Ym" / "~N min" string. */
export function formatEta(minutes: number): string {
  if (!minutes || minutes === 0) return 'Delivered';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Human-friendly status label. */
export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
