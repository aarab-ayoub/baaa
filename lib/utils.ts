import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// class names that can override each other, later ones win (shadcn's helper)
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const PER_PAGE = 100;
export const FRESH_MS = 10 * 60 * 1000;

export const month = (day: string) => new Date(day).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmt = (n: number) => Math.round(n).toLocaleString('en');

export const profileUrl = (login: string) => 'https://profile.intra.42.fr/users/' + encodeURIComponent(login);
