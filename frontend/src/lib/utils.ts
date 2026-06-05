import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getGradeColor(grade: string): string {
  if (['A', 'A-'].includes(grade)) return 'grade-a';
  if (['B+', 'B', 'B-'].includes(grade)) return 'grade-b';
  if (['C+', 'C', 'C-'].includes(grade)) return 'grade-c';
  if (['D+', 'D', 'D-'].includes(grade)) return 'grade-d';
  return 'grade-e';
}

export function getStatusClass(status: string): string {
  switch (status) {
    case 'Active':      return 'status-active';
    case 'Inactive':    return 'status-inactive';
    case 'Transferred': return 'status-transferred';
    case 'Graduated':   return 'status-graduated';
    default:            return 'status-inactive';
  }
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function getAvatarUrl(name: string): string {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1d4ed8&textColor=ffffff&fontSize=40`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatScore(score: number, max: number): string {
  return `${score}/${max} (${((score / max) * 100).toFixed(1)}%)`;
}
