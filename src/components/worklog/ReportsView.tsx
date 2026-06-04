import { ar, enUS } from 'date-fns/locale';
import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Download, TrendingUp, Clock, Palmtree, History, Filter, Edit2, Trash2, ChevronDown, ChevronUp, Briefcase, Calendar, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, endOfWeek, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

import { useLanguage } from '../../contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { formatMinutesToHHMM } from '../../lib/utils';
import { UnifiedEntrySheet } from './UnifiedEntrySheet';

export default function ReportsView() {
  const { t, lang } = useLanguage();
  const { sessions, deleteSession, updateSession, settings, getBalances } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveFilter, setLeaveFilter] = useState('all');
  
  // Chart Controls
  const [chartGrouping, setChartGrouping] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showHours, setShowHours] = useState(true);
  const [showOvertime, setShowOvertime] = useState(true);

  // Filtering for currently selected Month
  const currentMonthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate) && !s.isArchived);

  // Calculate Metrics
  const totalHours = currentMonthSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const totalOvertime = currentMonthSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
  
  const permissionsCount = currentMonthSessions.filter(s => s.dayStatus === 'permission').length;
  const annualLeaveDays = currentMonthSessions.filter(s => s.dayStatus === 'annual_leave').length;
  const sickLeaveDays = currentMonthSessions.filter(s => s.dayStatus === 'sick_leave').length;
  const compensationDays = currentMonthSessions.filter(s => s.dayStatus === 'compensation').length;
  const restDays = currentMonthSessions.filter(s => s.isRestDayWork === false && s.duration === 0 && s.dayStatus === undefined).length; 
  
  // Aggregate data for BarChart
  const chartData = useMemo(() => {
    if (chartGrouping === 'daily') {
       const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
       return daysInMonth.map(day => {
          const daySessions = currentMonthSessions.filter(s => new Date(s.startTime).toDateString() === day.toDateString());
          let hours = 0;
          let overtime = 0;
          daySessions.forEach(s => { 
             hours += (s.duration || 0) / 60; 
             overtime += (s.overtimeMinutes || 0) / 60;
          });
          return {
             label: format(day, 'd'),
             dateStr: format(day, 'dd/MM/yyyy'),
             ساعات_العمل: Number(hours.toFixed(2)),
             وقت_إضافي: Number(overtime.toFixed(2)),
          }
       });
    } else if (chartGrouping === 'weekly') {
       const weeksInMonth = eachWeekOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }, { weekStartsOn: 6 });
       return weeksInMonth.map((weekStart, idx) => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
          const weekSessions = currentMonthSessions.filter(s => {
             const sd = new Date(s.startTime);
             return sd >= weekStart && sd <= weekEnd;
          });
          let hours = 0;
          let overtime = 0;
          weekSessions.forEach(s => { 
             hours += (s.duration || 0) / 60; 
             overtime += (s.overtimeMinutes || 0) / 60;
          });
          return {
             label: `أسبوع ${idx + 1}`,
             dateStr: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`,
             ساعات_العمل: Number(hours.toFixed(2)),
             وقت_إضافي: Number(overtime.toFixed(2)),
          }
       });
    } else {
       const monthsInYear = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
       const yearSessions = sessions.filter(s => new Date(s.startTime).getFullYear() === currentDate.getFullYear() && !s.isArchived);
       return monthsInYear.map((monthStart) => {
          const monthSessions = yearSessions.filter(s => isSameMonth(new Date(s.startTime), monthStart));
          let hours = 0;
          let overtime = 0;
          monthSessions.forEach(s => { 
             hours += (s.duration || 0) / 60; 
             overtime += (s.overtimeMinutes || 0) / 60;
          });
          return {
             label: format(monthStart, 'MMM', { locale: lang === 'ar' ? ar : enUS }),
             dateStr: format(monthStart, 'MMMM yyyy', { locale: lang === 'ar' ? ar : enUS }),
             ساعات_العمل: Number(hours.toFixed(2)),
             وقت_إضافي: Number(overtime.toFixed(2)),
          }
       });
    }
  }, [currentDate, currentMonthSessions, sessions, chartGrouping]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Duration (Mins)', 'Overtime (Mins)', 'Status', 'Notes'];
    const rows = currentMonthSessions.map(s => [
      format(new Date(s.startTime), 'yyyy-MM-dd'),
      format(new Date(s.startTime), 'HH:mm'),
      s.endTime ? format(new Date(s.endTime), 'HH:mm') : 'N/A',
      s.duration || 0,
      s.overtimeMinutes || 0,
      s.dayStatus || 'regular',
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `worklog_report_${format(currentDate, 'MMM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- History State & Handlers ---
  const [editingSession, setEditingSession] = useState<any>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);
  
  const filteredSessions = useMemo(() => {
    let filtered = currentMonthSessions;
    if (filterType !== 'all') {
       if (filterType === 'regular') filtered = filtered.filter(s => s.dayStatus === 'work');
       else filtered = filtered.filter(s => s.dayStatus === filterType);
    }
    if (searchQuery.trim() !== '') {
      const qs = searchQuery.toLowerCase();
      filtered = filtered.filter(s => (s.notes && s.notes.toLowerCase().includes(qs)) || (format(new Date(s.startTime), 'yyyy-MM-dd').includes(qs)));
    }
    return filtered.reverse();
  }, [currentMonthSessions, filterType, searchQuery]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, typeof filteredSessions> = {};
    filteredSessions.forEach(s => {
       const gDate = format(new Date(s.startTime), 'yyyy-MM-dd');
       if (!groups[gDate]) groups[gDate] = [];
       groups[gDate].push(s);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredSessions]);

  const handleEditSave = () => {
    if (editingSession) {
      updateSession(editingSession.id, editingSession);
      setEditingSession(null);
    }
  };

  const confirmDelete = () => {
    if (deletingSessionId) {
      deleteSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir="rtl">
      
      {/* Header */}
      <header className="flex justify-between items-center px-1 mb-2">
         <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight">{t('rep.log')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('rep.current_month_analytics')}</p>
         </div>
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
               &lt;
            </Button>
            <Button variant="secondary" className="rounded-xl bg-primary/10 text-primary font-bold px-4 h-9 border border-primary/20 text-xs" onClick={() => setCurrentDate(new Date())}>
              {format(currentDate, 'MMM yyyy', { locale: lang === 'ar' ? ar : enUS })}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
               &gt;
            </Button>
         </div>
      </header>

      <Tabs defaultValue="history" className="w-full">
         <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-secondary/30 h-12 border border-white/5 mb-4">
           <TabsTrigger value="history" className="rounded-xl font-bold h-10">{t('rep.attendance_log')}</TabsTrigger>
           <TabsTrigger value="charts" className="rounded-xl font-bold h-10">{t('rep.analytics')}</TabsTrigger>
           <TabsTrigger value="compensations" className="rounded-xl font-bold h-10">{t('cal.leaves') || 'الإجازات'}</TabsTrigger>
         </TabsList>

         <TabsContent value="charts" className="flex flex-col gap-4 mt-0 border-none p-0 outline-none">
            {/* Top 2 Cards (Totals) */}
            <div className="grid grid-cols-2 gap-3">
               <Card className="rounded-[1.5rem] bg-card/60 backdrop-blur-md border border-white/5 p-4 flex items-center justify-between shadow-sm">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <TrendingUp className="w-4 h-4" />
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-foreground">{t('rep.total')}</span>
                   <span className="text-sm font-bold text-primary">{totalHours.toFixed(1)} {t('t_auto_9')}</span>
                 </div>
               </Card>
               
               <Card className="rounded-[1.5rem] bg-card/60 backdrop-blur-md border border-white/5 p-4 flex items-center justify-between shadow-sm">
                 <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                   <TrendingUp className="w-4 h-4" />
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-emerald-500">{t('rep.overtime')}</span>
                   <span className="text-sm font-bold text-emerald-500">{totalOvertime.toFixed(1)} {t('t_auto_9')}</span>
                 </div>
               </Card>
            </div>

            {/* Grid of 4 specific metrics */}
            <div className="grid grid-cols-2 gap-3">
               <Card className="rounded-[1.2rem] bg-card/40 border-white/5 p-3 flex items-center justify-between">
                 <div className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground"><Clock className="w-3.5 h-3.5" /></div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground">{t('rep.permissions')}</span>
                   <span className="text-xs font-bold">{permissionsCount} {t('cal.permission')}</span>
                 </div>
               </Card>
               <Card className="rounded-[1.2rem] bg-card/40 border-white/5 p-3 flex items-center justify-between">
                 <div className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground"><Palmtree className="w-3.5 h-3.5" /></div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground">{t('rep.rest')}</span>
                   <span className="text-xs font-bold">{restDays} {t('rep.day')}</span>
                 </div>
               </Card>
               <Card className="rounded-[1.2rem] bg-card/40 border-white/5 p-3 flex items-center justify-between">
                 <div className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground"><Palmtree className="w-3.5 h-3.5" /></div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground">{t('rep.sick')}</span>
                   <span className="text-xs font-bold">{sickLeaveDays} {t('rep.day')}</span>
                 </div>
               </Card>
               <Card className="rounded-[1.2rem] bg-card/40 border-white/5 p-3 flex items-center justify-between">
                 <div className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground"><Palmtree className="w-3.5 h-3.5" /></div>
                 <div className="flex flex-col items-end">
                   <span className="text-[10px] text-muted-foreground">{t('t_auto_452')}</span>
                   <span className="text-xs font-bold">{annualLeaveDays} {t('rep.day')}</span>
                 </div>
               </Card>
            </div>

            {/* Chart Section */}
            <Card className="rounded-[2rem] bg-card/60 backdrop-blur-md border border-white/5 p-5 flex flex-col min-h-[350px] shadow-sm">
               <div className="flex flex-col items-start justify-between mb-4 gap-3">
                  <h3 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                     {t('rep.work_hours_chart')}
                                                </h3>
                  
                  {/* Chart Options */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/20 p-1.5 rounded-[1rem] w-full">
                     <div className="flex bg-card/80 p-0.5 rounded-lg border border-white/5 shadow-sm">
                        <Button variant={chartGrouping === 'daily' ? 'default' : 'ghost'} size="sm" className="rounded-md h-7 px-2 text-[10px]" onClick={() => setChartGrouping('daily')}>{t('rep.daily')}</Button>
                        <Button variant={chartGrouping === 'weekly' ? 'default' : 'ghost'} size="sm" className="rounded-md h-7 px-2 text-[10px]" onClick={() => setChartGrouping('weekly')}>{t('rep.weekly')}</Button>
                        <Button variant={chartGrouping === 'monthly' ? 'default' : 'ghost'} size="sm" className="rounded-md h-7 px-2 text-[10px]" onClick={() => setChartGrouping('monthly')}>{t('rep.monthly')}</Button>
                     </div>
                     <div className="flex gap-2.5 px-2">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                           <input type="checkbox" checked={showHours} onChange={e => setShowHours(e.target.checked)} className="rounded text-primary focus:ring-primary w-3 h-3" />
                           {t('rep.attendance')}
                                                              </label>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                           <input type="checkbox" checked={showOvertime} onChange={e => setShowOvertime(e.target.checked)} className="rounded text-emerald-500 focus:ring-emerald-500 w-3 h-3" />
                           {t('cal.overtime')}
                                                              </label>
                     </div>
                  </div>
               </div>
               
               <div className="flex-1 w-full relative" dir="ltr">
                  <ResponsiveContainer width="100%" height={260}>
                     <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                       <XAxis dataKey="label" tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} dy={10} />
                       <YAxis tick={{fontSize: 9, fill: '#6b7280'}} axisLine={false} tickLine={false} dx={-10} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#f3f4f6', fontSize: '11px' }}
                         itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                         labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                         cursor={{fill: 'rgba(255,255,255,0.05)'}}
                         formatter={(value: any, name: any) => [`${value} س`, name]}
                         labelFormatter={(label, payload) => payload?.[0]?.payload?.dateStr || label}
                       />
                       {showHours && <Bar dataKey={t('t_auto_453')} name={t('rep.work')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />}
                       {showOvertime && <Bar dataKey={t('t_auto_454')} name={t('rep.overtime')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />}
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </Card>

            <Button variant="outline" className="h-12 rounded-2xl w-full gap-2 border-primary/20 text-primary shadow-sm mt-1" onClick={handleExportCSV}>
               <Download className="w-4 h-4" />
               {t('t_auto_455')}
                                  </Button>
         </TabsContent>

         <TabsContent value="history" className="flex flex-col gap-4 mt-0 border-none p-0 outline-none">
            <div className="flex flex-col md:flex-row gap-2 w-full mt-1 shrink-0">
               <div className="flex bg-card/60 backdrop-blur-md rounded-2xl p-1.5 border border-white/5 shadow-sm">
                  <Input 
                    type="text" 
                    placeholder={t('t_auto_456')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 bg-transparent border-none text-xs focus-visible:ring-0 px-2"
                  />
               </div>
               <Select value={filterType} onValueChange={setFilterType}>
                 <SelectTrigger className="w-full md:w-[130px] h-11 bg-card/60 backdrop-blur-md border border-white/5 rounded-2xl text-xs font-bold shadow-sm" dir="rtl">
                   <Filter className="w-3.5 h-3.5 ml-1.5" />
                   <SelectValue placeholder={t('t_auto_457')} />
                 </SelectTrigger>
                 <SelectContent dir="rtl" className="text-xs">
                   <SelectItem value="all">{t('rep.all')}</SelectItem>
                   <SelectItem value="regular">{t('rep.regular_work')}</SelectItem>
                   <SelectItem value="permission">{t('rep.permissions')}</SelectItem>
                   <SelectItem value="annual_leave">{t('rep.leave')}</SelectItem>
                   <SelectItem value="rest_day_work">{t('rep.overtime_and_rest')}</SelectItem>
                 </SelectContent>
               </Select>
            </div>

            <div className="flex flex-col gap-3 mt-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                              {groupedSessions.map(([gDate, daySessions]) => {
                  const sDate = new Date(daySessions[0].startTime);
                  const isExpanded = expandedDate === gDate;
                  const hour = sDate.getHours();
                  
                  // Base theme by time
                  let theme = { bg: 'bg-slate-700', text: 'text-slate-100', textDark: 'text-slate-400', bgSoft: 'bg-slate-700/10', border: 'border-slate-700/30' };
                  if (hour >= 5 && hour < 12) theme = { bg: 'bg-amber-500', text: 'text-amber-50', textDark: 'text-amber-500', bgSoft: 'bg-amber-500/10', border: 'border-amber-500/30' };
                  else if (hour >= 12 && hour < 17) theme = { bg: 'bg-blue-500', text: 'text-blue-50', textDark: 'text-blue-500', bgSoft: 'bg-blue-500/10', border: 'border-blue-500/30' };
                  else if (hour >= 17 && hour < 20) theme = { bg: 'bg-purple-500', text: 'text-purple-50', textDark: 'text-purple-500', bgSoft: 'bg-purple-500/10', border: 'border-purple-500/30' };

                  // Find primary status of the day to show on the collapsed card & adjust theme
                  let mainStatus = 'عمل اعتيادي';
                  const leaveSession = daySessions.find(s => s.dayStatus?.includes('leave') || s.dayStatus === 'rest_day_work' || s.dayStatus === 'compensation');
                  
                  if (leaveSession) {
                     if (leaveSession.dayStatus === 'rest_day_work') {
                        const compType = leaveSession.restDayCompensation || '1_day';
                        if (compType === '1_day_plus_overtime') {
                           mainStatus = 'عمل في يوم راحة (بديلة ووقت إضافي)';
                        } else if (compType === '2_days') {
                           mainStatus = 'عمل في يوم راحة (بديلة بيومين)';
                        } else {
                           mainStatus = 'عمل في يوم راحة (بديلة)';
                        }
                     } else if (leaveSession.dayStatus === 'compensation') {
                        mainStatus = 'استهلاك بديلة';
                        theme = { bg: 'bg-orange-500', text: 'text-orange-50', textDark: 'text-orange-600', bgSoft: 'bg-orange-500/10', border: 'border-orange-500/30' };
                     } else if (leaveSession.dayStatus === 'annual_leave') {
                        mainStatus = 'إجازة سنوية / اعتيادية';
                        theme = { bg: 'bg-indigo-500', text: 'text-indigo-50', textDark: 'text-indigo-500', bgSoft: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
                     } else if (leaveSession.dayStatus === 'sick_leave') {
                        mainStatus = 'إجازة مرضية';
                        theme = { bg: 'bg-red-500', text: 'text-red-50', textDark: 'text-red-500', bgSoft: 'bg-red-500/10', border: 'border-red-500/30' };
                     } else if (leaveSession.dayStatus === 'casual_leave') {
                        mainStatus = 'إجازة عارضة';
                     } else if (leaveSession.dayStatus === 'half_day_leave') {
                        mainStatus = 'إجازة نصف يوم';
                     } else {
                        mainStatus = 'إجازة';
                     }
                  } else if (daySessions.some(s => s.dayStatus === 'permission')) {
                     mainStatus = 'تصريح';
                     // If it's just a permission but they worked the rest of the day, we keep the original time theme, 
                     // or we can append it.
                     const workSession = daySessions.find(s => s.dayStatus === 'work');
                     if (workSession) mainStatus = 'عمل + تصريح';
                  }

                  const totalHours = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
                  
                  return (
                     <div key={gDate} className={`rounded-2xl transition-all overflow-hidden border ${isExpanded ? 'shadow-md border-border/80' : 'shadow-none border-border/40 hover:border-border/60'}`}>
                        {/* Card Header (Collapsed view) */}
                        <div 
                           className={`${theme.bgSoft} p-3 sm:p-4 flex items-center justify-between cursor-pointer`}
                           onClick={() => setExpandedDate(isExpanded ? null : gDate)}
                        >
                           <div className="flex items-center gap-3 w-full">
                              <div className={`${theme.bg} ${theme.text} w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 shadow-sm`}>
                                 <span className="text-sm leading-none">{format(sDate, 'dd')}</span>
                                 <span className="text-[9px] font-medium leading-tight opacity-90">{format(sDate, 'E', { locale: lang === 'ar' ? ar : enUS })}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                 <div className="flex items-center justify-between gap-2 overflow-hidden w-full">
                                     <span className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                                        {format(sDate, 'MMMM yyyy', { locale: lang === 'ar' ? ar : enUS })}
                                     </span>
                                     <span className={`${theme.textDark} text-[10px] bg-background/50 px-2 py-0.5 rounded-full font-bold ml-auto shrink-0 max-w-[120px] truncate text-center`}>{mainStatus}</span>
                                 </div>
                                 <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {format(sDate, 'hh:mm a')}
                                    {totalHours > 0 && <span>• {formatMinutesToHHMM(totalHours)} {t('t_auto_9')}</span>}
                                 </span>
                              </div>
                           </div>
                           <div className={`ml-3 sm:ml-4 p-1.5 rounded-full ${theme.bgSoft} ${theme.textDark} shrink-0`}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </div>
                        </div>

                        {/* Card Content (Expanded view) */}
                        {isExpanded && (
                           <div className="bg-card p-3 sm:p-4 border-t border-border/50 flex flex-col gap-3">
                              {daySessions.map((session, idx) => {
                                 let sessionLabel = 'عمل اعتيادي'; 
                                 if (session.dayStatus === 'rest_day_work') {
                                    const compType = session.restDayCompensation || '1_day';
                                    if (compType === '1_day_plus_overtime') {
                                       sessionLabel = 'عمل في يوم راحة (بديلة ووقت إضافي)';
                                    } else if (compType === '2_days') {
                                       sessionLabel = 'عمل في يوم راحة (بديلة بيومين)';
                                    } else {
                                       sessionLabel = 'عمل في يوم راحة (بديلة)';
                                    }
                                 }
                                 else if (session.dayStatus === 'annual_leave') sessionLabel = 'إجازة سنوية';
                                 else if (session.dayStatus === 'sick_leave') sessionLabel = 'إجازة مرضية';
                                 else if (session.dayStatus === 'casual_leave') sessionLabel = 'إجازة عارضة';
                                 else if (session.dayStatus === 'half_day_leave') sessionLabel = 'نصف يوم عمل / إجازة نصف يوم';
                                 else if (session.dayStatus === 'compensation') sessionLabel = 'استهلاك بديلة';
                                 else if (session.dayStatus === 'permission') sessionLabel = 'تصريح';
                                 else if (session.dayStatus === 'public_holiday') sessionLabel = 'عطلة رسمية';
                                 else if (session.dayStatus === 'absent') sessionLabel = 'غياب';
                                 else if (session.dayStatus === 'late') sessionLabel = 'تأخير';

                                 const hasNotes = session.notes && session.notes.trim().length > 0;
                                 const overtimeHours = session.overtimeMinutes ? Math.floor(session.overtimeMinutes / 60) : 0;

                                 return (
                                    <div key={session.id} className={`flex flex-col gap-2 p-3 bg-secondary/20 rounded-xl ${idx > 0 ? 'border-t border-border/40 mt-1' : ''}`}>
                                       <div className="flex items-start justify-between">
                                          <div className="flex flex-col gap-1">
                                             <span className="text-xs font-bold flex items-center gap-1.5">
                                                {sessionLabel}
                                                {session.dayStatus === 'rest_day_work' && <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded-full">{t('home.comp_earned')}</span>}
                                             </span>
                                             <span className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                                                {format(new Date(session.startTime), 'hh:mm a')} 
                                                {session.endTime ? ` - ${format(new Date(session.endTime), 'hh:mm a')}` : ` - ${t('rep.now')}`}
                                             </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                             {session.duration !== undefined && session.duration > 0 && (
                                                <div className="flex flex-col items-end">
                                                   <span className="text-xs font-black text-primary leading-tight">{Math.floor(session.duration/60)} {t('t_auto_9')}</span>
                                                   {overtimeHours > 0 && <span className="text-[9px] font-bold text-emerald-500">+{overtimeHours} {t('t_auto_9')}</span>}
                                                </div>
                                             )}
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 ml-1" onClick={(e) => { e.stopPropagation(); setEditingSession(session); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                                          </div>
                                       </div>
                                       
                                       {hasNotes && (
                                          <div className="text-[11px] text-muted-foreground bg-background/50 p-2 rounded-lg mt-1 border border-border/30">
                                             <span className="font-bold block mb-0.5 border-b border-border/40 pb-0.5">{t('rep.note')}:</span>
                                             {session.notes}
                                          </div>
                                       )}
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  );
               })}
               
               {groupedSessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 bg-card/40 border border-dashed border-white/10 rounded-2xl opacity-60 mt-4">
                     <History className="w-8 h-8 opacity-40 mb-2" />
                     <p className="text-xs">{t('t_auto_459')}</p>
                  </div>
               )}
            </div>
         </TabsContent>
         <TabsContent value="compensations" className="flex flex-col gap-4 mt-0 border-none p-0 outline-none">
            {(() => {
               // Calculate balances
               const balances = getBalances();
               // Get all relevant sessions
               const actualSessions = sessions.filter(s => 
                 !s.isArchived && 
                 (s.isRestDayWork || ['annual_leave', 'sick_leave', 'casual_leave', 'half_day_leave', 'permission', 'permission_1h', 'permission_2h', 'compensation', 'rest_day_work'].includes(s.dayStatus!))
               );

               const allLoggedDays = new Set(sessions.filter(s => !s.isArchived).map(s => format(new Date(s.startTime), 'yyyy-MM-dd')));
               
               // Inject auto-holidays/rest days for the last 60 days
               const virtualSessions: any[] = [];
               const now = new Date();
               for (let i = 1; i <= 60; i++) {
                 const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Past days
                 const dString = format(d, 'yyyy-MM-dd');
                 if (!allLoggedDays.has(dString)) {
                   const isPublic = settings.customHolidays?.find(h => h.date === dString);
                   const isRest = (settings.restDays || []).includes(d.getDay());
                   if (isPublic || isRest) {
                     virtualSessions.push({
                       id: `virtual-${dString}`,
                       startTime: d.toISOString(),
                       endTime: d.toISOString(),
                       duration: 0,
                       dayStatus: isPublic ? 'public_holiday' : 'rest_day_virtual',
                       notes: isPublic ? isPublic.name : 'يوم راحة أسبوعية مر دون تسجيل أي بيانات',
                       isVirtual: true
                     });
                   }
                 }
               }

               const allRelevant = [...actualSessions, ...virtualSessions]
                  .sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
               
               const filteredSessions = allRelevant.filter(s => {
                  if (leaveFilter === 'all') return true;
                  if (leaveFilter === 'annual') return s.dayStatus === 'annual_leave' || s.dayStatus === 'half_day_leave';
                  if (leaveFilter === 'sick_casual') return s.dayStatus === 'sick_leave' || s.dayStatus === 'casual_leave';
                  if (leaveFilter === 'permissions') return s.dayStatus?.startsWith('permission');
                  if (leaveFilter === 'compensations') return s.isRestDayWork || s.dayStatus === 'rest_day_work' || s.dayStatus === 'compensation';
                  if (leaveFilter === 'public_holiday') return s.dayStatus === 'public_holiday';
                  return true;
               });

               return (
                  <div className="flex flex-col gap-4">
                     {/* Balances Dashboard */}
                     <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-card border border-white/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />
                           <span className="text-xs text-muted-foreground font-bold mb-1 z-10">{t('settings.auto.72') || 'الإجازات السنوية'}</span>
                           <div className="flex items-end gap-1 z-10">
                              <span className="text-2xl font-black text-blue-500">{balances.remainingAnnualLeaves}</span>
                              <span className="text-xs text-muted-foreground mb-1 font-medium">/ {settings.annualLeaves || 21} يوم</span>
                           </div>
                        </div>
                        <div className="bg-card border border-white/5 rounded-2xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl" />
                           <span className="text-xs text-muted-foreground font-bold mb-1 z-10">{t('home.permission') || 'التصاريح'}</span>
                           <div className="flex items-end gap-1 z-10">
                              <span className="text-2xl font-black text-purple-500">{balances.remainingPermissionsHours}</span>
                              <span className="text-xs text-muted-foreground mb-1 font-medium">/ {settings.monthlyPermissions || 4} ساعة (للشهر الحالي)</span>
                           </div>
                        </div>
                     </div>

                     {/* Filters */}
                     <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        <Button variant={leaveFilter === 'all' ? 'default' : 'outline'} className={`rounded-xl h-9 text-xs shrink-0 ${leaveFilter === 'all' ? '' : 'bg-card/50'}`} onClick={() => setLeaveFilter('all')}>{t('t_auto_4') || 'الكل'}</Button>
                        <Button variant={leaveFilter === 'annual' ? 'default' : 'outline'} className={`rounded-xl h-9 text-xs shrink-0 border-blue-500/20 ${leaveFilter === 'annual' ? 'bg-blue-500 hover:bg-blue-600' : 'text-blue-500 hover:bg-blue-500/10'}`} onClick={() => setLeaveFilter('annual')}>{t('cal.annual') || 'اعتيادي'}</Button>
                        <Button variant={leaveFilter === 'sick_casual' ? 'default' : 'outline'} className={`rounded-xl h-9 text-xs shrink-0 border-red-500/20 ${leaveFilter === 'sick_casual' ? 'bg-red-500 hover:bg-red-600' : 'text-red-500 hover:bg-red-500/10'}`} onClick={() => setLeaveFilter('sick_casual')}>{t('cal.sick') || 'مرضي'} / {t('cal.casual') || 'عارضة'}</Button>
                        <Button variant={leaveFilter === 'permissions' ? 'default' : 'outline'} className={`rounded-xl h-9 text-xs shrink-0 border-purple-500/20 ${leaveFilter === 'permissions' ? 'bg-purple-500 hover:bg-purple-600' : 'text-purple-500 hover:bg-purple-500/10'}`} onClick={() => setLeaveFilter('permissions')}>{t('home.permission') || 'تصريح'}</Button>
                        <Button variant={leaveFilter === 'compensations' ? 'default' : 'outline'} className={`rounded-xl h-9 text-xs shrink-0 border-emerald-500/20 ${leaveFilter === 'compensations' ? 'bg-emerald-500 hover:bg-emerald-600' : 'text-emerald-500 hover:bg-emerald-500/10'}`} onClick={() => setLeaveFilter('compensations')}>{t('t_auto_454') || 'بديلة'}</Button>
                     </div>

                     <div className="space-y-4">
                        {filteredSessions.length === 0 && (
                           <div className="flex flex-col items-center justify-center p-8 bg-card/40 border border-dashed border-white/10 rounded-2xl opacity-60 mt-4">
                              <Palmtree className="w-8 h-8 opacity-40 mb-2" />
                              <p className="text-xs">{t('t_auto_428') || 'لا توجد بيانات ليتم عرضها'}</p>
                           </div>
                        )}
                        {filteredSessions.map(sess => {
                        const isEarnedComp = sess.isRestDayWork || sess.dayStatus === 'rest_day_work';
                        const isCompensationConsumed = sess.dayStatus === 'compensation';
                        const isOtherLeave = ['annual_leave', 'sick_leave', 'casual_leave'].includes(sess.dayStatus || '');
                        
                        let cardColor = 'border-white/5 bg-card';
                        let icon = <Palmtree className="w-4 h-4" />;
                        let title = t('cal.on_leave') || 'إجازة';

                        if (isEarnedComp) {
                           cardColor = 'border-emerald-500/20 bg-emerald-500/5';
                           icon = <Briefcase className="w-4 h-4 text-emerald-500" />;
                           const compType = sess.restDayCompensation || '1_day';
                           if (compType === '1_day_plus_overtime') {
                              title = lang === 'ar' ? 'بديلة ووقت إضافي' : 'Substitute & Overtime';
                           } else if (compType === '2_days') {
                              title = lang === 'ar' ? 'بديلة بيومين' : '2 Days Substitute';
                           } else {
                              title = lang === 'ar' ? 'بديلة' : 'Substitute Day';
                           }
                        } else if (isCompensationConsumed) {
                           cardColor = 'border-orange-500/20 bg-orange-500/5';
                           icon = <Calendar className="w-4 h-4 text-orange-500" />;
                           title = t('cal.alternative_leave') || 'أخذت كتعويض (يوم بديل)';
                        } else if (sess.dayStatus === 'annual_leave') {
                           cardColor = 'border-blue-500/20 bg-blue-500/5';
                           icon = <Palmtree className="w-4 h-4 text-blue-500" />;
                           title = t('cal.annual') || 'اعتيادي';
                        } else if (sess.dayStatus === 'sick_leave') {
                           cardColor = 'border-red-500/20 bg-red-500/5';
                           icon = <Activity className="w-4 h-4 text-red-500" />;
                           title = t('cal.sick') || 'مرضي';
                        } else if (sess.dayStatus === 'casual_leave') {
                           cardColor = 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10';
                           icon = <Palmtree className="w-4 h-4 text-amber-500" />;
                           title = t('cal.casual') || 'عارضة';
                        } else if (sess.dayStatus === 'half_day_leave') {
                           cardColor = 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10';
                           icon = <Palmtree className="w-4 h-4 text-purple-500" />;
                           title = t('home.half_day_leave') || 'نصف يوم';
                        }

                        const isExpanded = expandedLeaveId === sess.id;
                        
                        return (
                           <div key={sess.id} className={`rounded-2xl transition-all overflow-hidden border ${isExpanded ? 'shadow-md border-border/80' : 'shadow-none border-border/40 hover:border-border/60'} bg-card`}>
                              <div 
                                 className={`p-3 sm:p-4 flex items-center justify-between cursor-pointer ${cardColor.replace('bg-card', '')}`}
                                 onClick={() => setExpandedLeaveId(isExpanded ? null : sess.id)}
                              >
                                 <div className="flex items-center gap-3 w-full">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm bg-background border border-white/5`}>
                                       {icon}
                                    </div>
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 overflow-hidden w-full">
                                            <span className="font-bold text-sm flex items-center gap-2 truncate">
                                               {title}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                           <Calendar className="w-3 h-3 shrink-0" />
                                           {format(new Date(sess.startTime), 'EEEE, dd MMMM yyyy', { locale: lang === 'ar' ? ar : enUS })}
                                        </span>
                                    </div>
                                 </div>
                                 <div className="ml-3 sm:ml-4 p-1.5 rounded-full bg-background/50 text-muted-foreground shrink-0 border border-white/5">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                 </div>
                              </div>
                              
                              {isExpanded && (
                                 <div className="bg-card p-3 sm:p-4 border-t border-border/50 flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                       <div className="flex flex-wrap gap-2 text-xs">
                                         {sess.duration !== undefined && sess.duration > 0 && (
                                           <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">{Math.floor(sess.duration/60)} {t('t_auto_9')}</span>
                                         )}
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 mx-1" onClick={(e) => { e.stopPropagation(); setEditingSession(sess); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setDeletingSessionId(sess.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                                       </div>
                                    </div>

                                    {/* If string notes exist */}
                                    {sess.notes && (
                                      <p className="text-xs text-foreground/80 bg-background/50 p-2 rounded-xl border border-border/50">{sess.notes}</p>
                                    )}

                                    {/* Earned Comp Specifics: Show details of compensation items linked to it */}
                                    {isEarnedComp && (() => {
                                       const compType = sess.restDayCompensation || '1_day';
                                       let accrued = 0;
                                       if (compType === '1_day' || compType === '1_day_plus_overtime') accrued = 1;
                                       else if (compType === '2_days') accrued = 2;
                                       
                                       const takenSessions = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === sess.id && !t.isArchived);
                                       const taken = takenSessions.length;
                                       const available = accrued - taken;
                                       
                                       const validityDays = settings.compensationValidityDays || 30;
                                       const daysSinceEarned = (new Date().getTime() - new Date(sess.startTime).getTime()) / (1000 * 60 * 60 * 24);
                                       const isExpired = daysSinceEarned > validityDays && !sess.compensationException;

                                       return (
                                          <div className="pt-3 border-t border-border/50 mt-2">
                                             <div className="flex gap-4 text-xs mb-3">
                                               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>{t('rep.earned')}: <b>{accrued}</b></span>
                                               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500/50"></span>{t('rep.taken')}: <b>{taken}</b></span>
                                               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/50"></span>{t('rep.available')}: <b>{available}</b></span>
                                             </div>
                                             
                                             {isExpired && available > 0 && (
                                                <div className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded-md inline-block mb-2">
                                                   {t('rep.expired')}
                                                </div>
                                             )}

                                             {taken > 0 && (
                                                <div className="bg-background/80 rounded-2xl p-3 border border-white/5 space-y-2 mt-2">
                                                   <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('t_auto_455') || 'الأيام التي تم أخذها كتعويض:'}</p>
                                                   <div className="flex flex-col gap-2 relative">
                                                      <div className="absolute right-3 top-2 bottom-2 w-px bg-border/60"></div>
                                                      {takenSessions.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((ts) => (
                                                         <div key={ts.id} className="flex relative z-10 items-center gap-2 bg-card pr-8 pl-3 py-2 rounded-xl text-xs border border-white/5 shadow-sm">
                                                            <div className="absolute right-2 w-2 h-2 rounded-full bg-orange-500 outline outline-2 outline-background shrink-0" />
                                                            <span className="font-bold whitespace-nowrap">
                                                               {format(new Date(ts.startTime), 'EEEE, dd MMM', { locale: lang === 'ar' ? ar : enUS })}
                                                            </span>
                                                            {ts.notes && <span className="text-muted-foreground text-[10px] truncate max-w-[100px]">{ts.notes}</span>}
                                                            <div className="ml-auto">
                                                               <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setEditingSession(ts); }}><Edit2 className="w-3 h-3" /></Button>
                                                            </div>
                                                         </div>
                                                      ))}
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })()}

                                    {/* If it is a compensation consumed, show which parent it relates to */}
                                    {isCompensationConsumed && sess.linkedCompensationSessionId && (() => {
                                       const parent = sessions.find(s => s.id === sess.linkedCompensationSessionId);
                                       if (parent) {
                                          return (
                                             <div className="mt-2 text-[11px] bg-background/50 border border-white/5 px-3 py-2 rounded-xl text-muted-foreground">
                                                تعويضاً عن الحضور يوم: <strong className="text-foreground">{format(new Date(parent.startTime), 'dd MMM yyyy', { locale: lang === 'ar' ? ar : enUS })}</strong>
                                             </div>
                                          )
                                       }
                                       return null;
                                    })()}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            );
         })()}
      </TabsContent>
      </Tabs>
      
      <UnifiedEntrySheet 
        open={!!editingSession} 
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
        sessionToEdit={editingSession}
        allowDateChange={true}
      />

      {/* Confirm Delete Dialog */}
      <Dialog open={!!deletingSessionId} onOpenChange={(open) => !open && setDeletingSessionId(null)}>
        <DialogContent className="sm:max-w-sm rounded-[2rem] border-white/10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle className="text-lg text-red-500">{t('rep.confirm_delete')}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground my-2">{t('rep.sure_delete_log')}</p>
          <div className="flex gap-2 mt-4">
            <Button onClick={confirmDelete} variant="destructive" className="flex-1 rounded-xl h-11">{t('rep.final_delete')}</Button>
            <Button onClick={() => setDeletingSessionId(null)} variant="outline" className="flex-1 rounded-xl h-11">{t('rep.cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
