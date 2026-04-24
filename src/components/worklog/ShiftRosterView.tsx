import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { CalendarDays, Hand, X, MousePointer2 } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';

export default function ShiftRosterView() {
  const { shifts } = useWorkLog();
  const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // Load roster from local storage
  const [roster, setRoster] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('worklog_shift_roster');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('worklog_shift_roster', JSON.stringify(roster));
  }, [roster]);

  const handleDayClick = (day: string) => {
    if (selectedShift) {
       setRoster(prev => {
         const currentDayShifts = prev[day] || [];
         if (!currentDayShifts.includes(selectedShift)) {
            return { ...prev, [day]: [...currentDayShifts, selectedShift] };
         }
         return prev;
       });
       // Optional: deselect after placement, or keep selected for rapid placement
       // setSelectedShift(null); 
    }
  };

  const removeShiftFromDay = (day: string, shiftId: string) => {
     setRoster(prev => ({
       ...prev,
       [day]: prev[day].filter(id => id !== shiftId)
     }));
  };

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">عربة الورادي (Roster)</h2>
            <p className="text-muted-foreground text-sm">توزيع نوبات العمل</p>
          </div>
        </div>
      </header>

      <div className="bg-secondary/20 p-4 rounded-3xl border border-white/5">
        <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-violet-500" />
          1. اختر وردية من البنك لتوزيعها:
        </h4>
        <p className="text-[10px] text-muted-foreground mb-3">اضغط على الوردية ثم اضغط على أيام الأسبوع لإضافتها.</p>
        <div className="flex gap-2 flex-wrap">
          {shifts.map(s => (
             <div 
                key={s.id} 
                onClick={() => setSelectedShift(selectedShift === s.id ? null : s.id)}
                className={`bg-card shadow-sm border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-all ${selectedShift === s.id ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20' : 'border-border/50 border-r-4 border-r-violet-500 hover:bg-secondary/50'}`}
             >
                <Hand className={`w-4 h-4 ${selectedShift === s.id ? 'text-violet-500' : 'text-muted-foreground opacity-50'}`} />
                <span className="font-bold text-xs">{s.name} ({s.startTime})</span>
             </div>
          ))}
          {shifts.length === 0 && (
            <p className="text-xs text-muted-foreground w-full py-2">لا توجد ورديات مُعرّفة. يمكنك إضافتها من قائمة الجدولة أو الإعدادات.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
         {weekDays.map(day => (
            <div key={day} className="flex flex-col w-full h-full">
               <div className="bg-secondary/40 text-center py-2 font-bold text-[10px] md:text-xs rounded-t-xl">
                  {day}
               </div>
               <div 
                 className={`bg-card border min-h-[120px] md:min-h-[250px] p-2 rounded-b-xl flex flex-col gap-2 relative transition-colors ${selectedShift ? 'cursor-pointer hover:bg-violet-500/5 border-violet-500/20' : 'border-white/5'}`}
                 onClick={() => handleDayClick(day)}
               >
                 {(!roster[day] || roster[day].length === 0) && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <span className="text-[9px] md:text-[10px] text-muted-foreground text-center opacity-50 px-2">
                       {selectedShift ? 'اضغط هنا للإضافة' : 'فارغ'}
                     </span>
                   </div>
                 )}
                 {roster[day]?.map(shiftId => {
                   const shift = shifts.find(s => s.id === shiftId);
                   if (!shift) return null;
                   return (
                     <div key={shiftId} className="bg-primary/10 border border-primary/20 text-primary rounded-lg p-2 text-xs font-bold relative group shadow-sm flex flex-col z-10" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start w-full">
                           <span className="truncate max-w-[80%]">{shift.name}</span>
                           <button onClick={() => removeShiftFromDay(day, shiftId)} className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full p-0.5 shadow-sm text-destructive hover:bg-destructive/10">
                              <X className="w-3 h-3" />
                           </button>
                        </div>
                        <span className="text-[9px] opacity-80 mt-1 font-mono">{shift.startTime}</span>
                     </div>
                   );
                 })}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
