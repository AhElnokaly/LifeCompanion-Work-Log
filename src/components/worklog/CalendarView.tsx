import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, List, LayoutGrid, Activity, Clock } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, subDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell, ReferenceLine } from 'recharts';

import { gregorianToHijri } from '../../lib/hijri';

export default function CalendarView() {
  const { sessions, jobs, settings } = useWorkLog();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [showHijri, setShowHijri] = useState(false);

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

    const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    return (
      <Card className="flex flex-col bg-card border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 bg-secondary/30 border-b border-border/40">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-bold text-muted-foreground border-l border-border/10 last:border-l-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            // Find sessions for this day
            const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), day));
            // Calculate Hijri Date using Khwarizmi
            const hijriDate = showHijri ? gregorianToHijri(day) : null;
            
            // Holidays logic
            let holidayName = null;
            const EGYPTIAN_HOLIDAYS = ["01-07","01-25","04-25","05-01","06-30","07-23","10-06"];
            const dayKey = format(day, 'MM-dd');
            if (EGYPTIAN_HOLIDAYS.includes(dayKey)) holidayName = 'عطلة رسمية';
            
            // Islamic Holidays based on Hijri
            if (hijriDate) {
              if (hijriDate.month === 9 && hijriDate.day === 1) holidayName = 'أول رمضان';
              if (hijriDate.month === 10 && hijriDate.day <= 3) holidayName = 'عيد الفطر';
              if (hijriDate.month === 12 && hijriDate.day >= 9 && hijriDate.day <= 13) holidayName = 'عيد الأضحى';
            }

            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[80px] p-1.5 border-b border-l border-border/10 flex flex-col gap-1 transition-colors hover:bg-secondary/10 cursor-pointer ${
                  !isCurrentMonth ? 'bg-secondary/5 opacity-50' : ''
                } ${idx % 7 === 6 ? 'border-l-0' : ''} ${holidayName ? 'bg-amber-500/5' : ''}`}
                onClick={() => {
                   setCurrentDate(day);
                   setViewType('daily');
                }}
              >
                {/* Date Header */}
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-primary text-primary-foreground' : ''} ${holidayName ? 'text-amber-500' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {showHijri && hijriDate && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${holidayName ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                      {hijriDate.day}
                    </span>
                  )}
                </div>

                {/* Day Content / Badges */}
                <div className="flex flex-col gap-1 mt-1 overflow-y-auto max-h-[50px] no-scrollbar">
                  {holidayName && (
                    <div className="text-[9px] px-1.5 py-0.5 rounded font-bold truncate shadow-sm text-amber-500 bg-amber-500/10 mb-0.5 border border-amber-500/20">
                      {holidayName}
                    </div>
                  )}
                  {daySessions.map(sess => {
                    let badgeClass = "bg-primary/20 text-primary";
                    let label = "عمل منتظم";
                    
                    if (sess.isAnnualLeave) {
                      badgeClass = "bg-emerald-500/20 text-emerald-500";
                      label = "إجازة";
                    } else if (sess.isRestDayWork) {
                      badgeClass = "bg-red-500/20 text-red-500";
                      label = "عمل بديل";
                    } else if (sess.isPermission) {
                      badgeClass = "bg-yellow-500/20 text-yellow-500";
                      label = "تصريح";
                    } else if (sess.projectId || sess.type !== 'salary') {
                        // Find job color
                        const job = jobs.find(j => j.id === (sess as any).jobId); // Need to link job ID in future
                        if (job) {
                           return (
                             <div key={sess.id} className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center truncate shadow-sm mt-0.5 text-white" style={{backgroundColor: job.color}}>
                               {job.name} {(sess.duration || 0) > 0 ? `${(sess.duration! / 60).toFixed(1)}س` : ''}
                             </div>
                           );
                        }
                    }

                    return (
                      <div key={sess.id} className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate shadow-sm mt-0.5 ${badgeClass}`}>
                        {label} {(sess.duration || 0) > 0 ? `${(sess.duration! / 60).toFixed(1)}س` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
                   contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px'}} 
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
    // Get sessions for currentDate
    const daySessions = sessions
      .filter(s => isSameDay(new Date(s.startTime), currentDate))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (daySessions.length === 0) {
      return (
        <Card className="p-10 bg-card border-white/5 rounded-2xl flex flex-col items-center justify-center text-center mt-4">
          <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">لا يوجد سجلات في هذا اليوم</p>
        </Card>
      );
    }

    return (
      <div className="flex flex-col gap-4 mt-4">
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
                  <div className="text-left font-mono font-bold text-lg text-primary/80">
                    {sess.duration ? `${(sess.duration / 60).toFixed(1)}h` : '--'}
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
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (viewType) {
      case 'monthly':
        return renderMonthlyGrid();
      case 'weekly':
        return renderWeeklyGrid();
      case 'daily':
        return renderDailyTimeline();
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
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">التقويم المتقدم</h2>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              {viewType === 'monthly' && format(currentDate, 'MMMM yyyy', { locale: ar })}
              {viewType === 'weekly' && `الأسبوع: ${format(startOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')} - ${format(endOfWeek(currentDate, {weekStartsOn:6}), 'd MMM')}`}
              {viewType === 'daily' && format(currentDate, 'EEEE، d MMMM yyyy', { locale: ar })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          
          <Button variant="outline" size="sm" onClick={() => setShowHijri(!showHijri)} className="w-full sm:w-auto h-9 text-xs rounded-xl font-bold bg-secondary/50">
            {showHijri ? 'إخفاء الهجري' : 'إظهار الهجري'}
          </Button>

          {/* View Toggles */}
          <div className="flex bg-secondary/30 p-1 rounded-xl w-full sm:w-auto">
            <Button 
              variant={viewType === 'monthly' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 h-8 text-xs rounded-lg ${viewType === 'monthly' ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => setViewType('monthly')}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> شهري
            </Button>
            <Button 
              variant={viewType === 'weekly' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 h-8 text-xs rounded-lg ${viewType === 'weekly' ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => setViewType('weekly')}
            >
              <List className="w-3.5 h-3.5 mr-1.5" /> أسبوعي
            </Button>
            <Button 
              variant={viewType === 'daily' ? 'secondary' : 'ghost'} 
              size="sm" 
              className={`flex-1 h-8 text-xs rounded-lg ${viewType === 'daily' ? 'font-bold bg-card shadow-sm' : ''}`}
              onClick={() => setViewType('daily')}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" /> يومي
            </Button>
          </div>

          {/* Navigation */}
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

        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {renderCurrentView()}
      </div>

    </div>
  );
}
