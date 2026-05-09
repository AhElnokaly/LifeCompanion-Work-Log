import { ar, enUS } from 'date-fns/locale';
import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Download, TrendingUp, Clock, Palmtree, History, Filter, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, endOfWeek, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

import { useLanguage } from '../../contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { formatMinutesToHHMM } from '../../lib/utils';

export default function ReportsView() {
  const { t, lang } = useLanguage();
  const { sessions, deleteSession, updateSession, settings } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  
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
         <TabsList className="grid w-full grid-cols-2 rounded-2xl p-1 bg-secondary/30 h-12 border border-white/5 mb-4">
           <TabsTrigger value="history" className="rounded-xl font-bold h-10">{t('rep.attendance_log')}</TabsTrigger>
           <TabsTrigger value="charts" className="rounded-xl font-bold h-10">{t('rep.analytics')}</TabsTrigger>
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
                  let theme = { bg: 'bg-slate-700', text: 'text-slate-100', textDark: 'text-slate-400', bgSoft: 'bg-slate-700/10', border: 'border-slate-700/30' };
                  if (hour >= 5 && hour < 12) theme = { bg: 'bg-amber-500', text: 'text-amber-50', textDark: 'text-amber-500', bgSoft: 'bg-amber-500/10', border: 'border-amber-500/30' };
                  else if (hour >= 12 && hour < 17) theme = { bg: 'bg-blue-500', text: 'text-blue-50', textDark: 'text-blue-500', bgSoft: 'bg-blue-500/10', border: 'border-blue-500/30' };
                  else if (hour >= 17 && hour < 20) theme = { bg: 'bg-purple-500', text: 'text-purple-50', textDark: 'text-purple-500', bgSoft: 'bg-purple-500/10', border: 'border-purple-500/30' };

                  // Find primary status of the day to show on the collapsed card
                  let mainStatus = t('rep.work');
                  const leaveSession = daySessions.find(s => s.dayStatus?.includes('leave') || s.dayStatus === 'rest_day_work');
                  if (leaveSession) {
                     if (leaveSession.dayStatus === 'rest_day_work') mainStatus = t('rep.rest_day');
                     else mainStatus = t('rep.leave');
                  } else if (daySessions.some(s => s.dayStatus === 'permission')) {
                     mainStatus = t('rep.permission');
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
                                     <span className={`${theme.textDark} text-[10px] bg-background/50 px-2 py-0.5 rounded-full font-bold ml-auto shrink-0 max-w-[80px] truncate text-center`}>{mainStatus}</span>
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
                                 let sessionLabel = t('rep.regular_work'); 
                                 if (session.dayStatus === 'rest_day_work') sessionLabel = t('rep.rest_day');
                                 else if (session.dayStatus?.includes('leave')) sessionLabel = t('rep.leave');
                                 else if (session.dayStatus === 'permission') sessionLabel = t('rep.permission');

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

            {/* Edit Session Dialog */}
            <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
              <DialogContent className="sm:max-w-sm rounded-[2rem] border-white/10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DialogHeader><DialogTitle className="text-lg">{t('rep.edit_log')}</DialogTitle></DialogHeader>
                {editingSession && (
                  <div className="space-y-4 py-3 text-start">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('rep.entry_time')}</Label>
                        <Input type="datetime-local" className="rounded-xl h-10 text-xs" value={format(new Date(editingSession.startTime), "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setEditingSession({...editingSession, startTime: e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('rep.exit_time')}</Label>
                        <Input type="datetime-local" className="rounded-xl h-10 text-xs" value={editingSession.endTime ? format(new Date(editingSession.endTime), "yyyy-MM-dd'T'HH:mm") : ''} onChange={(e) => setEditingSession({...editingSession, endTime: e.target.value})}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('t_auto_458')}</Label>
                      <Input className="rounded-xl h-10 text-xs" value={editingSession.notes || ''} onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                   <Button onClick={handleEditSave} className="flex-1 rounded-xl h-12 font-bold">{t('rep.save_changes')}</Button>
                   <Button onClick={() => { setDeletingSessionId(editingSession?.id || null); setEditingSession(null); }} variant="destructive" className="rounded-xl h-12 px-5"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </DialogContent>
            </Dialog>

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
         </TabsContent>
      </Tabs>
      
    </div>
  );
}
