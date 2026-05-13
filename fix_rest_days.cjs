const fs = require('fs');

let ctx = fs.readFileSync('src/contexts/WorkLogContext.tsx', 'utf8');

ctx = ctx.replace(
  /export const isPublicHoliday = /,
  `export const getRestDaysForDate = (day: Date, settings: any): number[] => {
  if (!settings.restDaysSchedule || settings.restDaysSchedule.length === 0) return settings.restDays || [];
  const targetDate = day.getTime();
  let applicableRestDays = settings.restDays || [];
  // Sort schedule so newest applied first
  const sortedSchedule = [...settings.restDaysSchedule].sort((a,b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
  for (const sch of sortedSchedule) {
    if (targetDate >= new Date(sch.fromDate).getTime()) {
      return sch.restDays;
    }
  }
  return applicableRestDays;
};

export const isRestDayForDate = (day: Date, settings: any): boolean => {
  return getRestDaysForDate(day, settings).includes(day.getDay()) || isPublicHoliday(day, settings.customHolidays);
};

export const isPublicHoliday = `
);
fs.writeFileSync('src/contexts/WorkLogContext.tsx', ctx);

console.log("Updated WorkLogContext.tsx");
