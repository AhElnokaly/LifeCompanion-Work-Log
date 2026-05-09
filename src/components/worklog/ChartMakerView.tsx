import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, isSameMonth, isSameWeek, startOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart2, PieChart as PieIcon, LineChart as LineIcon, Activity, Download, Save, CheckCircle2 } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function ChartMakerView() {
    const { t, lang } = useLanguage();
  const { sessions, projects, settings, updateSettings } = useWorkLog();
  
  const [chartName, setChartName] = useState(t('t_auto_224'));
  const [isSaved, setIsSaved] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie' | 'stacked_bar'>('stacked_bar');
  const [metric, setMetric] = useState<'duration' | 'overtime' | 'both'>('both');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'project' | 'type'>('day');
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month' | 'week'>('month');
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

  const chartData = useMemo(() => {
    let filteredSessions = sessions;
    const now = new Date();
    
    if (timeRange === 'year') {
       filteredSessions = sessions.filter(s => new Date(s.startTime).getFullYear() === now.getFullYear());
    } else if (timeRange === 'month') {
       filteredSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), now));
    } else if (timeRange === 'week') {
       filteredSessions = sessions.filter(s => isSameWeek(new Date(s.startTime), now));
    }

    const dataMap = new Map<string, { base: number, overtime: number, total: number }>();

    filteredSessions.forEach(s => {
       let key = t('t_auto_225');
       
       if (groupBy === 'day') {
          key = format(new Date(s.startTime), 'MMM d', { locale: ar });
       } else if (groupBy === 'week') {
          key = `أسبوع ${format(startOfWeek(new Date(s.startTime), { weekStartsOn: 6 }), 'MMM d', { locale: ar })}`;
       } else if (groupBy === 'month') {
          key = format(new Date(s.startTime), 'MMMM yyyy', { locale: ar });
       } else if (groupBy === 'project') {
          key = s.projectId ? (projects.find(p => p.id === s.projectId)?.name || t('t_auto_225')) : (s.dayStatus === 'permission' ? t('t_auto_226') : t('t_auto_227'));
       } else if (groupBy === 'type') {
          if (s.dayStatus === 'annual_leave') key = t('t_auto_121');
          else if (s.dayStatus === 'permission') key = t('t_auto_226');
          else if (s.dayStatus === 'sick_leave') key = t('t_auto_228');
          else if (s.dayStatus === 'half_day_leave') key = t('t_auto_229');
          else key = t('t_auto_61');
       }

       const rawDuration = (s.duration || 0) / 60;
       const overtime = (s.overtimeMinutes || 0) / 60;
       const base = Math.max(0, rawDuration - overtime);
       
       const prev = dataMap.get(key) || { base: 0, overtime: 0, total: 0 };
       
       dataMap.set(key, {
         base: prev.base + base,
         overtime: prev.overtime + overtime,
         total: prev.total + rawDuration
       });
    });

    return Array.from(dataMap, ([name, vals]) => ({ 
      name, 
      base: Number(vals.base.toFixed(1)),
      overtime: Number(vals.overtime.toFixed(1)),
      total: Number(vals.total.toFixed(1))
    }));
  }, [sessions, projects, groupBy, timeRange]);

  const exportChartData = () => {
     const headers = ['Category', 'Base Hours', 'Overtime Hours', 'Total Hours'];
     const rows = chartData.map(d => `${d.name},${d.base},${d.overtime},${d.total}`);
     const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `custom_chart_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
     document.body.appendChild(link);
     link.click();
  };

  const getMetricDataKey = () => {
    if (metric === 'duration') return 'total';
    if (metric === 'overtime') return 'overtime';
    return 'total';
  };

  const handleSaveChart = () => {
    const newChart = {
      id: Date.now().toString(),
      name: chartName,
      chartType,
      metric,
      groupBy,
      timeRange
    };
    
    updateSettings({
      ...settings,
      savedCharts: [...(settings.savedCharts || []), newChart]
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" >
       <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-2">
         <div>
            <h2 className="text-2xl font-bold bg-gradient-to-l from-indigo-400 to-emerald-400 bg-clip-text text-transparent">{t('t_auto_230')}</h2>
            <p className="text-muted-foreground text-sm">{t('t_auto_231')}</p>
         </div>
         <div className="flex items-center gap-2">
            <Input 
              value={chartName} 
              onChange={e => setChartName(e.target.value)} 
              placeholder={t('t_auto_232')} 
              className="bg-secondary/30 border-white/5 rounded-xl h-10 w-40"
            />
            <Button 
               onClick={handleSaveChart} 
               className={`rounded-xl h-10 gap-2 transition-all ${isSaved ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
               {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
               {isSaved ? t('t_auto_233') : t('t_auto_234')}
            </Button>
         </div>
       </header>

       <Card className="p-4 rounded-[2rem] bg-card border-white/5 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('t_auto_235')}</label>
                <Select value={chartType} onValueChange={(val: any) => setChartType(val)} >
                  <SelectTrigger className="rounded-xl border-white/10 bg-secondary/30 h-10 w-full min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 z-[150] bg-card/95 backdrop-blur-xl border-white/10" >
                    <SelectItem value="bar" className="rounded-lg"><div className="flex items-center gap-2"><BarChart2 className="w-4 h-4"/> {t('t_auto_236')}</div></SelectItem>
                    <SelectItem value="stacked_bar" className="rounded-lg"><div className="flex items-center gap-2"><BarChart2 className="w-4 h-4"/> {t('t_auto_237')}</div></SelectItem>
                    <SelectItem value="line" className="rounded-lg"><div className="flex items-center gap-2"><LineIcon className="w-4 h-4"/> {t('t_auto_238')}</div></SelectItem>
                    <SelectItem value="area" className="rounded-lg"><div className="flex items-center gap-2"><Activity className="w-4 h-4"/> {t('t_auto_239')}</div></SelectItem>
                    <SelectItem value="pie" className="rounded-lg"><div className="flex items-center gap-2"><PieIcon className="w-4 h-4"/> {t('t_auto_240')}</div></SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('t_auto_241')}</label>
                <Select value={groupBy} onValueChange={(val: any) => setGroupBy(val)} >
                  <SelectTrigger className="rounded-xl border-white/10 bg-secondary/30 h-10 w-full min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 z-[150] bg-card/95 backdrop-blur-xl border-white/10" >
                    <SelectItem value="day" className="rounded-lg">{t('t_auto_242')}</SelectItem>
                    <SelectItem value="week" className="rounded-lg">{t('t_auto_243')}</SelectItem>
                    <SelectItem value="month" className="rounded-lg">{t('t_auto_244')}</SelectItem>
                    <SelectItem value="project" className="rounded-lg">{t('t_auto_245')}</SelectItem>
                    <SelectItem value="type" className="rounded-lg">{t('t_auto_246')}</SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('t_auto_247')}</label>
                <Select value={metric} onValueChange={(val: any) => setMetric(val)} >
                  <SelectTrigger className="rounded-xl border-white/10 bg-secondary/30 h-10 w-full min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 z-[150] bg-card/95 backdrop-blur-xl border-white/10" >
                    <SelectItem value="duration" className="rounded-lg">{t('t_auto_248')}</SelectItem>
                    <SelectItem value="overtime" className="rounded-lg">{t('t_auto_249')}</SelectItem>
                    <SelectItem value="both" className="rounded-lg">{t('t_auto_250')}</SelectItem>
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('t_auto_251')}</label>
                <Select value={timeRange} onValueChange={(val: any) => setTimeRange(val)} >
                  <SelectTrigger className="rounded-xl border-white/10 bg-secondary/30 h-10 w-full min-w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 z-[150] bg-card/95 backdrop-blur-xl border-white/10" >
                    <SelectItem value="week" className="rounded-lg">{t('t_auto_252')}</SelectItem>
                    <SelectItem value="month" className="rounded-lg">{t('t_auto_253')}</SelectItem>
                    <SelectItem value="year" className="rounded-lg">{t('t_auto_254')}</SelectItem>
                    <SelectItem value="all" className="rounded-lg">{t('t_auto_255')}</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>
       </Card>

       <Card className="p-4 sm:p-6 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[400px]">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
         <div className="flex justify-between items-center mb-6 relative z-10 w-full px-2 mt-2">
            <h3 className="font-bold text-lg">{chartType === 'pie' ? t('t_auto_256') : t('t_auto_257')}</h3>
            <Button variant="ghost" size="sm" onClick={exportChartData} className="rounded-full bg-secondary/50 hover:bg-secondary">
               <Download className="w-4 h-4 mr-2" /> {t('t_auto_258')}
                                  </Button>
         </div>

         <div className="flex-1 w-full relative z-10 mt-4 -ml-4" dir="ltr">
            {chartData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-muted-foreground text-sm ml-4">
                  {t('t_auto_259')}
                                         </div>
            ) : (
               <ResponsiveContainer width="100%" height={300}>
                 {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#888888" tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [`${value} ساعة`, '']} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', textAlign: 'right'}} itemStyle={{color: '#c0c1ff'}} />
                      <Bar dataKey={getMetricDataKey()} fill="#6366f1" radius={[4, 4, 0, 0]}>
                         {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                 ) : chartType === 'stacked_bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#888888" tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number, name: string) => [`${value} ساعة`, name === 'base' ? t('t_auto_260') : t('t_auto_261')]} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', textAlign: 'right'}} itemStyle={{color: '#c0c1ff'}} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="base" name={t('t_auto_260')} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="overtime" name={t('t_auto_261')} stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#888888" tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [`${value} ساعة`, '']} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', textAlign: 'right'}} />
                      <Line type="monotone" dataKey={getMetricDataKey()} stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                    </LineChart>
                 ) : chartType === 'area' ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#888888" tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [`${value} ساعة`, '']} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', textAlign: 'right'}} />
                      <Area type="monotone" dataKey={getMetricDataKey()} stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                 ) : (
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey={getMetricDataKey()}
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} ساعة`, '']} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', textAlign: 'right'}} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                 )}
               </ResponsiveContainer>
            )}
         </div>
       </Card>
    </div>
  );
}
