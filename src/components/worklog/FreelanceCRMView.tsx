import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Users, FileText, Clock, Briefcase } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';

export default function FreelanceCRMView() {
  const { projects } = useWorkLog();

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">إدارة العملاء (CRM)</h2>
            <p className="text-muted-foreground text-sm">متابعة الفواتير والرصيد المعلق</p>
          </div>
        </div>
      </header>
      
      <div className="space-y-4">
        {projects.length > 0 ? projects.map(proj => (
          <Card key={proj.id} className="p-4 bg-card rounded-2xl flex flex-col gap-4 border-white/5">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: proj.color}} />
                   <h3 className="font-bold">{proj.name}</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                   {proj.hourlyRate ? `${proj.hourlyRate} ج.م / ساعة` : 'قيمة غير محددة'}
                </span>
             </div>
             
             <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-xs shadow-sm rounded-xl h-10">
                   <Clock className="w-3 h-3 ml-1" />
                   تسجيل الأعمال
                </Button>
                <Button className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 shadow-sm">
                   <FileText className="w-3 h-3 ml-1" />
                   إصدار فاتورة
                </Button>
             </div>
          </Card>
        )) : (
          <div className="text-center p-8 bg-secondary/10 rounded-3xl border border-dashed border-border/50 text-muted-foreground">
             <Briefcase className="w-8 h-8 opacity-20 mx-auto mb-2" />
             <p>لا يوجد عملاء أو مشاريع مسجلة حالياً.</p>
             <p className="text-xs mt-1">أضف مشروعاً من شاشة (المشاريع والمهام).</p>
          </div>
        )}
      </div>
    </div>
  );
}
