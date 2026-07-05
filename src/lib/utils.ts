import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

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

export const getRestDaysForDate = (day: Date, settings: any): number[] => {
  if (!settings.restDaysSchedule || settings.restDaysSchedule.length === 0) return settings.restDays || [];
  const targetDate = day.getTime();
  
  // Sort schedule so newest applied first
  const sortedSchedule = [...settings.restDaysSchedule].sort((a,b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
  
  for (const sch of sortedSchedule) {
    if (targetDate >= new Date(sch.fromDate).getTime()) {
      return sch.restDays;
    }
  }
  
  // If targetDate is older than the oldest schedule record, return the originalRestDays of the oldest record
  const oldestSch = sortedSchedule[sortedSchedule.length - 1];
  return oldestSch.originalRestDays !== undefined ? oldestSch.originalRestDays : (settings.restDays || []);
};

export const isPublicHoliday = (day: Date, customHolidays?: {date: string, name: string}[]): boolean => {
  const fullDateKey = format(day, 'yyyy-MM-dd');
  if (customHolidays?.some(h => h.date === fullDateKey)) return true;
  return false;
};

export const isRestDayForDate = (day: Date, settings: any): boolean => {
  return getRestDaysForDate(day, settings).includes(day.getDay()) || isPublicHoliday(day, settings.customHolidays);
};

