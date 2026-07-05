import { format } from 'date-fns';
import { ScheduledShift, WorkSettings, WorkSession } from '../types';
import { isRestDayForDate } from './utils';

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

export interface AttendanceInsight {
  type: 'info' | 'warning' | 'success' | 'tip';
  title: string;
  message: string;
  icon?: string;
}

export const generateSmartInsights = (
  sessions: WorkSession[],
  settings: WorkSettings,
  jobs: any[],
  shifts: ScheduledShift[],
  shiftAssignments: Record<string, string>
): AttendanceInsight[] => {
   const insights: AttendanceInsight[] = [];
   const now = new Date();
   
   // 0. Holiday Greeting Insight
   if (settings.customHolidays && settings.customHolidays.length > 0) {
      const today = now.toISOString().split('T')[0];
      const activeHoliday = settings.customHolidays.find(h => h.date === today);
      if (activeHoliday) {
         insights.push({
            type: 'info',
            title: 'تهنئة بمناسبة العطلة 🎉',
            message: `بمناسبة ${activeHoliday.name}، نتمنى لك لحظات سعيدة وممتعة! تذكر أن تستمتع بوقتك وتأخذ قسطاً من الراحة.`,
            icon: '🎊'
         });
      }
   }

   // 1a. Check for leaves recorded on holidays/rest days
   const misloggedLeaves = sessions.filter(s => {
      const isLeave = ['annual_leave', 'sick_leave', 'casual_leave', 'half_day_leave'].includes(s.dayStatus || '');
      if (!isLeave || s.isArchived) return false;
      const d = new Date(s.startTime);
      const fullDateKey = format(d, 'yyyy-MM-dd');
      const isPublic = settings.customHolidays?.some(h => h.date === fullDateKey);
      const isRest = isRestDayForDate(d, settings);
      return isRest;
   });

   if (misloggedLeaves.length > 0) {
      insights.push({
         type: 'warning',
         title: 'إجازات مسجلة بالخطأ',
         message: `لاحظنا أنك قمت بتسجيل إجازة (${misloggedLeaves.length}) في يوم عطلة أسبوعية أو مناسبة رسمية! نوصي بمسحها من سجل الإجازات حتى لا يتم خصمها من رصيدك السنوي بتاتاً.`,
         icon: '⚠️'
      });
   }

   // 1. Analyze general punctuality (Fixed system)
   if (settings.system === 'fixed' && settings.expectedStartTime) {
      const expectedDate = new Date(`1970-01-01T${settings.expectedStartTime}:00`);
      const expMins = expectedDate.getHours() * 60 + expectedDate.getMinutes();
      
      let totalLates = 0;
      let totalEarlies = 0;
      let totalDiff = 0;
      let validDays = 0;

      const recentSessions = sessions.filter(s => 
         s.dayStatus === 'work' && 
         // Within last 14 days
         (now.getTime() - new Date(s.startTime).getTime()) < 14 * 24 * 60 * 60 * 1000
      );

      // Group by day to only count first entry
      const dailyFirstEntry: Record<string, number> = {};
      
      recentSessions.forEach(s => {
         const d = new Date(s.startTime);
         const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
         const mins = d.getHours() * 60 + d.getMinutes();
         
         if (!dailyFirstEntry[dateKey] || mins < dailyFirstEntry[dateKey]) {
            dailyFirstEntry[dateKey] = mins;
         }
      });

      Object.values(dailyFirstEntry).forEach(mins => {
         validDays++;
         const diff = mins - expMins;
         totalDiff += diff;
         if (diff > 15) totalLates++; // More than 15 mins late
         if (diff < -30) totalEarlies++; // More than 30 mins early
      });

      if (validDays >= 3) {
         const avgDiff = Math.round(totalDiff / validDays);
         if (avgDiff > 20) {
            insights.push({
               type: 'warning',
               title: 'نمط التأخير المستمر',
               message: `أنت تصل متأخراً بمتوسط ${avgDiff} دقيقة عن موعد ${settings.expectedStartTime}. نقترح ضبط المنبه أبكر قليلاً لتجنب التوتر الصباحي.`,
               icon: '⏰'
            });
         } else if (avgDiff < -30) {
            insights.push({
               type: 'tip',
               title: 'الوصول المبكر',
               message: `أنت تصل مبكراً بمتوسط ${Math.abs(avgDiff)} دقيقة. إذا كان هذا مقصوداً، فكر في تعديل "موعد الحضور المتوقع" في الإعدادات لضبط إيقاع عملك.`,
               icon: '🌟'
            });
         } else if (Math.abs(avgDiff) <= 15 && totalLates === 0) {
            insights.push({
               type: 'success',
               title: 'دقة المواعيد',
               message: 'رائع! أنت تحافظ على الحضور في موعدك بدقة خلال الأيام الماضية، استمر على هذا النحو!',
               icon: '🏆'
            });
         }
      }
   }

   // 2. Freelance: Analyze work fluctuations
   if (settings.system === 'freelance') {
      const dailyHours: Record<string, number> = {};
      const recentSessions = sessions.filter(s => 
         (now.getTime() - new Date(s.startTime).getTime()) < 30 * 24 * 60 * 60 * 1000 &&
         s.duration
      );

      recentSessions.forEach(s => {
         const d = new Date(s.startTime);
         const dateKey = d.getDay().toString(); // 0-6 (Sun-Sat)
         dailyHours[dateKey] = (dailyHours[dateKey] || 0) + (s.duration || 0);
      });

      // Find best and worst days
      let bestDay = '0', worstDay = '0';
      let maxH = -1, minH = Infinity;

      Object.entries(dailyHours).forEach(([day, mins]) => {
         if (mins > maxH) { maxH = mins; bestDay = day; }
         if (mins < minH) { minH = mins; worstDay = day; }
      });

      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      
      if (maxH > 0 && maxH > (minH * 2)) {
         insights.push({
            type: 'info',
            title: 'تحليل إنتاجية العمل الحر',
            message: `يبدو أنك تبذل مجهوداً مضاعفاً يوم ${dayNames[parseInt(bestDay)]} مقارنة بيوم ${dayNames[parseInt(worstDay)]}. هل فكرت في إعادة توزيع مهامك لتجنب الإرهاق؟`,
            icon: '⚖️'
         });
      }
   }

   // 3. Multi-job Analysis
   const jobSessions = sessions.filter(s => s.jobId && s.jobId !== 'none' && s.duration);
   if (jobs.length > 0 && jobSessions.length > 5) {
      const jobTime: Record<string, number> = {};
      jobSessions.forEach(s => {
         jobTime[s.jobId!] = (jobTime[s.jobId!] || 0) + (s.duration || 0);
      });
      
      const sortedJobs = Object.entries(jobTime).sort((a,b) => b[1] - a[1]);
      if (sortedJobs.length > 1) {
         const topJobId = sortedJobs[0][0];
         const topJobRecord = jobs.find(j => j.id === topJobId);
         if (topJobRecord) {
            insights.push({
               type: 'info',
               title: 'التركيز الوظيفي',
               message: `الوظيفة '${topJobRecord.name}' تستحوذ على النصيب الأكبر من وقتك مؤخراً (${Math.round(sortedJobs[0][1]/60)} ساعة). تأكد من إعطاء الوظائف الأخرى حقها إذا كانت تشكل أولوية.`,
               icon: '📊'
            });
         }
      }
   }

   // 4. Overworking on Rest Days
   const restDaySessions = sessions.filter(s => 
      s.dayStatus === 'rest_day_work' && 
      (now.getTime() - new Date(s.startTime).getTime()) < 30 * 24 * 60 * 60 * 1000
   );
   
   if (restDaySessions.length >= 3) {
      insights.push({
         type: 'tip',
         title: 'تغيير أيام الإجازة',
         message: 'لاحظنا أنك تعمل كثيراً في أيام إجازتك! إذا كنت تستخدم التطبيق لتقنية بومودورو أو كان جدولك قد تغير، نقترح تغيير أيام العطلة من الإعدادات لتعكس جدولك الفعلي.',
         icon: '🏄‍♂️'
      });
   }
   
   // 5. Marathon sessions
   const marathonSessions = sessions.filter(s => 
      s.duration && s.duration > 5 * 60 && // Over 5 hours
      (!s.activeBreakStartTime) && // activeBreak is true when ongoing, but historically hard to know. By default activeBreakStartTime is cleared. Let's just flag long sessions.
      (now.getTime() - new Date(s.startTime).getTime()) < 7 * 24 * 60 * 60 * 1000
   );
   if (marathonSessions.length > 0) {
       insights.push({
         type: 'warning',
         title: 'فترات عمل طويلة مستمرة',
         message: 'سجلت جلسات عمل طويلة جداً. تذكر أن أخذ فترات راحة قصيرة يزيد الإنتاجية ويقلل الإرهاق. جرب استخدام مؤقت بومودورو المدمج.',
         icon: '🔋'
       });
   }
   
   // 6. Expiring Compensation Leaves
   const validityDays = settings.compensationValidityDays || 30;
   let expiringCount = 0;
   
   const availableComps = sessions.filter(s => (s.isRestDayWork || s.dayStatus === 'rest_day_work') && !s.isArchived).map(s => {
      let accrued = 0;
      const compType = s.restDayCompensation || '1_day';
      if (compType === '1_day' || compType === '1_day_plus_overtime') accrued = 1;
      else if (compType === '2_days') accrued = 2;
      const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
      const daysSinceEarned = (now.getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24);
      return { availableDays: accrued - taken, daysUntilExpiry: validityDays - daysSinceEarned };
   }).filter(s => s.availableDays > 0);

   availableComps.forEach(comp => {
      // If it expires in less than 7 days, and is still valid (>0)
      if (comp.daysUntilExpiry > 0 && comp.daysUntilExpiry <= 7) {
         expiringCount += comp.availableDays;
      }
   });

   if (expiringCount > 0) {
      insights.push({
         type: 'warning',
         title: 'أيام بديلة تقترب من الانتهاء',
         message: `لديك ${expiringCount} يوم بديل تنتهي صلاحيتها خلال أسبوع! ننصحك بالاستفادة منها قبل أن تضيع، ما لم تحصل على استثناء من الإدارة.`,
         icon: '⏳'
      });
   }
   
   // 7. Balance Insights (Annual Leaves & Permissions)
   const currentMonth = now.getMonth();
   const currentYear = now.getFullYear();
   
   const usedAnnualLeaves = sessions
      .filter(s => (s.dayStatus === "annual_leave" || s.dayStatus === "half_day_leave") && new Date(s.startTime).getFullYear() === currentYear && !s.isArchived)
      .filter(s => {
          const d = new Date(s.startTime);
          const fullDateKey = format(d, 'yyyy-MM-dd');
          const isPublic = settings.customHolidays?.some(h => h.date === fullDateKey);
          const isRest = isRestDayForDate(d, settings);
          return !isRest;
      })
      .reduce((acc, s) => acc + (s.dayStatus === "half_day_leave" ? 0.5 : 1), 0);
      
   const remainingAnnualLeaves = settings.annualLeaves - usedAnnualLeaves;
   const monthsLeft = 12 - currentMonth;
   
   if (remainingAnnualLeaves <= 3 && monthsLeft > 2) {
      insights.push({
         type: 'warning',
         title: 'نفاد رصيد الإجازات السنوية',
         message: `تبقى لك ${remainingAnnualLeaves} أيام فقط من إجازتك السنوية، وما زال متبقياً أكثر من شهرين لنهاية العام. حاول تقليل إجازاتك لتجنب الخصومات.`,
         icon: '📉'
      });
   }

   const usedPermissionsHours = sessions
      .filter(s => s.dayStatus === 'permission' && new Date(s.startTime).getMonth() === currentMonth && new Date(s.startTime).getFullYear() === currentYear && !s.isArchived)
      .reduce((acc, s) => acc + (s.permissionHours || ((s.duration || 0) / 60)), 0);
      
   const remainingPermissionsHours = settings.monthlyPermissions - usedPermissionsHours;
   if (remainingPermissionsHours <= 1 && now.getDate() <= 20) {
      insights.push({
         type: 'warning',
         title: 'استهلاك الأذونات مبكراً',
         message: `تبقى لك ${remainingPermissionsHours} ساعة أذونات هذا الشهر، ونحن لا زلنا في منتصف الشهر. كن حذراً عند التأخير!`,
         icon: '⚠️'
      });
   }
   
   // Mix and match if empty
   if (insights.length === 0) {
      insights.push({
         type: 'info',
         title: 'نصيحة ذكية',
         message: 'استمر في تسجيل يومياتك وسيبدأ الذكاء الاصطناعي في تحليل نمط عملك لتقديم اقتراحات ذكية تزيد من إنتاجيتك.',
         icon: '✨'
      });
   }

   return insights;
};
