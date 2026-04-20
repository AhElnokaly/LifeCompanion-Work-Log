import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, subMonths, isSameMonth } from 'date-fns';

export default function ReportsView() {
  const { sessions, projects, settings } = useWorkLog();
  const now = new Date();

  // Basic Filtering for Current Month
  const currentMonthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), now));

  const totalHours = currentMonthSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const totalOvertime = currentMonthSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
  
  // Aggregate data for AreaChart (Daily Hours)
  const dailyDataMap = new Map();
  currentMonthSessions.forEach(s => {
    const day = format(new Date(s.startTime), 'MMM d');
    const hrs = (s.duration || 0) / 60;
    dailyDataMap.set(day, (dailyDataMap.get(day) || 0) + hrs);
  });
  const chartData = Array.from(dailyDataMap, ([date, hours]) => ({ date, hours })).slice(-7); // Last 7 active days

  // Aggregate data for PieChart (Projects/Types)
  const projectDataMap = new Map();
  currentMonthSessions.forEach(s => {
    const key = s.projectId ? (projects.find(p => p.id === s.projectId)?.name || 'مجهول') : (s.isPermission ? 'استئذان' : 'أساسي');
    projectDataMap.set(key, (projectDataMap.get(key) || 0) + ((s.duration || 0) / 60));
  });
  const pieData = Array.from(projectDataMap, ([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const handleExportCSV = () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Duration (Mins)', 'Overtime (Mins)', 'Notes', 'Work Type'];
    const rows = sessions.map(s => [
      format(new Date(s.startTime), 'yyyy-MM-dd'),
      format(new Date(s.startTime), 'HH:mm'),
      s.endTime ? format(new Date(s.endTime), 'HH:mm') : 'N/A',
      s.duration || 0,
      s.overtimeMinutes || 0,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      s.isRestDayWork ? 'Rest Day' : 'Normal',
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `worklog_report_${format(now, 'MMM_yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold">التقارير</h2>
           <p className="text-muted-foreground text-sm">التحليلات والمصروفات</p>
        </div>
        <Button variant="ghost" className="rounded-xl bg-secondary/50">
          {format(now, 'MMMM yyyy')} &larr;
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1">الساعات الكلية</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{totalHours.toFixed(1)}</span>
            </div>
        </Card>
        <Card className="p-4 rounded-2xl bg-yellow-600/20 border-yellow-500/20 text-yellow-500 flex flex-col justify-center">
            <span className="text-xs opacity-80 mb-1">العمل الإضافي</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{totalOvertime.toFixed(1)}</span>
            </div>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1">متوسط العمل/يوم</span>
            <div className="flex items-baseline gap-1">
              {/* Dummy calc for UI */}
              <span className="text-2xl font-bold">{(totalHours / (chartData.length || 1)).toFixed(1)}</span>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dynamic Chart */}
        <Card className="p-5 rounded-3xl bg-card border-white/5 relative overflow-hidden flex flex-col min-h-[300px]">
          <p className="text-sm text-muted-foreground">أداء الأيام الأخيرة (ساعات)</p>
          <div className="flex-1 w-full mt-4 -ml-4" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{fontSize: 10}} stroke="#888888" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px'}} />
                  <Area type="monotone" dataKey="hours" stroke="#6366f1" fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </Card>

        {/* Dynamic Pie Chart */}
        <Card className="p-5 rounded-3xl bg-card border-white/5 flex flex-col min-h-[300px]">
           <p className="text-xs text-center font-medium">توزيع الوقت (المشاريع/المهام)</p>
           
           <div className="flex-1 w-full relative" dir="ltr">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length ? pieData : [{name: 'لا يوجد', value: 1}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(pieData.length ? pieData : [{name: 'لا يوجد', value: 1}]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px'}} />
                </PieChart>
             </ResponsiveContainer>
           </div>
           
           <div className="flex flex-wrap justify-center gap-2 mt-2">
             {pieData.map((entry, i) => (
               <div key={i} className="flex items-center gap-1 text-[10px]">
                 <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} ></span>
                 {entry.name}
               </div>
             ))}
           </div>
        </Card>
      </div>

      <div>
        <Card className="rounded-3xl bg-card border-none overflow-hidden mt-4">
           <div className="p-4 flex justify-between items-center text-sm border-b border-border/40">
             <span className="text-muted-foreground">مقارنة بالشهر الماضي</span>
             <div className="flex gap-2">
               <span className="text-emerald-400 font-medium">+12% ساعات</span>
             </div>
           </div>
           <div className="p-4 flex justify-between items-center group cursor-pointer hover:bg-secondary/20 transition-colors" onClick={handleExportCSV}>
             <div className="flex flex-col">
                <span className="font-medium text-sm text-indigo-400">تحميل التقرير (CSV)</span>
                <span className="text-xs text-muted-foreground">تصدير كافة السجلات لجداول البيانات</span>
             </div>
             <Download className="w-4 h-4 text-indigo-400" />
           </div>
        </Card>
      </div>

    </div>
  );
}
