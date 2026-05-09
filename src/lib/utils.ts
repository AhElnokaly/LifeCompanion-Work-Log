import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  if (!totalMinutes || isNaN(totalMinutes)) return "00:00";
  const hours = Math.floor(Math.abs(totalMinutes) / 60);
  const minutes = Math.floor(Math.abs(totalMinutes) % 60);
  const sign = totalMinutes < 0 ? "-" : "";
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
