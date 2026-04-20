import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Wallet, TrendingUp, DollarSign, Briefcase, ChevronLeft } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function WalletView() {
  const { sessions, projects, settings } = useWorkLog();
  const now = new Date();

  // Basic Filtering for Current Month
  const currentMonthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), now) && !s.isArchived);

  // Financial calculations
  const { totalEstimatedRevenue, projectsRevenue } = useMemo(() => {
    let _total = 0;
    const _projectsObj: Record<string, { duration: number, revenue: number, name: string }> = {};

    currentMonthSessions.forEach(session => {
       if (session.projectId) {
          const project = projects.find(p => p.id === session.projectId);
          if (project && project.hourlyRate) {
             const hours = (session.duration || 0) / 60;
             const sessionRev = hours * project.hourlyRate;
             _total += sessionRev;
             
             if (!_projectsObj[project.id]) {
                _projectsObj[project.id] = { duration: 0, revenue: 0, name: project.name };
             }
             _projectsObj[project.id].duration += hours;
             _projectsObj[project.id].revenue += sessionRev;
          }
       }
    });

    return {
       totalEstimatedRevenue: _total,
       projectsRevenue: Object.values(_projectsObj).sort((a,b) => b.revenue - a.revenue)
    };
  }, [currentMonthSessions, projects]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-20 px-2 pt-4" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">محفظتي (Mahfazty)</h2>
            <p className="text-muted-foreground text-sm">التقييم المالي لساعات العمل</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden shrink-0">
         <div className="absolute top-0 left-0 w-full h-full bg-black/10 backdrop-blur-sm pointer-events-none" />
         <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-center">
               <span className="opacity-80 text-sm font-medium">أرباح الشهر المتوقعة (مستقل)</span>
               <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{format(now, 'MMMM yyyy', {locale: ar})}</span>
            </div>
            
            <div className="flex items-end gap-2">
               <span className="text-5xl font-black">{totalEstimatedRevenue.toLocaleString()}</span>
               <span className="text-lg font-bold opacity-80 mb-1">ج.م</span>
            </div>
            
            <div className="flex items-center justify-between mt-2 opacity-80 text-xs">
               <span>حصيلة ساعات العمل في المشاريع الحرّة</span>
               <TrendingUp className="w-4 h-4" />
            </div>
         </div>
      </div>

      {settings.system !== 'freelance' && (
         <Card className="p-4 bg-card border-white/5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
               <h3 className="font-bold text-sm">أنت موظف بنظام الدوام</h3>
               <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                 التطبيق يحسب هنا فقط أرباح المشاريع الجانبية والمستقلة التي حددت لها (سعر الساعة). الأجر الثابت لا يظهر هنا.
               </p>
            </div>
         </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-lg px-1 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-500" /> 
            تفصيل الإيرادات حسب المشروع
        </h3>
        
        <div className="flex flex-col gap-3">
           {projectsRevenue.length > 0 ? (
              projectsRevenue.map((proj, idx) => (
                 <Card key={idx} className="p-4 bg-card border-white/5 rounded-2xl flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex flex-col gap-1">
                       <span className="font-bold text-sm">{proj.name}</span>
                       <span className="text-[10px] text-muted-foreground">
                          {proj.duration.toFixed(1)} ساعة عمل هذا الشهر
                       </span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-bold text-emerald-500">{proj.revenue.toLocaleString()} ج</span>
                       <ChevronLeft className="w-4 h-4 text-muted-foreground opacity-50" />
                    </div>
                 </Card>
              ))
           ) : (
              <div className="text-center py-10 text-muted-foreground bg-secondary/5 rounded-3xl border border-white/5 border-dashed">
                 لم تقم بتسجيل أي ساعات عمل حر (Freelance) لها تقييم مالي هذا الشهر.
              </div>
           )}
        </div>
      </div>

    </div>
  );
}
