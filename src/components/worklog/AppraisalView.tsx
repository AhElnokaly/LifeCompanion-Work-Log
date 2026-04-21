import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Target, Award, Zap } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AppraisalView() {
  const { sessions, settings } = useWorkLog();
  const now = new Date();
  
  const metrics = useMemo(() => {
    const monthSessions = sessions.filter(s => isSameMonth(new Date(s.startTime), now));
    const totalExtra = monthSessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);
    const totalRestDaysWork = monthSessions.filter(s => s.isRestDayWork).length;
    const leaveDays = monthSessions.filter(s => s.isAnnualLeave).length;
    
    return {
       totalExtraHrs: (totalExtra / 60).toFixed(1),
       totalRestDaysWork,
       leaveDays
    };
  }, [sessions, now]);

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" dir="rtl">
      <header className="flex flex-col gap-1 mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">دليل الأداء والتقييم</h2>
            <p className="text-muted-foreground text-sm">المراجعة والتقييم لشهر {format(now, 'MMMM yyyy', {locale: ar})}</p>
          </div>
        </div>
      </header>

      <Card className="p-6 bg-card border-white/5 rounded-[2rem] space-y-4 shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
         
         <h3 className="font-bold flex items-center gap-2 relative z-10"><Award className="w-5 h-5 text-amber-500"/> ملف التميّز:</h3>
         <p className="text-sm leading-loose text-muted-foreground relative z-10">
            استناداً إلى بيانات الدخول والخروج هذا الشهر، أنت تثبت التزاماً عالياً.
            تم رصد <b className="text-foreground">{metrics.totalExtraHrs}</b> ساعة عمل إضافية لخدمة أهداف الشركة.
            وكذلك قمت بإنقاذ الموقف بالعمل خلال عطلات الراحة الأسبوعية <b className="text-foreground">{metrics.totalRestDaysWork}</b> مرة.
         </p>
         
         <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
             <div className="bg-primary/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 text-center border border-primary/10">
                <span className="text-3xl font-black text-primary">{metrics.totalExtraHrs}</span>
                <span className="text-[10px] md:text-xs text-muted-foreground font-bold">ساعة إضافية (Overtime)</span>
             </div>
             <div className="bg-red-500/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 text-center border border-red-500/10">
                <span className="text-3xl font-black text-red-500">{metrics.totalRestDaysWork}</span>
                <span className="text-[10px] md:text-xs text-muted-foreground font-bold">أيام عطلات عملت بها</span>
             </div>
         </div>
         
         <p className="text-xs text-center text-muted-foreground/60 italic mt-4 relative z-10">
           "هذا التقرير مُصدق من المحرك الذكي في النظام لإرفاقه بمطالبات التقييم السنوي والترقيات."
         </p>
      </Card>
      
      <div className="bg-gradient-to-l from-secondary/40 to-secondary/10 p-5 rounded-3xl flex flex-col gap-2 border border-white/5 shadow-inner">
         <h4 className="font-bold text-sm text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /> نصيحة المحرك الذكي للاحترافية:</h4>
         <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            عند جلوسك مع مديرك المباشر لتقييم الأداء {format(now, 'MMM', {locale: ar})}، افتح هذه الشاشة وركز على الساعات الإضافية لتبرير طلبك للحصول على ترقية، علاوة، أو تعويض مالي. لا تترك مجهودك دون توثيق أرقام محددة.
         </p>
      </div>
    </div>
  );
}
