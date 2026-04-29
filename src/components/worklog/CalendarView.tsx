import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, List, LayoutGrid, Activity, Clock, Briefcase, Plus, Palette, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, differenceInMinutes, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, subDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { toast } from 'sonner';

import { gregorianToHijri } from '../../lib/hijri';
import JobsShiftsView from './JobsShiftsView';
import { detectPermissionType } from '../../lib/smartAttendance';

export default function CalendarView() {
  const { sessions, jobs, shifts, shiftAssignments, toggleShiftAssignment, settings, deleteSession, logSpecialSession, addSession } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [customEntryData, setCustomEntryData] = useState({
    type: 'salary' as any, // 'salary', 'annual_leave', 'sick_leave', 'casual_leave', 'permission', 'half_day_leave', 'compensation', 'rest_day_work'
    startTime: '09:00',
    endTime: '17:00',
    jobId: 'none',
  });
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [selectedPaintShiftId, setSelectedPaintShiftId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'monthly' | 'weekly' | 'shifts'>('monthly');
  const [displayMode, setDisplayMode] = useState<'gregorian' | 'hijri'>('gregorian');
  
  const [converterOpen, setConverterOpen] = useState(false);
  const [converterDate, setConverterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Helper for custom entry form
  const handleCustomEntry = () => {
    const startStr = `${format(selectedDay, 'yyyy-MM-dd')}T${customEntryData.startTime}`;
    let endStr = `${format(selectedDay, 'yyyy-MM-dd')}T${customEntryData.endTime}`;
    if (customEntryData.endTime < customEntryData.startTime) {
       endStr = `${format(addDays(selectedDay, 1), 'yyyy-MM-dd')}T${customEntryData.endTime}`;
    }

    const isLeave = ['annual_leave', 'sick_leave', 'casual_leave', 'half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(customEntryData.type);
    
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
           additionalNotes = `إذن ذكي ${pType === 'entry' ? 'دخول متأخر' : 'خروج مبكر'} (${hours} ساعة/ساعات)`;
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
         dayStatus: finalType,
         breaks: 0,
         duration: duration,
         location: 'office',
         notes: additionalNotes
       });
    } else {
       const duration = differenceInMinutes(new Date(endStr), new Date(startStr));
       addSession({
         id: Date.now().toString(),
         type: customEntryData.jobId !== 'none' ? 'project' : 'salary',
         startTime: new Date(startStr).toISOString(),
         endTime: new Date(endStr).toISOString(),
         jobId: customEntryData.jobId === 'none' ? undefined : customEntryData.jobId,
         dayStatus: 'work',
         breaks: 0,
         duration: duration,
         location: 'office',
         notes: ''
       });
    }
    setSheetOpen(false); // Close sheet on save
    toast.success('تم التسجيل بنجاح');
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
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 6 }); // Start Saturday
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 6 });
    const days = eachDayOfInterval({ start, end });

    // Calculate month stats for the badges
    const monthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate));
    const workHours = monthSessions.filter(s => !s.dayStatus || ['work', 'rest_day_work', 'half_day_leave', 'permission'].includes(s.dayStatus as string)).reduce((acc, s) => acc + (s.duration || 0) / 60, 0);
    const overtimeHours = monthSessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0) / 60, 0);
    const restDaysWorked = monthSessions.filter(s => s.isRestDayWork).length;
    const comps = monthSessions.filter(s => s.dayStatus === 'compensation').length;
    const sickLeaves = monthSessions.filter(s => s.dayStatus === 'sick_leave').length;
    const annualLeaves = monthSessions.filter(s => ['annual_leave', 'casual_leave'].includes(s.dayStatus as string)).length;
    const permissionsCount = monthSessions.filter(s => ['permission', 'half_day_leave'].includes(s.dayStatus as string)).length;

    const weekDays = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];

    return (
      <div className="flex flex-col gap-4 mt-6">
        <h2 className="text-3xl font-black text-right px-2">سجل الحضور</h2>
        
        {/* Top Badges */}
        <div className="flex flex-wrap gap-2 justify-center px-2 py-4">
           {workHours > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">{workHours.toFixed(1)} س عمل</span> : null}
           {overtimeHours > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">{overtimeHours.toFixed(1)} س إضافي</span> : null}
           {restDaysWorked > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">{restDaysWorked} راحة</span> : null}
           {comps > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">{comps} بديلة</span> : null}
           {sickLeaves > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs">{sickLeaves} مرضي</span> : null}
           {annualLeaves > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs">{annualLeaves} سنوي</span> : null}
           {permissionsCount > 0 || true ? <span className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">{permissionsCount} الأذونات</span> : null}
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
                 ? format(currentDate, 'MMMM yyyy', { locale: ar }) 
                 : new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-10 w-10 py-0 rounded-full hover:bg-secondary active:scale-95 transition-transform text-foreground">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-4">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-sm font-bold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDay);
              
              const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
              const hasWork = daySessions.some(s => !s.dayStatus || s.dayStatus === 'work' || s.dayStatus === 'rest_day_work');
              const hasLeave = daySessions.some(s => ['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave'].includes(s.dayStatus as string));
              const hasPermission = daySessions.some(s => s.dayStatus === 'permission');
              
              // Handle Hijri display logic
              let hDayNum = 1;
              if (displayMode === 'hijri') {
                 try {
                   const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric', day: 'numeric' });
                   const hParts = hijriFormatter.formatToParts(day);
                   hDayNum = parseInt(hParts.find(p => p.type === 'day')?.value || '1');
                 } catch(e) {}
              }

              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[44px] flex flex-col items-center justify-start relative cursor-pointer group ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}`}
                  onClick={() => {
                     setSelectedDay(day);
                     setSheetOpen(true);
                  }}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full text-[15px] font-bold transition-all relative z-10
                    ${isSelected ? 'bg-primary text-primary-foreground' : 
                      isToday ? 'bg-secondary text-foreground' : 'text-foreground/90'}
                    ${daySessions.length > 0 && !isSelected && !isToday ? 'hover:bg-secondary/50' : 'hover:bg-secondary/30'}
                  `}>
                    {displayMode === 'gregorian' ? format(day, 'd') : hDayNum}
                  </div>
                  
                  {/* Indicator Dots */}
                  <div className="flex gap-1 mt-1 justify-center relative z-10 h-1.5 w-full">
                     {hasWork && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                     {hasLeave && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                     {hasPermission && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
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

  const renderDayDetails = () => {
    const daySessions = sessions
      .filter(s => isSameDay(new Date(s.startTime), selectedDay))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const totalMinutes = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalOvertime = daySessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);
    const overtimeHours = Math.floor(totalOvertime / 60);

    return (
      <div className="flex flex-col gap-6 mt-4">
        {/* Toggle buttons for day type */}
        <div className="bg-secondary/40 p-1 rounded-2xl flex relative overflow-hidden">
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'salary'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${customEntryData.type === 'salary' ? 'bg-emerald-700 text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             يوم عمل
           </button>
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'annual_leave'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${['annual_leave', 'sick_leave', 'casual_leave'].includes(customEntryData.type) ? 'bg-stone-300 dark:bg-stone-600 text-stone-900 dark:text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             في إجازة
           </button>
           <button 
             onClick={() => setCustomEntryData(d => ({...d, type: 'permission_1h'}))}
             className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl z-10 ${['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(customEntryData.type) ? 'bg-stone-300 dark:bg-stone-600 text-stone-900 dark:text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
           >
             <Clock className="inline w-4 h-4 mr-1" />
             إذن/نصف يوم
           </button>
        </div>

        {/* Dynamic form based on type */}
        <div className="flex flex-col gap-4">
          {['annual_leave', 'sick_leave', 'casual_leave'].includes(customEntryData.type) && (
             <div className="space-y-2">
               <Label className="text-muted-foreground font-bold">نوع الإجازة</Label>
               <div className="flex flex-wrap gap-2">
                 <Button 
                   variant={customEntryData.type === 'annual_leave' ? 'default' : 'secondary'}
                   className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'annual_leave' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'annual_leave'})}
                 >
                   اعتيادية
                 </Button>
                 <Button 
                   variant={customEntryData.type === 'sick_leave' ? 'default' : 'secondary'}
                   className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'sick_leave' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'sick_leave'})}
                 >
                   مرضية
                 </Button>
                 <Button 
                   variant={customEntryData.type === 'casual_leave' ? 'default' : 'secondary'}
                   className={`rounded-xl h-12 flex-1 font-bold ${customEntryData.type === 'casual_leave' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'casual_leave'})}
                 >
                   عارضة
                 </Button>
               </div>
             </div>
          )}

          {['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(customEntryData.type) && (
             <div className="space-y-2">
               <Label className="text-muted-foreground font-bold">نوع الإذن</Label>
               <div className="flex flex-wrap gap-2">
                 <Button 
                   variant={customEntryData.type === 'permission_1h' ? 'default' : 'secondary'}
                   className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'permission_1h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'permission_1h'})}
                 >
                   إذن ذكي (1 ساعة)
                 </Button>
                 <Button 
                   variant={customEntryData.type === 'permission_2h' ? 'default' : 'secondary'}
                   className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'permission_2h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'permission_2h'})}
                 >
                   إذن ذكي (ساعتين)
                 </Button>
                 <Button 
                   variant={customEntryData.type === 'half_day_leave' ? 'default' : 'secondary'}
                   className={`rounded-xl h-10 flex-1 font-bold ${customEntryData.type === 'half_day_leave' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, type: 'half_day_leave'})}
                 >
                   نصف يوم عمل
                 </Button>
               </div>
             </div>
          )}

          {customEntryData.type === 'salary' && settings.system === 'freelance' && (
             <div className="space-y-2">
               <Label className="text-muted-foreground font-bold flex items-center gap-1"><Briefcase className="w-4 h-4"/> العميل / المشروع</Label>
               <div className="flex flex-wrap gap-2">
                 <Button 
                   variant={customEntryData.jobId === 'none' ? 'default' : 'secondary'}
                   className={`rounded-xl h-10 font-bold ${customEntryData.jobId === 'none' ? 'bg-primary text-primary-foreground' : ''}`}
                   onClick={() => setCustomEntryData({...customEntryData, jobId: 'none'})}
                 >
                   بدون عميل (مرتب)
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

          {(!['annual_leave', 'sick_leave', 'casual_leave', 'permission_1h', 'permission_2h'].includes(customEntryData.type)) && (
            <>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>تسجيل دخول</Label>
                <Input 
                  type="time" 
                  value={customEntryData.startTime} 
                  onChange={e => setCustomEntryData({...customEntryData, startTime: e.target.value})}
                  className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>تسجيل خروج</Label>
                <Input 
                  type="time" 
                  value={customEntryData.endTime} 
                  onChange={e => setCustomEntryData({...customEntryData, endTime: e.target.value})}
                  className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg"
                />
              </div>
            </>
          )}

          <Button 
            className="w-full h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-lg mt-2 shadow-sm"
            onClick={handleCustomEntry}
          >
             تسجيل
          </Button>
        </div>

        {/* Separator / existing sessions */}
        {daySessions.length > 0 && (
           <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
                 <span>سجلات هذا اليوم</span>
                 <div className="flex gap-4">
                   <span>الإجمالي: <span className="text-emerald-500">{totalHours} س</span></span>
                   <span>إضافي: <span className="text-orange-500">{overtimeHours} س</span></span>
                 </div>
              </div>
              
              <div className="flex flex-col gap-2">
                 {daySessions.map(sess => {
                    let typeLabel = 'يوم عمل';
                    if (sess.dayStatus === 'annual_leave') typeLabel = 'إجازة اعتيادية';
                    if (sess.dayStatus === 'sick_leave') typeLabel = 'إجازة مرضية';
                    if (sess.dayStatus === 'casual_leave') typeLabel = 'إجازة عارضة';
                    if (sess.dayStatus === 'half_day_leave') typeLabel = 'نصف يوم';
                    if (sess.dayStatus === 'permission') typeLabel = 'إذن';
                    if (sess.type === 'project') typeLabel = 'مشروع/عميل';

                    return (
                       <div key={sess.id} className="flex justify-between items-center bg-card border border-border/50 p-3 rounded-xl shadow-sm">
                          <div>
                             <span className="font-bold text-sm block">{typeLabel}</span>
                             {sess.endTime ? (
                               <span className="text-xs text-muted-foreground font-mono">{format(new Date(sess.startTime), 'HH:mm')} - {format(new Date(sess.endTime), 'HH:mm')}</span>
                             ) : (
                               <span className="text-xs text-muted-foreground">طوال اليوم</span>
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
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full pb-20" >
      
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
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[95vh] overflow-y-auto z-[100] p-4 pb-20">
           <SheetHeader className="pb-2">
             <SheetTitle className="text-2xl font-black text-right mb-1">
                تعديل السجل
             </SheetTitle>
             <div className="text-xs text-muted-foreground font-bold text-right flex gap-1 items-center justify-end">
                <span>{new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDay)}</span>
                <span className="w-1 h-1 rounded-full bg-border inline-block" />
                <span>{format(selectedDay, 'EEEE، d MMMM yyyy', { locale: ar })}</span>
                <CalendarIcon className="w-3 h-3 text-primary ml-1" />
             </div>
           </SheetHeader>
           {renderDayDetails()}
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
            <div className="flex flex-col gap-6" >
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
