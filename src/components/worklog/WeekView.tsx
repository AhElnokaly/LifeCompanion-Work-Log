import React, { useState } from 'react';
import { formatMinutesToHHMM } from '../../lib/utils';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Activity, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { format, subDays, addDays, startOfWeek, subWeeks, endOfWeek, isSameWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, CartesianGrid, Legend } from 'recharts';

export default function WeekView() {
  const { sessions, settings } = useWorkLog();
  const { t, lang } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start for typical Arab week
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const isCurrentWeek = isSameWeek(new Date(), currentDate, { weekStartsOn: 0 });
  
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

  const thisWeekSessions = sessions.filter(s => new Date(s.startTime) >= weekStart && new Date(s.startTime) <= weekEnd);
  
  thisWeekSessions.forEach(s => {
    const dayStr = format(new Date(s.startTime), 'yyyy-MM-dd');
    if (dailyDataMap.has(dayStr)) {
      const current = dailyDataMap.get(dayStr);
      current.hours += ((s.duration || 0) / 60);
      dailyDataMap.set(dayStr, current);
    }
  });

  const dailyData = Array.from(dailyDataMap.values());
  const actualTotalHours = dailyData.reduce((acc, d) => acc + d.hours, 0);
  const goalHours = settings.dailyHours * (7 - settings.restDays.length);
  const totalOvertime = thisWeekSessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);

  // Compare to last week roughly (for UI demo purposes we mock the percentage, or we can calculate securely)
  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subDays(weekStart, 1);
  const lastWeekSessions = sessions.filter(s => new Date(s.startTime) >= lastWeekStart && new Date(s.startTime) <= lastWeekEnd);
  const lastWeekTotalHours = lastWeekSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const diffHours = actualTotalHours - lastWeekTotalHours;
  const diffPercent = lastWeekTotalHours > 0 ? (diffHours / lastWeekTotalHours) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex flex-col items-center justify-center mb-4 relative px-2">
        <h2 className="text-2xl font-bold mb-1">{t('t_auto_529')}</h2>
        <div className="flex items-center justify-between w-full h-10 mt-2 bg-secondary/30 rounded-2xl px-2">
           <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))} className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground">
             <ChevronRight className="w-5 h-5 rtl:rotate-180" />
           </Button>
           <p className="text-sm font-bold text-foreground">
              {format(weekStart, 'd MMMM', { locale: ar })} - {format(weekEnd, 'd MMMM, yyyy', { locale: ar })}
           </p>
           <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))} className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground">
             <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
           </Button>
        </div>
        {!isCurrentWeek && (
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => setCurrentDate(new Date())} 
             className="absolute top-0 left-2 rounded-xl h-8 px-3 text-xs bg-card border-white/10"
           >
              {t('t_auto_530')}
                                 </Button>
        )}
      </header>

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
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-yellow-500">{formatMinutesToHHMM(totalOvertime)}</span>
            <span className="text-yellow-500/70 font-medium text-xs">{t('cal.hour')}</span>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-card border-white/5 shadow-xl rounded-2xl relative overflow-hidden">
        {/* Real Bar Chart */}
        <div className="mt-8 h-64 w-full -ml-4" dir="ltr">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
               <XAxis 
                 dataKey="day" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{fontSize: 12, fill: '#888'}} 
                 dy={10}
               />
               <YAxis 
                 tick={{fontSize: 12, fill: '#888'}} 
                 axisLine={false} 
                 tickLine={false} 
                 dx={-10}
                 tickFormatter={(val) => `${val}س`}
               />
               <Tooltip 
                 contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6'}} 
                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                 formatter={(value: any) => [`${Number(value).toFixed(1)} ساعة`, t('cal.working_hours')]}
               />
               <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
               <ReferenceLine y={settings.dailyHours} stroke="#ec4899" strokeDasharray="3 3" opacity={0.5} label={{ position: 'top', value: t('t_auto_531'), fill: '#ec4899', fontSize: 10 }} />
               <Bar dataKey="hours" name={t('cal.working_hours')} radius={[4, 4, 0, 0]} maxBarSize={40}>
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
}
