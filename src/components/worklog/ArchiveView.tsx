import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Archive, Trash2, Undo2 } from 'lucide-react';

export default function ArchiveView() {
  const { archivedSessions, deleteSession, restoreSession } = useWorkLog();

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-20 px-2 animate-in fade-in" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">الأرشيف</h2>
            <p className="text-muted-foreground text-sm">الجلسات المحذوفة مؤخراً</p>
          </div>
        </div>
      </header>

      {archivedSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 h-full text-center opacity-60">
           <Archive className="w-16 h-16 text-muted-foreground mb-4" />
           <p className="font-medium text-lg">الأرشيف فارغ</p>
           <p className="text-sm mt-1 text-muted-foreground">لا توجد أي جلسات محذوفة</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {archivedSessions.slice().reverse().map(session => {
            const sDate = new Date(session.startTime);
            const daysLeft = session.archivedAt ? Math.max(0, 365 - Math.floor((Date.now() - new Date(session.archivedAt).getTime()) / (1000 * 60 * 60 * 24))) : 365;

            return (
              <Card key={session.id} className="p-4 bg-card border-white/5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="font-bold text-lg">{format(sDate, 'dd/MM/yyyy')}</span>
                     <span className="text-xs text-muted-foreground">{format(sDate, 'EEEE', { locale: ar })}</span>
                     <span className="bg-slate-500/10 text-slate-500 text-[10px] px-2 py-0.5 rounded ml-2">أرشيف</span>
                  </div>
                  <div className="text-sm flex flex-wrap gap-2 text-muted-foreground">
                    <span>{session.duration ? (session.duration / 60).toFixed(1) + ' ساعات' : 'بدون مدة'}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{session.notes || 'لا يوجد ملاحظات'}</span>
                  </div>
                  <div className="text-[10px] text-red-400 mt-2 flex gap-4">
                     <span>تم الحذف في: {session.archivedAt ? format(new Date(session.archivedAt), 'dd/MM/yyyy', { locale: ar }) : ''}</span>
                     <span>• يحذف تلقائياً بعد {daysLeft} أيام</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                   <Button 
                     onClick={() => restoreSession(session.id)}
                     variant="outline" 
                     className="flex-1 md:flex-none border-primary/20 text-primary hover:bg-primary/10 rounded-xl"
                   >
                     <Undo2 className="w-4 h-4 ml-2" /> استعادة
                   </Button>
                   <Button 
                     onClick={() => {
                        if(confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذه الخطوة.')) {
                            deleteSession(session.id, true);
                        }
                     }}
                     variant="outline" 
                     className="flex-1 md:flex-none border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl"
                   >
                     <Trash2 className="w-4 h-4 ml-2" /> حذف نهائي
                   </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
