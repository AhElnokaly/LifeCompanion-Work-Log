import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, List, LayoutGrid, Activity, Clock, Briefcase, Plus, Palette, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, subDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';

import { gregorianToHijri } from '../../lib/hijri';
import JobsShiftsView from './JobsShiftsView';

export default function CalendarView() {
  const { sessions, jobs, shifts, shiftAssignments, toggleShiftAssignment, settings, deleteSession, logSpecialSession } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [selectedPaintShiftId, setSelectedPaintShiftId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'monthly' | 'weekly' | 'shifts'>('monthly');
  const [displayMode, setDisplayMode] = useState<'gregorian' | 'hijri'>('gregorian');
  
  const [converterOpen, setConverterOpen] = useState(false);
  const [converterDate, setConverterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 6 }); // Start Saturday
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 6 });
    const days = eachDayOfInterval({ start, end });

    const weekDays = [
      { full: 'السبت', short: 'سبت' },
      { full: 'الأحد', short: 'أحد' },
      { full: 'الإثنين', short: 'إثنين' },
      { full: 'الثلاثاء', short: 'ثلاثاء' },
      { full: 'الأربعاء', short: 'أربعاء' },
      { full: 'الخميس', short: 'خميس' },
      { full: 'الجمعة', short: 'جمعة' }
    ];

    return (
      <Card className="flex flex-col bg-card/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl mt-4 px-2 pb-6 pt-4 relative">
        {/* Ambient Glow */}
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none z-0"></div>
        
        {/* Month Title & Nav (Slim style) */}
        <div className="flex items-center justify-between mb-6 px-4 z-10">
           <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-10 w-10 py-0 rounded-full hover:bg-secondary text-foreground/70 active:scale-95 transition-transform">
             <ChevronRight className="w-6 h-6" />
           </Button>
           <div className="flex flex-col items-center">
             <h3 className="text-2xl font-bold font-cairo text-foreground tracking-tight drop-shadow-sm">
                {displayMode === 'gregorian' ? format(currentDate, 'MMMM yyyy', { locale: ar }) : new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'long' }).format(currentDate)}
             </h3>
             <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase opacity-80 mt-1">
                {displayMode === 'gregorian' ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year: 'numeric' }).format(currentDate) : format(currentDate, 'yyyy', { locale: ar })}
             </span>
           </div>
           <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-10 w-10 py-0 rounded-full hover:bg-secondary text-foreground/70 active:scale-95 transition-transform">
             <ChevronLeft className="w-6 h-6" />
           </Button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 mb-4 z-10">
          {weekDays.map(day => (
            <div key={day.full} className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
              {day.short}
            </div>
          ))}
        </div>
        
        {/* Slim Grid */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-1 z-10 text-center">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDay);
            const dayStr = format(day, 'yyyy-MM-dd');
            const assignedShiftId = shiftAssignments[dayStr];
            const assignedShift = assignedShiftId ? shifts.find(s => s.id === assignedShiftId) : null;
            
            // Find sessions for this day
            const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
            const hasSessions = daySessions.length > 0;
            const hasOvertime = daySessions.some(s => (s.overtimeMinutes || 0) > 0);
            const hasLeave = daySessions.some(s => s.isAnnualLeave || s.isSickLeave || s.isHalfDayLeave || s.isPermission);
            
            // Holidays logic
            let holidayName = null;
            const EGYPTIAN_HOLIDAYS = ["01-07","01-25","04-25","05-01","06-30","07-23","10-06"];
            const dayKey = format(day, 'MM-dd');
            if (EGYPTIAN_HOLIDAYS.includes(dayKey)) holidayName = 'عطلة رسمية';
            
            // Modern Islamic Holidays via Intl
            let hDayNum = 1;
            try {
               const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric', day: 'numeric' });
               const hParts = hijriFormatter.formatToParts(day);
               const hMonth = parseInt(hParts.find(p => p.type === 'month')?.value || '1');
               hDayNum = parseInt(hParts.find(p => p.type === 'day')?.value || '1');
               
               if (hMonth === 9 && hDayNum === 1) holidayName = 'أول رمضان';
               if (hMonth === 10 && hDayNum <= 3) holidayName = 'عيد الفطر';
               if (hMonth === 12 && hDayNum >= 9 && hDayNum <= 13) holidayName = 'عيد الأضحى';
            } catch(e) {}

            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[50px] flex flex-col items-center justify-start gap-1 cursor-pointer relative rounded-xl border border-transparent transition-all ${
                  !isCurrentMonth ? 'opacity-20' : ''
                } ${isPaintingMode && assignedShift ? 'opacity-90' : ''} ${hasSessions && !isSelected && !isPaintingMode ? 'bg-secondary/20 hover:bg-secondary/40' : 'hover:bg-secondary/10'} ${hasOvertime ? 'border-orange-500/30' : ''} ${hasLeave ? 'border-emerald-500/30' : ''}`}
                style={isPaintingMode && assignedShift ? { backgroundColor: assignedShift.color + '20' } : {}}
                onClick={() => {
                   if (isPaintingMode) {
                      if (selectedPaintShiftId) {
                         toggleShiftAssignment(dayStr, selectedPaintShiftId);
                      }
                   } else {
                     setSelectedDay(day);
                     setSheetOpen(true);
                   }
                }}
              >
                {/* Date Bubble */}
                <div className="relative flex flex-col items-center">
                  {isSelected && <div className="absolute inset-[-6px] bg-primary/20 border border-primary/30 rounded-xl scale-110 z-0 transition-transform"></div>}
                  <span className={`text-[15px] sm:text-[17px] font-bold transition-all duration-300 relative z-10 ${
                    isToday ? 'text-indigo-400 drop-shadow-sm' : 
                    isSelected ? 'text-indigo-300' : 'text-foreground/90'
                  } ${holidayName && !isToday && !isSelected ? 'text-amber-500/90' : ''}`}
                  style={isPaintingMode && assignedShift ? { color: assignedShift.color } : {}}>
                    {displayMode === 'gregorian' ? format(day, 'd') : hDayNum}
                  </span>
                  
                  {/* Sub-date (small number) */}
                  {!isPaintingMode && (
                     <span className="text-[9px] text-muted-foreground/50 font-bold -mt-1 z-10">
                       {displayMode === 'gregorian' ? hDayNum : format(day, 'd')}
                     </span>
                  )}
                </div>

                {/* Dots indicator */}
                <div className="flex flex-wrap gap-0.5 mt-0.5 items-center justify-center relative z-10 w-full px-1">
                  {holidayName && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />}
                  {assignedShift && !isPaintingMode && <div className="w-2 h-2 rounded-full shadow-sm mx-0.5" style={{backgroundColor: assignedShift.color}} title={assignedShift.name} />}
                  {hasOvertime && !isPaintingMode && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-sm" title="عمل إضافي" />}
                  {daySessions.slice(0, 3).map((sess, i) => {
                    let dotColor = "bg-primary";
                    if (sess.isAnnualLeave) dotColor = "bg-emerald-500";
                    else if (sess.isRestDayWork) dotColor = "bg-red-500";
                    else if (sess.isPermission) dotColor = "bg-yellow-500";
                    else if (sess.projectId || sess.type !== 'salary') {
                        const job = jobs.find(j => j.id === (sess as any).jobId); 
                        if (job) dotColor = ""; // Will use inline style
                    }
                    
                    const jb = jobs.find(j => j.id === (sess as any).jobId);
                    
                    return (
                       <div key={sess.id} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} style={!dotColor && jb ? {backgroundColor: jb.color} : {}} />
                    )
                  })}
                  {daySessions.length > 3 && <div className="w-1 h-1 rounded-full bg-muted-foreground" />}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quick Monthly Summary */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap justify-between items-center z-10 px-2 gap-4">
           <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">ملخص ساعات الشهر</span>
              <span className="text-xl font-black text-primary">
                 {sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate)).reduce((acc, s) => acc + (s.duration || 0) / 60, 0).toFixed(1)} <span className="text-sm font-medium text-muted-foreground">ساعة</span>
              </span>
           </div>
           <div className="flex gap-4">
              <div className="flex flex-col items-center">
                 <div className="w-2 h-2 rounded-full bg-orange-500 mb-1"></div>
                 <span className="text-[10px] text-muted-foreground">إضافي</span>
                 <span className="text-sm font-bold text-orange-500">
                    {sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate)).reduce((acc, s) => acc + (s.overtimeMinutes || 0) / 60, 0).toFixed(1)}س
                 </span>
              </div>
              <div className="flex flex-col items-center">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 mb-1"></div>
                 <span className="text-[10px] text-muted-foreground">إجازات</span>
                 <span className="text-sm font-bold text-emerald-500">
                    {sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate) && (s.isAnnualLeave || s.isSickLeave || s.isHalfDayLeave || s.isPermission)).length} يوم
                 </span>
              </div>
           </div>
        </div>
      </Card>
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
      const dayName = format(day, 'EEE', { locale: ar });
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
            <p className="text-sm text-primary mb-1 font-bold">ساعات العمل</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-primary">{actualTotalHours.toFixed(1)}</span>
              <span className="text-primary/70 font-medium text-xs">/ {goalHours}س</span>
            </div>
          </Card>
          
          <Card className="p-6 bg-yellow-500/10 border-yellow-500/20 shadow-lg rounded-3xl relative overflow-hidden flex flex-col justify-center items-center text-center">
            <p className="text-sm text-yellow-500 mb-1 font-bold">إضافي الأسبوع</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-yellow-500">{totalOvertime.toFixed(1)}</span>
              <span className="text-yellow-500/70 font-medium text-xs">ساعة</span>
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
                 <ReferenceLine y={settings.dailyHours} stroke="#ec4899" strokeDasharray="3 3" opacity={0.5} label={{ position: 'top', value: 'الهدف اليومي', fill: '#ec4899', fontSize: 10 }} />
                 <ReferenceLine y={settings.dailyHours + (settings.notificationPreferences?.overtimeWarningMinutes ? settings.notificationPreferences.overtimeWarningMinutes / 60 : 0.5)} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} label={{ position: 'top', value: 'تحذير إضافي', fill: '#eab308', fontSize: 10 }} />
                 <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                   {dailyData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.isWeekend ? '#ca8a04' : '#6366f1'} opacity={entry.hours === 0 ? 0.3 : 1} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
          
          <div className="mt-6 text-center text-sm font-medium">
            مقارنة بالأسبوع الماضي: <span className={diffHours >= 0 ? "text-emerald-400" : "text-red-400"}>
              {diffHours > 0 ? '+' : ''}{diffHours.toFixed(1)} ساعة ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(0)}%)
            </span>
          </div>
        </Card>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center text-center justify-center">
              <Activity className="w-6 h-6 mb-2 text-primary" />
              <span className="text-xl font-bold">103%</span>
              <span className="text-xs text-muted-foreground">كفاءة الإنتاجية</span>
          </Card>
          <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center text-center justify-center">
              <Clock className="w-6 h-6 mb-2 text-yellow-500" />
              <span className="text-xl font-bold">{Math.round(actualTotalHours * 0.8)}س</span>
              <span className="text-xs text-muted-foreground">وقت التركيز العميق</span>
          </Card>
        </div>
      </div>
    );
  };

  const renderDailyTimeline = () => {
    // Get sessions for selectedDay
    const daySessions = sessions
      .filter(s => isSameDay(new Date(s.startTime), selectedDay))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const totalMinutes = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (daySessions.length === 0) {
      return (
        <Card className="p-10 bg-card border-white/5 rounded-2xl flex flex-col items-center justify-center text-center mt-4">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد سجلات في هذا اليوم</p>
          
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
             <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => logSpecialSession('permission', { hours: 1, date: selectedDay.toISOString() })}>
                <Clock className="w-4 h-4 ml-2 text-indigo-500" /> تصريح
             </Button>
             <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => logSpecialSession('half_day_leave', { date: selectedDay.toISOString() })}>
                <Activity className="w-4 h-4 ml-2 text-orange-500" /> نصف يوم
             </Button>
             <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => logSpecialSession('sick_leave', { date: selectedDay.toISOString() })}>
                <Plus className="w-4 h-4 ml-2 text-red-500" /> إجازة مرضية
             </Button>
          </div>
        </Card>
      );
    }

    return (
      <div className="flex flex-col gap-6 mt-4">
        {/* Day Insights Glass Card */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">نظرة عامة على اليوم</h3>
           <div className="bg-card/30 backdrop-blur-md rounded-[2rem] p-6 border-t border-l border-white/10 border-r border-b border-black/10 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
              <div className="flex items-start justify-between relative z-10">
                 <div className="space-y-1">
                    <p className="text-foreground/60 text-sm font-medium">ساعات العمل</p>
                    <p className="text-4xl font-light tracking-tight text-foreground" dir="ltr">{hours}h {minutes}m</p>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                    <Activity className="w-6 h-6" />
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-6 relative z-10">
                 {daySessions.map(s => {
                    const job = s.projectId || s.type !== 'salary' ? jobs.find(j => j.id === (s as any).jobId) : null;
                    if (s.isAnnualLeave) return <span key={s.id} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-500 font-bold">إجازة سنوية</span>;
                    if (s.isPermission) return <span key={s.id} className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs text-yellow-500 font-bold">تصريح</span>;
                    if (job) return <span key={s.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-foreground/80 font-bold" style={{color: job.color}}>#{job.name}</span>;
                    return null;
                 })}
              </div>
           </div>
        </section>

        {/* Activity Density Graphic */}
        <section className="bg-card/30 backdrop-blur-md rounded-[2rem] p-6 border-t border-l border-white/10 border-r border-b border-black/10 shadow-lg">
           <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">كثافة النشاط</span>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded-full">ذروة الإنتاجية اليوم</span>
           </div>
           
           <div className="flex items-end justify-between h-16 gap-1.5 px-2">
              <div className="w-full bg-indigo-500/10 rounded-t h-4 transition-all duration-500 hover:bg-indigo-500/30"></div>
              <div className="w-full bg-indigo-500/10 rounded-t h-6 transition-all duration-500 hover:bg-indigo-500/30"></div>
              <div className="w-full bg-indigo-500/40 rounded-t h-12 transition-all duration-500 hover:bg-indigo-500/60 shadow-[0_0_10px_rgba(99,102,241,0.2)]"></div>
              <div className="w-full bg-indigo-500/60 rounded-t h-16 transition-all duration-500 hover:bg-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.4)]"></div>
              <div className="w-full bg-indigo-500/40 rounded-t h-10 transition-all duration-500 hover:bg-indigo-500/60"></div>
              <div className="w-full bg-indigo-500/10 rounded-t h-3 transition-all duration-500 hover:bg-indigo-500/30"></div>
              <div className="w-full bg-indigo-500/10 rounded-t h-5 transition-all duration-500 hover:bg-indigo-500/30"></div>
           </div>
           <div className="flex justify-between mt-2 px-1" dir="ltr">
              <span className="text-[10px] text-muted-foreground font-medium">08:00</span>
              <span className="text-[10px] text-muted-foreground font-medium">12:00</span>
              <span className="text-[10px] text-muted-foreground font-medium">18:00</span>
           </div>
        </section>

        {/* Timeline */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 flex justify-between items-center">
              <span>السجل الزمني</span>
              <span className="text-indigo-500 font-bold">{daySessions.length} جلسة</span>
           </h3>
           <div className="flex flex-col gap-3">
            {daySessions.map((sess, idx) => {
          let badgeColor = "bg-primary text-primary-foreground";
          let label = "دوام منتظم";

          if (sess.isAnnualLeave) {
            badgeColor = "bg-emerald-500 text-emerald-950";
            label = "إجازة سنوية";
          } else if (sess.isRestDayWork) {
            badgeColor = "bg-red-500 text-red-950";
            label = "عمل بديل";
          } else if (sess.isPermission) {
            badgeColor = "bg-yellow-500 text-yellow-950";
            label = `تصريح (${sess.permissionHours}س)`;
          } else if (sess.projectId || sess.type !== 'salary') {
             const job = jobs.find(j => j.id === (sess as any).jobId);
             if (job) {
                badgeColor = "text-white";
                label = job.name;
             }
          }

          return (
            <Card key={sess.id} className="p-4 bg-card border-white/5 rounded-2xl relative overflow-hidden flex gap-4 items-center">
              {/* Timeline indicator line */}
              <div className="absolute top-0 bottom-0 right-[27px] w-0.5 bg-border/50 z-0"></div>
              
              <div className="w-4 h-4 rounded-full bg-secondary border-[3px] border-card z-10 shrink-0 shadow-sm relative">
                {/* Active pulse */}
                {!sess.endTime && <span className="absolute inset-[-4px] rounded-full animate-ping bg-primary opacity-50"></span>}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span 
                      className={`text-xs px-2 py-0.5 rounded-full font-bold mb-1 inline-block ${badgeColor.includes('bg-') ? badgeColor : ''}`}
                      style={!badgeColor.includes('bg-') ? { backgroundColor: jobs.find(j => j.id === (sess as any).jobId)?.color } : {}}
                    >
                      {label}
                    </span>
                    <h4 className="font-bold">
                      {format(new Date(sess.startTime), 'hh:mm a')} 
                      {' '} - {' '} 
                      {sess.endTime ? format(new Date(sess.endTime), 'hh:mm a') : 'مستمر...'}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <div className="text-left font-mono font-bold text-lg text-primary/80">
                       {sess.duration ? `${(sess.duration / 60).toFixed(1)}h` : '--'}
                     </div>
                     <DropdownMenu dir="rtl">
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-secondary/50">
                              <Edit className="w-3 h-3 text-muted-foreground" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                           <DropdownMenuItem className="text-red-500 font-bold focus:bg-red-500/10 focus:text-red-500" onClick={() => deleteSession(sess.id, true)}>
                              <Trash2 className="w-4 h-4 ml-2" /> مسح السجل
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                </div>
                
                {sess.notes && (
                  <p className="text-sm text-muted-foreground mt-2 bg-secondary/20 p-2 rounded-lg border border-border/20">
                    {sess.notes}
                  </p>
                )}
                {sess.isRestDayWork && sess.restDayCompensation && (
                  <p className="text-xs font-bold text-red-500 mt-2 bg-red-500/10 p-2 rounded-lg inline-block">
                    طريقة التعويض المختارة للراحة: {sess.restDayCompensation.replace('_', ' ')}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
        
        {/* Daily Quick Actions */}
        <div className="mt-8 pt-4 border-t border-border flex flex-wrap gap-2 justify-center">
           <Button variant="outline" size="sm" className="rounded-xl h-10 w-full xs:w-auto" onClick={() => logSpecialSession('permission', { hours: 1, date: selectedDay.toISOString() })}>
              <Clock className="w-4 h-4 ml-2 text-indigo-500" /> إضافة تصريح (ساعة)
           </Button>
           <Button variant="outline" size="sm" className="rounded-xl h-10 w-full xs:w-auto" onClick={() => logSpecialSession('half_day_leave', { date: selectedDay.toISOString() })}>
              <Activity className="w-4 h-4 ml-2 text-orange-500" /> إضافة نصف يوم
           </Button>
           <Button variant="outline" size="sm" className="rounded-xl h-10 w-full xs:w-auto" onClick={() => logSpecialSession('sick_leave', { date: selectedDay.toISOString() })}>
              <Plus className="w-4 h-4 ml-2 text-red-500" /> إجازة مرضية
           </Button>
        </div>
           </div>
        </section>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (viewType) {
      case 'monthly':
        return renderMonthlyGrid();
      case 'weekly':
        return renderWeeklyGrid();
      case 'shifts':
        return <JobsShiftsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-20" dir="rtl">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            {viewType === 'shifts' ? <Briefcase className="w-6 h-6" /> : <CalendarIcon className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{viewType === 'shifts' ? 'جدولة الورديات' : 'التقويم المتقدم'}</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              {viewType === 'monthly' && format(currentDate, 'MMMM yyyy', { locale: ar })}
              {viewType === 'weekly' && `الأسبوع: ${format(startOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')} - ${format(endOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')}`}
              {viewType === 'daily' && format(currentDate, 'EEEE، d MMMM yyyy', { locale: ar })}
              {viewType === 'shifts' && 'إعداد الورديات والوظائف'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          
          {/* Smart Toggle: Gregorian / Hijri */}
          {viewType !== 'shifts' && (
             <div className="bg-card/40 backdrop-blur-2xl border border-white/5 p-1 rounded-full flex items-center gap-1 shadow-sm w-full sm:w-auto overflow-hidden">
                <button 
                   onClick={() => setDisplayMode('gregorian')}
                   className={`flex-1 sm:px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 ${displayMode === 'gregorian' ? 'bg-primary/20 text-indigo-500 border border-indigo-500/10 shadow-inner' : 'text-muted-foreground hover:text-foreground'}`}
                >
                   ميلادي
                </button>
                <button 
                   onClick={() => setDisplayMode('hijri')}
                   className={`flex-1 sm:px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 ${displayMode === 'hijri' ? 'bg-primary/20 text-indigo-500 border border-indigo-500/10 shadow-inner' : 'text-muted-foreground hover:text-foreground'}`}
                >
                   هجري
                </button>
             </div>
          )}

          {viewType !== 'shifts' && (
             <Button variant="outline" size="sm" onClick={() => setConverterOpen(true)} className="w-full sm:w-auto h-9 text-xs rounded-full font-bold bg-secondary/50">
               <RefreshCw className="w-4 h-4 ml-1.5" /> محول التاريخ
             </Button>
          )}

          {/* View Toggles */}
          <div className="flex bg-secondary/30 p-1 rounded-xl w-full sm:w-auto flex-wrap sm:flex-nowrap gap-1">
            <Button 
              variant={viewType === 'monthly' && !isPaintingMode ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-8 text-xs rounded-lg ${viewType === 'monthly' && !isPaintingMode ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => { setViewType('monthly'); setIsPaintingMode(false); }}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> شهري
            </Button>
            <Button 
              variant={viewType === 'weekly' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-8 text-xs rounded-lg ${viewType === 'weekly' ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => { setViewType('weekly'); setIsPaintingMode(false); }}
            >
              <List className="w-3.5 h-3.5 mr-1.5" /> أسبوعي
            </Button>
            <Button 
              variant={isPaintingMode ? 'default' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-8 text-xs rounded-lg ${isPaintingMode ? 'font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm' : ''}`}
              onClick={() => { setViewType('monthly'); setIsPaintingMode(true); }}
            >
              <Palette className="w-3.5 h-3.5 mr-1.5" /> جدولة
            </Button>
            <Button 
              variant={viewType === 'shifts' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 min-w-[70px] h-8 text-xs rounded-lg ${viewType === 'shifts' ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => { setViewType('shifts'); setIsPaintingMode(false); }}
            >
              <Briefcase className="w-3.5 h-3.5 mr-1.5" /> الوظائف والورديات
            </Button>
          </div>

          {/* Navigation */}
          {viewType !== 'shifts' && viewType !== 'monthly' && (
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
              <Button variant="ghost" size="icon" onClick={nextPeriod} className="h-9 w-9 rounded-xl hover:bg-secondary/50">
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={goToToday} className="h-9 text-xs font-bold rounded-xl hover:bg-secondary/50">
                اليوم
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
          <div className="flex flex-wrap gap-2 p-4 mt-2 bg-card/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl justify-center animate-in slide-in-from-top-4 shadow-md">
            <p className="w-full text-center text-xs font-bold text-muted-foreground mb-1">اختر وردية واضغط على الأيام لجدولتها</p>
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
            {shifts.length === 0 && <span className="text-xs text-amber-500">يرجى إضافة ورديات من الإعدادات أولاً.</span>}
          </div>
        )}
        {renderCurrentView()}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] overflow-y-auto z-[100] p-4 pb-20">
           <SheetHeader className="pb-4">
             <SheetTitle className="flex flex-col gap-1 items-center">
                <div className="flex gap-2 items-center text-xl font-bold">
                   <CalendarIcon className="w-5 h-5 text-primary" />
                   {format(selectedDay, 'EEEE، d MMMM yyyy', { locale: ar })}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                   {new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDay)}
                </div>
             </SheetTitle>
           </SheetHeader>
           {renderDailyTimeline()}
        </SheetContent>
      </Sheet>

      <Sheet open={converterOpen} onOpenChange={setConverterOpen}>
         <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] z-[110] p-6 text-center shadow-2xl">
            <SheetHeader className="pb-6">
               <SheetTitle className="text-2xl font-black text-primary">محول التاريخ الاحترافي</SheetTitle>
               <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                  أدخل التاريخ الميلادي لمعرفة التاريخ الهجري المطابق له، بشكل فوري وسريع.
               </p>
            </SheetHeader>
            <div className="flex flex-col gap-6" dir="rtl">
               <div className="bg-secondary/30 p-4 rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                  <label className="text-xs font-bold text-foreground/70 mb-3 block text-right pr-2">التاريخ الميلادي</label>
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
                   <label className="text-xs font-bold text-primary/80 mb-3 block text-right pr-2">التاريخ الهجري</label>
                   <div className="h-14 font-black flex items-center justify-center text-xl text-primary bg-card/60 backdrop-blur-md border border-primary/10 rounded-2xl shadow-inner">
                      {converterDate ? new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(converterDate)) : '--'}
                   </div>
               </div>
            </div>
            <Button variant="ghost" className="w-full h-12 mt-8 rounded-2xl font-bold bg-secondary/50 hover:bg-secondary text-foreground" onClick={() => setConverterOpen(false)}>
               إغلاق
            </Button>
         </SheetContent>
      </Sheet>

    </div>
  );
}
