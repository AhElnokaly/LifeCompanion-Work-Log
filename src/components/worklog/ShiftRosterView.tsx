import React from 'react';
import { Card } from '../ui/card';
import { CalendarDays, GripVertical } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';

export default function ShiftRosterView() {
  const { shifts } = useWorkLog();
  const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">عربة الورادي (Roster)</h2>
            <p className="text-muted-foreground text-sm">التوزيع الأسبوعي والتداخلات</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
         {weekDays.map(day => (
            <div key={day} className="flex flex-col w-full">
               <div className="bg-secondary/40 text-center py-2 font-bold text-[10px] md:text-xs rounded-t-xl">
                  {day}
               </div>
               <div className="bg-card border border-white/5 h-32 md:h-64 p-2 rounded-b-xl flex flex-col gap-2">
                 <div className="text-[9px] md:text-[10px] text-muted-foreground text-center mt-auto mb-auto opacity-50">
                   اسحب وأسقط الوردية هنا
                 </div>
               </div>
            </div>
         ))}
      </div>

      <div className="bg-secondary/20 p-4 rounded-3xl border border-white/5">
        <h4 className="font-bold text-sm mb-3">بنك الورديات للجدولة:</h4>
        <div className="flex gap-2 flex-wrap">
          {shifts.map(s => (
             <div key={s.id} className="bg-card shadow-sm border border-border/50 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer border-r-4 border-r-violet-500">
                <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                <span className="font-bold text-xs">{s.name} ({s.startTime})</span>
             </div>
          ))}
          {shifts.length === 0 && (
            <p className="text-xs text-muted-foreground w-full py-2">لا توجد ورديات مُعرّفة. أضفها عبر الإعدادات.</p>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 italic text-center w-full block">ميزة الـ Drag & Drop تحت التطوير حالياً.</p>
      </div>
    </div>
  );
}
