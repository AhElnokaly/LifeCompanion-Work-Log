import { format } from 'date-fns';
import { ScheduledShift, WorkSettings, WorkSession } from '../types';

export const detectPermissionType = (date: Date, settings: WorkSettings, shifts: ScheduledShift[], shiftAssignments: Record<string, string>): 'entry' | 'exit' => {
   const currentHm = format(date, 'HH:mm');
   let expectedStart = '09:00';
   let expectedEnd = '17:00';
   
   if (settings.system === 'shifts') {
       const todayStr = format(date, 'yyyy-MM-dd');
       const shiftId = shiftAssignments[todayStr];
       const shift = shifts.find(s => s.id === shiftId);
       if (shift) {
          expectedStart = shift.startTime;
          expectedEnd = shift.endTime;
       }
   } else if (settings.system === 'fixed') {
       expectedStart = settings.expectedStartTime || '09:00';
       const [h, m] = expectedStart.split(':').map(Number);
       const dh = settings.dailyHours || 8;
       expectedEnd = `${String((h + Math.floor(dh)) % 24).padStart(2, '0')}:${String(m + (dh % 1) * 60).padStart(2, '0')}`;
   }

   const [curH, curM] = currentHm.split(':').map(Number);
   const currentMins = curH * 60 + curM;

   const [startH, startM] = expectedStart.split(':').map(Number);
   const startMins = startH * 60 + startM;

   const [endH, endM] = expectedEnd.split(':').map(Number);
   let endMins = endH * 60 + endM;
   if (endMins < startMins) endMins += 24 * 60;

   let curMinsRef = currentMins;
   if (curMinsRef < startMins - 12 * 60) curMinsRef += 24 * 60;

   const distToStart = Math.abs(curMinsRef - startMins);
   const distToEnd = Math.abs(curMinsRef - endMins);

   return distToStart <= distToEnd ? 'entry' : 'exit';
};

export const analyzeAttendancePattern = (sessions: WorkSession[]) => {
   // Find the most frequent entry and exit times in the last 30 days
   const recentSessions = sessions
      .filter(s => s.dayStatus === 'work' && s.duration && s.duration > 0)
      .slice(-30);
      
   if (recentSessions.length === 0) return null;

   let totalStartMins = 0;
   let totalDurationMins = 0;
   let validCount = 0;

   recentSessions.forEach(s => {
      const d = new Date(s.startTime);
      const m = d.getHours() * 60 + d.getMinutes();
      totalStartMins += m;
      totalDurationMins += (s.duration || Math.max(0, (new Date(s.endTime || new Date()).getTime() - d.getTime()) / 60000));
      validCount++;
   });

   if (validCount === 0) return null;

   const avgStart = Math.floor(totalStartMins / validCount);
   const avgDuration = Math.floor(totalDurationMins / validCount);

   const avgStartH = Math.floor(avgStart / 60);
   const avgStartM = avgStart % 60;
   const formattedStart = `${String(avgStartH).padStart(2, '0')}:${String(avgStartM).padStart(2, '0')}`;

   const avgEnd = avgStart + avgDuration;
   const avgEndH = Math.floor(avgEnd / 60) % 24;
   const avgEndM = avgEnd % 60;
   const formattedEnd = `${String(avgEndH).padStart(2, '0')}:${String(avgEndM).padStart(2, '0')}`;

   const avgDurationH = (avgDuration / 60).toFixed(1);

   return {
       formattedStart,
       formattedEnd,
       avgDurationH,
       validCount
   };
};
