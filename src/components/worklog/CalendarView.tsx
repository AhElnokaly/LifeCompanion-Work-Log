import { ar, enUS } from 'date-fns/locale';
import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, List, LayoutGrid, Activity, Clock, Briefcase, Plus, Palette, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useWorkLog, isPublicHoliday, generateEgyptianHolidays } from '../../contexts/WorkLogContext';
import { format, differenceInMinutes, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, subDays, addDays } from 'date-fns';

import { useLanguage } from '../../contexts/LanguageContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

import { gregorianToHijri } from '../../lib/hijri';
import AdvancedShiftEditor from './AdvancedShiftEditor';
import { UnifiedEntrySheet } from './UnifiedEntrySheet';
import { detectPermissionType } from '../../lib/smartAttendance';

export default function CalendarView() {
  const { t, lang } = useLanguage();
  const { sessions, jobs, shifts, shiftAssignments, toggleShiftAssignment, settings, updateSettings, deleteSession, logSpecialSession, addSession, getBalances } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customEntryData, setCustomEntryData] = useState({
    type: 'salary' as any, // 'salary', 'annual_leave', 'sick_leave', 'casual_leave', 'permission', 'half_day_leave', 'compensation', 'rest_day_work'
    startTime: '09:00',
    endTime: '17:00',
    jobId: 'none',
    restDayCompensation: '1_day' as '1_day' | '2_days' | '1_day_plus_overtime',
    linkedCompensationSessionId: '',
  });
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [selectedPaintShiftId, setSelectedPaintShiftId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
  const [displayMode, setDisplayMode] = useState<'gregorian' | 'hijri'>('gregorian');
  
  const [converterOpen, setConverterOpen] = useState(false);
  const [converterDate, setConverterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const getAvailableCompensations = (dateBeingProcessed: Date = selectedDay) => {
    return sessions.filter(s => (s.isRestDayWork || s.dayStatus === 'rest_day_work') && !s.isArchived).map(s => {
      let accrued = 0;
      const compType = s.restDayCompensation || '1_day';
      if (compType === '1_day' || compType === '1_day_plus_overtime') accrued = 1;
      else if (compType === '2_days') accrued = 2;

      const validityDays = settings.compensationValidityDays || 30; // default 30
      const daysSinceEarned = (dateBeingProcessed.getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24);
      const isExpired = daysSinceEarned > validityDays && !s.compensationException;

      const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
      return { ...s, availableDays: accrued - taken, isExpired, daysUntilExpiry: Math.floor(validityDays - daysSinceEarned) };
    }).filter(s => s.availableDays > 0);
  };

  // Helper for custom entry form
  const handleCustomEntry = () => {
    const startStr = `${format(selectedDay, 'yyyy-MM-dd')}T${customEntryData.startTime}`;
    let endStr = `${format(selectedDay, 'yyyy-MM-dd')}T${customEntryData.endTime}`;
    if (customEntryData.endTime < customEntryData.startTime) {
       endStr = `${format(addDays(selectedDay, 1), 'yyyy-MM-dd')}T${customEntryData.endTime}`;
    }

    const isLeave = ['annual_leave', 'sick_leave', 'casual_leave', 'half_day_leave', 'permission', 'permission_1h', 'permission_2h', 'compensation'].includes(customEntryData.type);
    
    if (isLeave) {
       let duration = settings.dailyHours * 60;
       let hasTime = false;
       let finalType = customEntryData.type;
       let additionalNotes = '';

       if (customEntryData.type.startsWith('permission_')) {
           const hours = customEntryData.type === 'permission_2h' ? 2 : 1;
           const pType = detectPermissionType(selectedDay, settings, shifts, shiftAssignments);
           duration = hours * 60;
           finalType = 'permission';
           additionalNotes = `إذن ذكي ${pType === 'entry' ? t('cal.late_entry') : t('cal.early_exit')} (${hours} ساعة/ساعات)`;
           hasTime = false;
       } else if (customEntryData.type === 'half_day_leave' || customEntryData.type === 'permission') {
           duration = differenceInMinutes(new Date(endStr), new Date(startStr));
           hasTime = true;
       }

       addSession({
         id: Date.now().toString(),
         type: 'salary',
         startTime: new Date(startStr).toISOString(),
         ...(hasTime && { endTime: new Date(endStr).toISOString() }),
         dayStatus: finalType as any,
         breaks: 0,
         duration: duration,
         location: 'office',
         notes: additionalNotes,
         linkedCompensationSessionId: finalType === 'compensation' && customEntryData.linkedCompensationSessionId ? customEntryData.linkedCompensationSessionId : undefined,
       });
    } else {
       const duration = differenceInMinutes(new Date(endStr), new Date(startStr));
       const isRestDay = (settings.restDays || []).includes(selectedDay.getDay()) || isPublicHoliday(selectedDay, settings.customHolidays);
       
       let compType = isRestDay ? customEntryData.restDayCompensation : undefined;
       let baseOvertime = 0;
       if (isRestDay) {
         if (compType === '1_day_plus_overtime') baseOvertime = duration;
         else if (compType === '2_days') baseOvertime = 0;
         else baseOvertime = compType === '1_day' ? 0 : duration; 
       } else {
         const expectedMins = settings.dailyHours * 60;
         baseOvertime = duration > expectedMins ? duration - expectedMins : 0;
       }

       addSession({
         id: Date.now().toString(),
         type: customEntryData.jobId !== 'none' ? 'project' : 'salary',
         startTime: new Date(startStr).toISOString(),
         endTime: new Date(endStr).toISOString(),
         jobId: customEntryData.jobId === 'none' ? undefined : customEntryData.jobId,
         dayStatus: isRestDay ? 'rest_day_work' : 'work',
         isRestDayWork: isRestDay,
         restDayCompensation: compType as any,
         breaks: 0,
         duration: duration,
         overtimeMinutes: baseOvertime,
         location: 'office',
         notes: isRestDay ? t('t_auto_198') : ''
       });
    }
    setSheetOpen(false); // Close sheet on save
    toast.success(t('cal.logged_successfully'));
  };

  // Month Navigation
  const nextPeriod = () => {
    if (viewType === 'monthly') setCurrentDate(addMonths(currentDate, 1));
    else if (viewType === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  
  const prevPeriod = () => {
    if (viewType === 'monthly') setCurrentDate(subMonths(currentDate, 1));
    else if (viewType === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const renderMonthlyGrid = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }); // Start Sunday
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    // Calculate month stats for the badges
    const monthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate));
    const workHours = monthSessions.filter(s => !s.dayStatus || ['work', 'rest_day_work', 'half_day_leave', 'permission'].includes(s.dayStatus as string)).reduce((acc, s) => acc + (s.duration || 0) / 60, 0);
    const overtimeHours = monthSessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0) / 60, 0);
    const restDaysWorked = monthSessions.filter(s => s.isRestDayWork).length;
    const comps = monthSessions.filter(s => s.dayStatus === 'compensation').length;
    const sickLeaves = monthSessions.filter(s => s.dayStatus === 'sick_leave').length;
    const annualLeaves = monthSessions.filter(s => ['annual_leave', 'casual_leave', 'half_day_leave'].includes(s.dayStatus as string)).reduce((acc, s) => acc + (s.dayStatus === 'half_day_leave' ? 0.5 : 1), 0);
    const permissionsCount = monthSessions.filter(s => ['permission', 'half_day_leave'].includes(s.dayStatus as string)).length;

    const weekDays = [t('t_auto_461'), t('t_auto_462'), t('t_auto_463'), t('t_auto_464'), t('t_auto_465'), t('t_auto_466'), t('t_auto_460')];

    return (
      <div className="flex flex-col gap-4 mt-6">
        <h2 className="text-3xl font-black text-right px-2">{t('cal.attendance_log')}</h2>
        
        {/* Top Badges */}
        <div className="flex overflow-x-auto gap-2 px-2 pb-3 scrollbar-none snap-x snap-mandatory w-full max-w-full">
           {workHours > 0 || true ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs whitespace-nowrap">{workHours.toFixed(1)} {t('cal.work_h')}</span> : null}
           {overtimeHours > 0 || true ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs whitespace-nowrap">{overtimeHours.toFixed(1)} {t('cal.overtime_h')}</span> : null}
           {restDaysWorked > 0 ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs whitespace-nowrap">{restDaysWorked} {t('cal.rest')}</span> : null}
           {comps > 0 ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs whitespace-nowrap">{comps} {t('cal.alternative')}</span> : null}
           {sickLeaves > 0 ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs whitespace-nowrap">{sickLeaves} {t('cal.sick')}</span> : null}
           {annualLeaves > 0 ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs whitespace-nowrap">{annualLeaves} {t('cal.annual')}</span> : null}
           {permissionsCount > 0 ? <span className="snap-start shrink-0 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs whitespace-nowrap">{permissionsCount} {t('cal.permissions')}</span> : null}
        </div>

        {/* Clean Monthly Grid */}
        <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 relative">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 px-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-10 w-10 py-0 rounded-full hover:bg-secondary active:scale-95 transition-transform text-foreground">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <h3 className="text-xl font-bold font-cairo">
               {displayMode === 'gregorian' 
                 ? format(currentDate, 'MMMM yyyy', { locale: lang === 'ar' ? ar : enUS }) 
                 : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-10 w-10 py-0 rounded-full hover:bg-secondary active:scale-95 transition-transform text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground truncate px-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 text-center mt-1">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              
              const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
              const hasWork = daySessions.some(s => !s.dayStatus || s.dayStatus === 'work' || s.dayStatus === 'rest_day_work');
              const hasLeave = daySessions.some(s => ['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave'].includes(s.dayStatus as string));
              const hasPermission = daySessions.some(s => s.dayStatus === 'permission');
              
              const isHol = isPublicHoliday(day, settings.customHolidays);
              const isRestD = (settings.restDays || []).includes(day.getDay());

              let primaryThemeClass = 'bg-[#2A5949]';
              let isHolidayWork = false;
              if (hasWork) {
                 const firstWork = daySessions.find(s => !s.dayStatus || s.dayStatus === 'work' || s.dayStatus === 'rest_day_work');
                 if (firstWork) {
                    const h = new Date(firstWork.startTime).getHours();
                    if (h >= 5 && h < 12) primaryThemeClass = 'bg-amber-500';
                    else if (h >= 12 && h < 17) primaryThemeClass = 'bg-blue-500';
                    else if (h >= 17 && h < 20) primaryThemeClass = 'bg-purple-500';
                    else primaryThemeClass = 'bg-slate-700';
                    
                    if (firstWork.dayStatus === 'rest_day_work' || isHol || isRestD) {
                       isHolidayWork = true;
                    }
                 }
              }

              // Handle Hijri display logic
              let hDayStr = '1';
              if (displayMode === 'hijri') {
                 try {
                   // +++ تم التعديل بناءً على طلبك لحل مشكلة التاريخ الهجري +++
                   const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', { month: 'numeric', day: 'numeric' });
                   const hParts = hijriFormatter.formatToParts(day);
                   hDayStr = hParts.find(p => p.type === 'day')?.value || '1';
                 } catch(e) {}
              }

              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[48px] flex flex-col p-1 sm:p-1.5 items-center justify-start relative cursor-pointer rounded-xl transition-all ${!isCurrentMonth ? 'opacity-30 pointer-events-none grayscale' : ''}
                    ${isToday && !isSelected ? 'font-bold' : ''}
                    ${isHolidayWork && !isSelected ? 'border border-dashed border-red-400/50 hover:border-red-400' : 'border border-transparent'}
                  `}
                  onClick={() => {
                     setSelectedDay(day);
                     setSheetOpen(true);
                  }}
                >
                  <span className={`text-[12px] sm:text-[14px] font-bold w-8 h-8 flex items-center justify-center rounded-full z-10 transition-colors
                    ${isSelected ? `${primaryThemeClass} text-white shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-background` : 
                      (isHol || isRestD) ? 'text-rose-500 hover:bg-rose-500/10' :
                      isToday ? 'bg-secondary text-primary' : 'text-foreground/90 hover:bg-secondary/40'}
                  `}>
                    {displayMode === 'gregorian' ? format(day, 'd') : hDayStr}
                  </span>
                  
                  {/* Indicator Section */}
                  <div className="flex gap-1 mt-1 justify-center relative z-0">
                     {hasWork && <div className={`w-1 h-1 rounded-full ${primaryThemeClass}`} />}
                     {hasLeave && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                     {hasPermission && <div className="w-1 h-1 rounded-full bg-purple-500" />}
                     {daySessions.length > 3 && <div className="w-1 h-1 rounded-full bg-blue-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyGrid = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 }); // Saturday start
    const weekEnd = addDays(weekStart, 6);
    
    // Aggregate data for this week
    const dailyDataMap = new Map();
    const daysInWeek = Array.from({length: 7}).map((_, i) => addDays(weekStart, i));
    
    daysInWeek.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEE', { locale: lang === 'ar' ? ar : enUS });
      dailyDataMap.set(dayStr, { 
        day: dayName, 
        date: dayStr,
        hours: 0, 
        isWeekend: settings.restDays.includes(day.getDay())
      });
    });

    const thisWeekSessions = sessions.filter(s => {
      try {
        const d = new Date(s.startTime);
        return d >= weekStart && d <= weekEnd;
      } catch { return false; }
    });
    
    thisWeekSessions.forEach(s => {
      try {
        const dayStr = format(new Date(s.startTime), 'yyyy-MM-dd');
        if (dailyDataMap.has(dayStr)) {
          const current = dailyDataMap.get(dayStr);
          current.hours += ((s.duration || 0) / 60);
          dailyDataMap.set(dayStr, current);
        }
      } catch {}
    });

    const dailyData = Array.from(dailyDataMap.values());
    const actualTotalHours = dailyData.reduce((acc, d) => acc + d.hours, 0);
    const goalHours = settings.dailyHours * (7 - settings.restDays.length);
    const totalOvertime = thisWeekSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
    const totalWeeklyFraction = thisWeekSessions.reduce((acc, s) => acc + (s.fractionMinutes || 0), 0);

    const lastWeekStart = subWeeks(weekStart, 1);
    const lastWeekEnd = subDays(weekStart, 1);
    const lastWeekSessions = sessions.filter(s => {
       try {
         const d = new Date(s.startTime);
         return d >= lastWeekStart && d <= lastWeekEnd;
       } catch { return false; }
    });
    const lastWeekTotalHours = lastWeekSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
    const diffHours = actualTotalHours - lastWeekTotalHours;
    const diffPercent = lastWeekTotalHours > 0 ? (diffHours / lastWeekTotalHours) * 100 : 0;

    return (
      <div className="flex flex-col gap-4 mt-4">
        {/* Main Stats Card */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Card className="p-6 bg-primary/10 border-primary/20 shadow-lg rounded-3xl relative overflow-hidden flex flex-col justify-center items-center text-center">
            <p className="text-sm text-primary mb-1 font-bold">{t('cal.working_hours')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-primary">{actualTotalHours.toFixed(1)}</span>
              <span className="text-primary/70 font-medium text-xs">/ {goalHours}{t('t_auto_9')}</span>
            </div>
          </Card>
          
          <Card className="p-6 bg-yellow-500/10 border-yellow-500/20 shadow-lg rounded-3xl relative overflow-hidden flex flex-col justify-center items-center text-center">
            <p className="text-sm text-yellow-500 mb-1 font-bold">{t('cal.weekly_overtime')}</p>
            <div className="flex flex-col justify-center items-center">
               <div className="flex items-baseline gap-1">
                 <span className="text-4xl font-black text-yellow-500">{Number(totalOvertime.toFixed(2))}</span>
                 <span className="text-yellow-500/70 font-medium text-xs">{t('cal.hour')}</span>
               </div>
               {totalWeeklyFraction > 0 && (
                  <span className="text-[10px] font-bold text-amber-500 mt-1">
                     +{totalWeeklyFraction} {lang === 'ar' ? 'د كسر' : 'm fraction'}
                  </span>
               )}
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-card border-white/5 shadow-xl rounded-2xl relative overflow-hidden">
          <div className="mt-8 h-48 w-full -ml-4" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dailyData}>
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                 <Tooltip 
                   contentStyle={{backgroundColor: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)', borderRadius: '8px'}}
                   itemStyle={{color: 'var(--foreground)'}}
                   cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 />
                 <ReferenceLine y={settings.dailyHours} stroke="#ec4899" strokeDasharray="3 3" opacity={0.5} label={{ position: 'top', value: t('cal.daily_target'), fill: '#ec4899', fontSize: 10 }} />
                 <ReferenceLine y={settings.dailyHours + (settings.notificationPreferences?.overtimeWarningMinutes ? settings.notificationPreferences.overtimeWarningMinutes / 60 : 0.5)} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} label={{ position: 'top', value: t('cal.overtime_warning'), fill: '#eab308', fontSize: 10 }} />
                 <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                   {dailyData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.isWeekend ? '#ca8a04' : '#6366f1'} opacity={entry.hours === 0 ? 0.3 : 1} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
          
          <div className="mt-6 text-center text-sm font-medium">
            {t('t_auto_205')} <span className={diffHours >= 0 ? "text-emerald-400" : "text-red-400"}>
              {diffHours > 0 ? '+' : ''}{diffHours.toFixed(1)} {t('t_auto_206')}{diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(0)}%)
            </span>
          </div>
        </Card>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center text-center justify-center">
              <Activity className="w-6 h-6 mb-2 text-primary" />
              <span className="text-xl font-bold">103%</span>
              <span className="text-xs text-muted-foreground">{t('cal.productivity_efficiency')}</span>
          </Card>
          <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center text-center justify-center">
              <Clock className="w-6 h-6 mb-2 text-yellow-500" />
              <span className="text-xl font-bold">{Math.round(actualTotalHours * 0.8)}{t('t_auto_9')}</span>
              <span className="text-xs text-muted-foreground">{t('cal.deep_focus_time')}</span>
          </Card>
        </div>
      </div>
    );
  };

  const renderDayDetails = () => {
    const daySessions = sessions
      .filter(s => isSameDay(new Date(s.startTime), selectedDay))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const totalMinutes = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalOvertime = daySessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);
    const overtimeHours = Math.floor(totalOvertime / 60);
    const dayFractions = daySessions.reduce((acc, s) => acc + (s.fractionMinutes || 0), 0);

    return (
      <div className="flex flex-col gap-6 mt-4">
        {/* Toggle buttons for day type */}
        <div className="bg-secondary/40 p-1 rounded-2xl flex relative overflow-hidden">
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'salary'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${customEntryData.type === 'salary' ? 'bg-emerald-700 text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             {t('cal.work_day')}
                               </button>
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'annual_leave'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${['annual_leave', 'sick_leave', 'casual_leave', 'compensation'].includes(customEntryData.type) ? 'bg-stone-300 dark:bg-stone-600 text-stone-900 dark:text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             {t('cal.on_leave')}
                               </button>
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'permission_1h'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(customEntryData.type) ? 'bg-stone-300 dark:bg-stone-600 text-stone-900 dark:text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             <Clock className="inline w-4 h-4 mr-1" />
             {t('t_auto_207')}
                               </button>
        </div>

        {/* Dynamic form based on type */}
        <div className="flex flex-col gap-4">
          {['annual_leave', 'sick_leave', 'casual_leave', 'compensation'].includes(customEntryData.type) && (
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-muted-foreground font-bold">{t('cal.leave_type')}</Label>
                 <div className="flex flex-wrap gap-2">
                   <Button 
                     variant={customEntryData.type === 'annual_leave' ? 'default' : 'secondary'}
                     className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'annual_leave' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                     onClick={() => setCustomEntryData({...customEntryData, type: 'annual_leave'})}
                   >
                     {t('cal.casual')}
                                                   </Button>
                   <Button 
                     variant={customEntryData.type === 'sick_leave' ? 'default' : 'secondary'}
                     className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'sick_leave' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                     onClick={() => setCustomEntryData({...customEntryData, type: 'sick_leave'})}
                   >
                     {t('t_auto_208')}
                                                   </Button>
                   <Button 
                     variant={customEntryData.type === 'casual_leave' ? 'default' : 'secondary'}
                     className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'casual_leave' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                     onClick={() => setCustomEntryData({...customEntryData, type: 'casual_leave'})}
                   >
                     {t('cal.unpaid')}
                                                   </Button>
                   <Button 
                     variant={customEntryData.type === 'compensation' ? 'default' : 'secondary'}
                     className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'compensation' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                     onClick={() => setCustomEntryData({...customEntryData, type: 'compensation'})}
                   >
                     {t('cal.alternative_leave')}
                                                   </Button>
                 </div>
               </div>
               
               {customEntryData.type === 'compensation' && (
                  <div className="space-y-2">
                     <Label className="text-muted-foreground font-bold text-emerald-600 dark:text-emerald-500">اختر البدل من الأيام السابقة</Label>
                     <select 
                       className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-600 font-bold"
                       value={customEntryData.linkedCompensationSessionId}
                       onChange={e => setCustomEntryData({...customEntryData, linkedCompensationSessionId: e.target.value})}
                     >
                       <option value="">-- {t('home.day')} --</option>
                       {getAvailableCompensations(selectedDay).map(comp => (
                         <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                           {format(new Date(comp.startTime), t('t_auto_300'), {locale: lang === 'ar' ? ar : enUS})} 
                           {t('t_auto_301')} {comp.availableDays} {t('t_auto_302')}{comp.isExpired ? ' - ' + t('home.expired') : ''}
                         </option>
                       ))}
                     </select>
                  </div>
               )}
             </div>
          )}

          {['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(customEntryData.type) && (
             (() => {
                const existingDayPermission = sessions.find(s => {
                  const sDate = new Date(s.startTime);
                  return s.dayStatus === 'permission' && 
                         sDate.getDate() === selectedDay.getDate() && 
                         sDate.getMonth() === selectedDay.getMonth() && 
                         sDate.getFullYear() === selectedDay.getFullYear();
                });
                let calPermissionOffset = 0;
                if (existingDayPermission) {
                  calPermissionOffset = existingDayPermission.permissionHours || ((existingDayPermission.duration || 0) / 60);
                }
                const calBalances = getBalances(selectedDay);
                const isCalOneHourOffline = (calBalances.remainingPermissionsHours + calPermissionOffset) < 1;
                const isCalTwoHoursOffline = (calBalances.remainingPermissionsHours + calPermissionOffset) < 2;
                return (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold">{t('cal.permission_type')}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={customEntryData.type === 'permission_1h' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'permission_1h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${isCalOneHourOffline ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                        disabled={isCalOneHourOffline}
                        onClick={() => setCustomEntryData({...customEntryData, type: 'permission_1h'})}
                      >
                        {isCalOneHourOffline ? (lang === 'ar' ? 'إذن 1 س (Offline)' : 'Perm 1h (Offline)') : t('t_auto_209')}
                      </Button>
                      <Button 
                        variant={customEntryData.type === 'permission_2h' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'permission_2h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${isCalTwoHoursOffline ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                        disabled={isCalTwoHoursOffline}
                        onClick={() => setCustomEntryData({...customEntryData, type: 'permission_2h'})}
                      >
                        {isCalTwoHoursOffline ? (lang === 'ar' ? 'إذن 2 س (Offline)' : 'Perm 2h (Offline)') : t('t_auto_210')}
                      </Button>
                      <Button 
                        variant={customEntryData.type === 'half_day_leave' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'half_day_leave' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        onClick={() => setCustomEntryData({...customEntryData, type: 'half_day_leave'})}
                      >
                        {t('cal.half_day_work')}
                                                     </Button>
                    </div>
                  </div>
                );
             })()
          )}

          {customEntryData.type === 'salary' && settings.system === 'freelance' && (
             <div className="space-y-2">
               <Label className="text-muted-foreground font-bold flex items-center gap-1"><Briefcase className="w-4 h-4"/> {t('t_auto_211')}</Label>
               <div className="flex flex-wrap gap-2">
                 <Button 
                   variant={customEntryData.jobId === 'none' ? 'default' : 'secondary'}
                   className={`rounded-xl h-10 font-bold ${customEntryData.jobId === 'none' ? 'bg-primary text-primary-foreground' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, jobId: 'none'})}
                 >
                   {t('t_auto_212')}
                                                 </Button>
                 {jobs.map(j => (
                   <Button 
                     key={j.id}
                     variant={customEntryData.jobId === j.id ? 'default' : 'outline'}
                     className={`rounded-xl h-10 font-bold ${customEntryData.jobId === j.id ? 'border-2 scale-105' : 'opacity-80 hover:opacity-100'}`}
                     style={customEntryData.jobId === j.id ? { borderColor: j.color, backgroundColor: j.color + '20', color: j.color } : {}}
                     onClick={() => setCustomEntryData({...customEntryData, jobId: j.id})}
                   >
                     <div className="w-2 h-2 rounded-full ml-1.5 shadow-sm" style={{ backgroundColor: j.color }}/>
                     {j.name}
                   </Button>
                 ))}
               </div>
             </div>
          )}

          {(!['annual_leave', 'sick_leave', 'casual_leave', 'permission_1h', 'permission_2h', 'compensation'].includes(customEntryData.type)) && (
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>{t('cal.login')}</Label>
                <SmartTimePicker 
                  value={customEntryData.startTime} 
                  onChange={val => setCustomEntryData({...customEntryData, startTime: val})}
                  className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>{t('cal.logout')}</Label>
                <SmartTimePicker 
                  value={customEntryData.endTime} 
                  onChange={val => setCustomEntryData({...customEntryData, endTime: val})}
                  className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg w-full"
                />
              </div>

               {((settings.restDays || []).includes(selectedDay.getDay()) || isPublicHoliday(selectedDay, settings.customHolidays)) && (
                    <div className="space-y-2">
                       <Label className="text-muted-foreground font-bold">طبيعة البدل (راحة/عطلة)</Label>
                       <div className="relative">
                         <select 
                           className="w-full h-14 rounded-2xl border-none bg-orange-500/10 px-4 py-2 font-bold text-orange-600 appearance-none"
                           value={customEntryData.restDayCompensation || '1_day'}
                           onChange={e => setCustomEntryData({...customEntryData, restDayCompensation: e.target.value as any})}
                         >
                           <option value="1_day">{t('t_auto_353')}</option>
                           <option value="1_day_plus_overtime">{t('t_auto_354')}</option>
                           <option value="2_days">{t('t_auto_355')}</option>
                         </select>
                       </div>
                    </div>
               )}
            </>
          )}

          <Button 
            className="w-full h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-lg mt-2 shadow-sm"
            disabled={customEntryData.type === 'compensation' && (!customEntryData.linkedCompensationSessionId || getAvailableCompensations(selectedDay).length === 0)}
            onClick={handleCustomEntry}
          >
             {t('cal.log')}
                              </Button>
        </div>

        {/* Separator / existing sessions */}
        {daySessions.length > 0 && (
           <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
              <div className="flex flex-col gap-1 text-sm font-bold text-muted-foreground w-full">
                 <div className="flex justify-between items-center">
                    <span>{t('cal.records_today')}</span>
                    <span className="text-primary font-bold">{totalHours} {t('t_auto_9')}</span>
                 </div>
                 <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground/80 justify-end">
                    <span>{lang === 'ar' ? 'الأساسي:' : 'Basic:'} <span className="font-semibold text-foreground/90">{Math.max(0, totalHours - overtimeHours)} {t('t_auto_9')}</span></span>
                    {overtimeHours > 0 && <span>{t('t_auto_214')} <span className="font-semibold text-emerald-500">{overtimeHours} {t('t_auto_9')}</span></span>}
                    {dayFractions > 0 && <span className="text-amber-500 font-bold">+{dayFractions} {lang === 'ar' ? 'د كسر' : 'm fraction'}</span>}
                 </div>
              </div>
              
              <div className="flex flex-col gap-2">
                 {daySessions.map(sess => {
                    let typeLabel = t('cal.work_day');
                    if (sess.dayStatus === 'annual_leave') typeLabel = t('cal.annual');
                    if (sess.dayStatus === 'sick_leave') typeLabel = t('cal.sick');
                    if (sess.dayStatus === 'casual_leave') typeLabel = t('cal.casual');
                    if (sess.dayStatus === 'compensation') typeLabel = t('cal.alternative_leave');
                    if (sess.dayStatus === 'half_day_leave') typeLabel = t('cal.half_day');
                    if (sess.dayStatus === 'permission') typeLabel = t('cal.permission');
                    if (sess.type === 'project') typeLabel = t('t_auto_215');

                    return (
                       <div key={sess.id} className="flex justify-between items-center bg-card border border-border/50 p-3 rounded-xl shadow-sm">
                          <div>
                             <span className="font-bold text-sm block">{typeLabel}</span>
                             {sess.endTime ? (
                               <span className="text-xs text-muted-foreground font-mono">{format(new Date(sess.startTime), 'HH:mm')} - {format(new Date(sess.endTime), 'HH:mm')}</span>
                             ) : (
                               <span className="text-xs text-muted-foreground">{t('cal.all_day')}</span>
                             )}
                          </div>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 h-8 w-8" onClick={() => deleteSession(sess.id, true)}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    );
                 })}
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderHolidaysTable = () => {
    // Sort holidays by date
    const hols = [...(settings.customHolidays || [])].sort((a,b) => a.date.localeCompare(b.date));
    
    // Filter to show only ones in the current year
    const currentYear = currentDate.getFullYear();
    const currentYearHols = hols.filter(h => h.date.startsWith(currentYear.toString()));
    
    return (
      <div className="bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 relative mt-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 px-2">
          <div>
            <h3 className="text-xl font-black text-right flex items-center gap-2">
               <CalendarIcon className="w-5 h-5 text-indigo-500" />
               {t('t_auto_216')}{currentYear})
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('cal.track_holidays')}</p>
          </div>
          
          <div className="flex bg-secondary/30 p-1.5 rounded-[1.2rem] items-center w-full sm:w-auto">
             <Button 
                variant="ghost" 
                size="sm"
                className="h-9 px-4 text-xs font-bold text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-xl w-full sm:w-auto"
                onClick={() => {
                   const generated = generateEgyptianHolidays(currentYear);
                   const existingDates = new Set((settings.customHolidays || []).map(h => h.date));
                   const added = generated.filter(h => !existingDates.has(h.date));
                   if (added.length > 0) {
                       const newHolidays = [...(settings.customHolidays || []), ...added].sort((a,b) => a.date.localeCompare(b.date));
                       updateSettings({ ...settings, customHolidays: newHolidays });
                       toast.success(`تم استيراد ${added.length} إجازات رسمية بنجاح`);
                   } else {
                       toast.info(t('cal.all_holidays_logged'));
                   }
                }}
             >
                <RefreshCw className="w-4 h-4 ml-1.5" /> {t('cal.import_custom')}
                                     </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/50 bg-secondary/10">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-secondary/40 text-muted-foreground">
                <th className="p-3 font-bold w-1/4">{t('cal.date')}</th>
                <th className="p-3 font-bold w-1/3">{t('cal.occasion')}</th>
                <th className="p-3 font-bold w-1/4">{t('cal.status')}</th>
                <th className="p-3 font-bold w-1/6 text-center">{t('cal.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {currentYearHols.length === 0 ? (
                <tr>
                   <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">{t('t_auto_217')}</td>
                </tr>
              ) : currentYearHols.map((h, i) => {
                // Check if worked
                const daySessions = sessions.filter(s => s.startTime.toString().startsWith(h.date));
                const workedHours = daySessions.filter(s => !s.dayStatus || ['work', 'rest_day_work'].includes(s.dayStatus)).reduce((acc, s) => acc + (s.duration || 0), 0) / 60;
                const isPast = new Date(h.date) < new Date();
                
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-mono text-xs">{h.date}</td>
                    <td className="p-3 font-bold">{t(h.name)}</td>
                    <td className="p-3 text-xs">
                      {workedHours > 0 ? (
                        <span className="bg-emerald-500/10 text-emerald-500 font-bold px-2 py-1 rounded-full text-[10px]">
                          {t('t_auto_218')}{workedHours.toFixed(1)} {t('t_auto_219')}
                                                            </span>
                      ) : isPast ? (
                         <span className="bg-blue-500/10 text-blue-500 font-bold px-2 py-1 rounded-full text-[10px]">{t('cal.normal_leave')}</span>
                      ) : (
                         <span className="bg-secondary/40 text-muted-foreground font-bold px-2 py-1 rounded-full text-[10px]">{t('cal.upcoming')}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/10 hover:text-red-500 transition-colors" onClick={() => {
                          const newH = [...(settings.customHolidays || [])];
                          const idx = newH.findIndex(x => x.date === h.date && x.name === h.name);
                          if (idx > -1) newH.splice(idx, 1);
                          updateSettings({ ...settings, customHolidays: newH });
                      }}>
                          <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="p-3 bg-card border-t border-border/50 flex flex-col sm:flex-row gap-2">
              <Input 
                type="date" 
                className="flex-shrink border-border/50 bg-secondary/20 text-sm h-9 w-full sm:w-fit custom-holiday-date" 
              />
              <Input 
                placeholder={t('t_auto_220')} 
                className="flex-1 border-border/50 bg-secondary/20 text-sm h-9 custom-holiday-name" 
              />
              <Button 
                variant="default" 
                className="h-9 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-5"
                onClick={(e) => {
                    const parent = (e.target as HTMLElement).closest('.p-3');
                    const dateInput = parent?.querySelector('.custom-holiday-date') as HTMLInputElement;
                    const nameInput = parent?.querySelector('.custom-holiday-name') as HTMLInputElement;
                    if (dateInput?.value && nameInput?.value) {
                      const newH = [...(settings.customHolidays || []), { date: dateInput.value, name: nameInput.value }];
                      updateSettings({ ...settings, customHolidays: newH.sort((a,b) => a.date.localeCompare(b.date)) });
                      dateInput.value = '';
                      nameInput.value = '';
                    } else {
                      toast.error(t('cal.enter_date_name'));
                    }
                }}
              >
                <Plus className="w-4 h-4 ml-1" /> {t('cal.add_custom_holiday')}
                                      </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (viewType) {
      case 'monthly':
        return renderMonthlyGrid();
      case 'weekly':
        return renderWeeklyGrid();
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-20" >
      
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 mt-2 px-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-500/10">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight">{t('cal.advanced_calendar')}</h2>
            <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5 font-medium">
              {viewType === 'monthly' && format(currentDate, 'MMMM yyyy', { locale: lang === 'ar' ? ar : enUS })}
              {viewType === 'weekly' && `الأسبوع: ${format(startOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')} - ${format(endOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')}`}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full xl:w-auto items-stretch sm:items-center gap-3 bg-secondary/20 p-1.5 rounded-[1.5rem] shadow-sm border border-border/50 backdrop-blur-md">
          
          {/* Smart Toggle: Gregorian / Hijri */}
          <div className="flex bg-secondary/40 p-1 rounded-2xl w-full sm:w-auto">
            <button 
                onClick={() => setDisplayMode('gregorian')}
                className={`flex-1 sm:px-6 py-2 rounded-xl text-[13px] sm:text-sm transition-all duration-200 ${displayMode === 'gregorian' ? 'bg-background font-bold text-indigo-500 shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
            >
                {t('cal.gregorian')}
            </button>
            <button 
                onClick={() => setDisplayMode('hijri')}
                className={`flex-1 sm:px-6 py-2 rounded-xl text-[13px] sm:text-sm transition-all duration-200 ${displayMode === 'hijri' ? 'bg-background font-bold text-indigo-500 shadow-sm' : 'text-muted-foreground hover:text-foreground font-medium'}`}
            >
                {t('cal.hijri')}
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setConverterOpen(true)} className="h-10 sm:h-auto rounded-2xl sm:rounded-xl font-bold bg-secondary/30 hover:bg-secondary/60 flex-shrink-0 px-4 border-transparent shadow-none" title={t('cal.date_converter')}>
            <RefreshCw className="w-4 h-4 ml-1.5" />
            <span className="inline-block">{t('cal.date_converter')}</span>
          </Button>

          <div className="hidden sm:block w-px h-8 bg-border/50 self-center mx-1"></div>

          {/* View Toggles */}
          <div className="flex bg-secondary/40 p-1 rounded-2xl w-full sm:w-auto flex-wrap sm:flex-nowrap gap-1">
            <Button 
              variant={viewType === 'monthly' && !isPaintingMode ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-10 text-[13px] sm:text-sm rounded-xl transition-all ${viewType === 'monthly' && !isPaintingMode ? 'font-bold bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setViewType('monthly'); setIsPaintingMode(false); }}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" /> {t('cal.monthly')}
                                      </Button>
            <Button 
              variant={viewType === 'weekly' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-10 text-[13px] sm:text-sm rounded-xl transition-all ${viewType === 'weekly' ? 'font-bold bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setViewType('weekly'); setIsPaintingMode(false); }}
            >
              <List className="w-4 h-4 mr-1.5" /> {t('cal.weekly')}
                                      </Button>
            <Button 
              variant={isPaintingMode ? 'default' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-10 text-[13px] sm:text-sm rounded-xl transition-all ${isPaintingMode ? 'font-bold shadow-md bg-indigo-500 hover:bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => { setViewType('monthly'); setIsPaintingMode(true); }}
            >
              <Palette className="w-4 h-4 mr-1.5" /> {t('cal.scheduling')}
                                      </Button>
          </div>

          {/* Navigation */}
          {viewType !== 'monthly' && (
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
              <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-9 w-9 rounded-xl hover:bg-secondary/50">
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={goToToday} className="h-9 text-xs font-bold rounded-xl hover:bg-secondary/50">
                {t('cal.today')}
                                            </Button>
              <Button variant="ghost" size="icon" onClick={prevPeriod} className="h-9 w-9 rounded-xl hover:bg-secondary/50">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
          )}

        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isPaintingMode && (
          <div className="flex flex-col gap-2 p-4 mt-2 bg-card/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl justify-center animate-in slide-in-from-top-4 shadow-md">
            <div className="flex flex-wrap gap-2 justify-center w-full">
              <p className="w-full text-center text-xs font-bold text-muted-foreground mb-1">{t('cal.select_shift_click_days')}</p>
              {shifts.map(shift => (
                <Button
                  key={shift.id}
                  variant={selectedPaintShiftId === shift.id ? 'default' : 'outline'}
                  size="sm"
                  className={`rounded-xl h-9 px-3 transition-all font-bold ${selectedPaintShiftId === shift.id ? 'border-2 scale-105' : 'opacity-80 hover:opacity-100'}`}
                  style={selectedPaintShiftId === shift.id ? { borderColor: shift.color, backgroundColor: shift.color + '20', color: shift.color } : {}}
                  onClick={() => setSelectedPaintShiftId(shift.id)}
                >
                  <div className="w-2.5 h-2.5 rounded-full ml-1.5 shadow-sm" style={{ backgroundColor: shift.color }}/>
                  {shift.name} ({shift.startTime})
                </Button>
              ))}
              {shifts.length === 0 && <span className="text-xs text-amber-500">{t('t_auto_221')}</span>}
            </div>
            
            <AdvancedShiftEditor />
            
          </div>
        )}
        {renderCurrentView()}
        {renderHolidaysTable()}
      </div>

      <UnifiedEntrySheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        initialDate={selectedDay}
        allowDateChange={false}
      />

      <Sheet open={converterOpen} onOpenChange={setConverterOpen}>
         <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] z-[110] p-6 text-center shadow-2xl">
            <SheetHeader className="pb-6">
               <SheetTitle className="text-2xl font-black text-primary">{t('cal.pro_date_converter')}</SheetTitle>
               <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                  {t('t_auto_223')}
                                         </p>
            </SheetHeader>
            <div className="flex flex-col gap-6" >
               <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                  <label className="text-xs font-bold text-foreground/70 mb-3 block text-right pr-2">{t('cal.gregorian_date')}</label>
                  <Input 
                    type="date" 
                    className="h-14 font-black text-lg bg-card/80 border-white/10 rounded-2xl drop-shadow-sm px-4" 
                    value={converterDate} 
                    onChange={e => setConverterDate(e.target.value)} 
                  />
               </div>
               
               <div className="flex justify-center -my-2 z-10">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
                     <RefreshCw className="w-5 h-5" />
                  </div>
               </div>

               <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
                   <label className="text-xs font-bold text-primary/80 mb-3 block text-right pr-2">{t('cal.hijri_date')}</label>
                   <div className="h-14 font-black flex items-center justify-center text-xl text-primary bg-card/60 backdrop-blur-md border border-primary/10 rounded-2xl shadow-inner">
                      {converterDate ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(converterDate)) : '--'}
                   </div>
               </div>
            </div>
            <Button variant="ghost" className="w-full h-12 mt-8 rounded-2xl font-bold bg-secondary/50 hover:bg-secondary text-foreground" onClick={() => setConverterOpen(false)}>
               {t('cal.close')}
                                  </Button>
         </SheetContent>
      </Sheet>

    </div>
  );
}
