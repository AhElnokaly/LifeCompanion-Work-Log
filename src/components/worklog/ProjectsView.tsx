import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Search, Plus, MoreVertical, Play, Bell, FileText, Download } from 'lucide-react';
import { Progress } from '../ui/progress';

export default function ProjectsView() {
  const { projects } = useWorkLog();
  const [invoicingId, setInvoicingId] = useState<string | null>(null);

  const handleGenerateInvoice = (projectId: string) => {
    setInvoicingId(projectId);
    setTimeout(() => {
      setInvoicingId(null);
      // In a real app, this downloads a PDF. Here we just show completion smoothly.
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">المشاريع</h2>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="w-5 h-5" />
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="البحث في المشاريع..." 
          className="pr-10 h-12 rounded-2xl bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="flex gap-2">
        <Button className="rounded-2xl px-6 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30">النشطة</Button>
        <Button variant="ghost" className="rounded-2xl px-6">الكل</Button>
        <Button variant="ghost" className="rounded-2xl px-6">المكتملة</Button>
      </div>

      <div className="flex flex-col gap-4 relative pb-20">
        
        {projects.map((p, i) => (
          <Card key={p.id} className="p-5 rounded-3xl bg-card border-white/5 relative overflow-hidden transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${i % 2 === 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <div className="w-6 h-6 font-bold flex items-center justify-center">
                    {p.name.charAt(0)}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">{p.clientName}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-secondary/20 rounded-2xl">
               <div>
                 <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">السعر</p>
                 <p className="text-sm font-medium border-l border-white/5 pl-2">${p.hourlyRate}/س</p>
               </div>
               <div>
                 <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">الساعات</p>
                 <p className="text-sm font-medium border-l border-white/5 pl-2">{p.totalHours}</p>
               </div>
               <div className="text-left">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">المستحق</p>
                  <p className="text-sm font-bold text-emerald-400">${(p.hourlyRate * p.totalHours).toFixed(2)}</p>
               </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 rounded-xl h-10 border-white/10 hover:bg-white/5 gap-2"
                onClick={() => handleGenerateInvoice(p.id)}
                disabled={invoicingId === p.id}
              >
                {invoicingId === p.id ? (
                  <>
                    <Download className="w-4 h-4 animate-bounce text-emerald-400" />
                    <span className="text-emerald-400">جاري التصدير...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span>فاتورة ذكية</span>
                  </>
                )}
              </Button>
              <Button size="sm" className="rounded-xl h-10 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 flex-1 gap-2">
                <Play className="w-4 h-4" />
                بدء المؤقت
              </Button>
            </div>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-10 opacity-70">
            <p className="font-medium">لا توجد مشاريع حتى الآن</p>
            <p className="text-sm text-muted-foreground mt-1">ابدأ بإضافة مشروع مستقل</p>
          </div>
        )}

        {/* Fab Add Button */}
        <div className="fixed bottom-24 left-6 z-40">
           <Button size="icon" className="w-14 h-14 rounded-full shadow-xl bg-yellow-500 hover:bg-yellow-600 text-black">
             <Plus className="w-6 h-6" />
           </Button>
        </div>
      </div>
    </div>
  );
}
