import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, TrendingUp, Clock, Palmtree, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, addMonths, subMonths, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function ReportsView() {
  const { sessions, settings } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtering for currently selected Month
  const currentMonthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), currentDate) && !s.isArchived);

  // Calculate Metrics
  const totalHours = currentMonthSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const totalOvertime = currentMonthSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
  
  const permissionsCount = currentMonthSessions.filter(s => s.dayStatus === 'permission').length;
  
  const annualLeaveDays = currentMonthSessions.filter(s => s.dayStatus === 'annual_leave').length;
  const sickLeaveDays = currentMonthSessions.filter(s => s.dayStatus === 'sick_leave').length;
  const compensationDays = currentMonthSessions.filter(s => s.dayStatus === 'compensation').length;
  const restDays = currentMonthSessions.filter(s => s.isRestDayWork === false && s.duration === 0 && s.dayStatus === undefined).length; // Approximating rest days if needed, but maybe just using those explicitly marked
  
  // Aggregate data for BarChart (Daily Hours)
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const chartData = daysInMonth.map(day => {
     const daySessions = currentMonthSessions.filter(s => new Date(s.startTime).toDateString() === day.toDateString());
     let hours = 0;
     daySessions.forEach(s => { hours += (s.duration || 0) / 60; });
     return {
        dayNum: format(day, 'd'),
        hours,
     }
  });

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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir="rtl">
      
      {/* Header aligned with Screenshot #3 */}
      <header className="flex justify-between items-center px-1">
         <h2 className="text-3xl font-extrabold tracking-tight">monthlyReports</h2>
         <Button variant="secondary" className="rounded-2xl bg-indigo-500/10 text-indigo-400 font-bold px-5 h-10 border border-indigo-500/20" onClick={() => setCurrentDate(new Date())}>
           {format(currentDate, 'MMMM yyyy', { locale: ar })}
         </Button>
      </header>

      {/* Month Navigation (Invisible or just handled by buttons) */}
      <div className="flex justify-between -mt-4 px-2">
         <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>الشهر القادم</Button>
         <Button variant="ghost" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>الشهر السابق</Button>
      </div>

      {/* Top 2 Cards (Totals) */}
      <div className="grid grid-cols-2 gap-3">
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
             <TrendingUp className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-bold text-foreground">الإجمالي</span>
             <span className="text-sm font-bold text-foreground">{totalHours.toFixed(1)} س</span>
           </div>
         </Card>
         
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
             <TrendingUp className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-bold text-emerald-500">س إضافي</span>
             <span className="text-sm font-bold text-emerald-500">{totalOvertime.toFixed(1)} س</span>
           </div>
         </Card>
      </div>

      {/* Grid of 4 specific metrics */}
      <div className="grid grid-cols-2 gap-3">
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground">
             <Clock className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-foreground">الأذونات</span>
             <span className="text-sm font-bold">{permissionsCount} إذن</span>
           </div>
         </Card>
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground">
             <Palmtree className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-foreground">راحة</span>
             <span className="text-sm font-bold">{restDays} days</span>
           </div>
         </Card>
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground">
             <Palmtree className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-foreground">مرضي</span>
             <span className="text-sm font-bold">{sickLeaveDays} days</span>
           </div>
         </Card>
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between">
           <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground">
             <Palmtree className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-foreground">بديلة</span>
             <span className="text-sm font-bold">{compensationDays} days</span>
           </div>
         </Card>
         <Card className="rounded-2xl bg-card border-white/5 p-4 flex items-center justify-between col-span-2">
           <div className="w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground">
             <Palmtree className="w-4 h-4" />
           </div>
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium text-foreground">سنوي</span>
             <span className="text-sm font-bold">{annualLeaveDays} days</span>
           </div>
         </Card>
      </div>

      {/* Chart Section */}
      <Card className="rounded-[2rem] bg-card/60 border-white/5 p-6 flex flex-col min-h-[300px]">
         <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
               ساعات العمل اليومية
            </h3>
            <BarChart2 className="w-5 h-5 text-indigo-400" />
         </div>
         
         <div className="flex-1 w-full relative" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                 <XAxis 
                   dataKey="dayNum" 
                   tick={{fontSize: 10, fill: '#6b7280'}} 
                   axisLine={false} 
                   tickLine={false} 
                   interval="preserveStartEnd"
                   minTickGap={10}
                 />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#f3f4f6' }}
                   itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                   cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 />
                 <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > settings.dailyHours ? '#10b981' : '#6366f1'} />
                    ))}
                 </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
         
         <div className="border-t border-border/40 border-dashed mt-4 pt-4 flex justify-between items-center px-2">
            {/* Adding the exact numbers seen in screenshot 3 bottom part 31 28 25 ... 2 */}
            <div className="w-full justify-between items-center flex text-[10px] text-muted-foreground font-mono opacity-50 px-1 hidden">
               <span>31</span><span>28</span><span>25</span><span>22</span><span>19</span><span>16</span><span>13</span><span>10</span><span>8</span><span>6</span><span>4</span><span>2</span>
            </div>
         </div>
      </Card>

      <Card className="rounded-3xl bg-secondary/30 hover:bg-secondary/50 transition-colors border-none overflow-hidden cursor-pointer mt-2" onClick={handleExportCSV}>
         <div className="p-4 flex justify-center items-center gap-3">
           <Download className="w-5 h-5 text-indigo-400" />
           <span className="font-bold text-sm text-indigo-400">تحميل التقرير (CSV)</span>
         </div>
      </Card>

    </div>
  );
}
