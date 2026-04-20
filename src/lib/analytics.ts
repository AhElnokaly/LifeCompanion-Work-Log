import { WorkSession, Job, WorkSettings } from '../types';
import { differenceInDays, isSameMonth, subDays, startOfMonth } from 'date-fns';

export interface AnalyticsStats {
  hoursMonth: number;
  otMonth: number;
  hoursWeek: number;
  streak: number;
  avgMood: number;
  burnout: number;
  targetMonth: number;
  maxOt: number;
}

export function getStats(sessions: WorkSession[], settings: WorkSettings): AnalyticsStats {
  const now = new Date();
  const weekAgo = subDays(now, 7);
  const thisMonthStart = startOfMonth(now);
  
  const thisMonthSessions = sessions.filter(s => new Date(s.startTime) >= thisMonthStart && !s.isArchived);
  const thisWeekSessions = sessions.filter(s => new Date(s.startTime) >= weekAgo && !s.isArchived);
  
  const hoursMonth = thisMonthSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const otMonth = thisMonthSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
  const hoursWeek = thisWeekSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  
  // Calculate Streak (Consecutive check-ins)
  let streak = 0;
  let cursor = new Date(now);
  
  for (let i = 0; i < 90; i++) {
    const hasLog = sessions.find(s => {
      const d = new Date(s.startTime);
      return d.getDate() === cursor.getDate() && d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear() && !s.isArchived;
    });
    
    // Ignore rest days for streak calculation if user didn't work
    const isRestDay = settings.restDays.includes(cursor.getDay());
    
    if (hasLog) {
      streak++;
    } else if (!isRestDay) {
      if (i > 0) break; // Don't break if today is missing yet, only if past days are missing
    }
    
    cursor = subDays(cursor, 1);
  }

  // Very dummy mood simulation (we don't persist mood in context cleanly yet, assume default 3)
  const avgMood = 3; 

  const targetMonth = (settings.dailyHours || 8) * 22; // approx 22 working days
  const maxOt = 40; // Default max overtime allowed per month

  const burnoutScore = Math.min(100, Math.round(
    (streak > 14 ? 20 : streak > 7 ? 10 : 0) + 
    ((otMonth / maxOt) * 35) + 
    ((5 - avgMood) * 9)
  ));

  return {
    hoursMonth,
    otMonth,
    hoursWeek,
    streak,
    avgMood,
    burnout: burnoutScore,
    targetMonth,
    maxOt
  };
}
