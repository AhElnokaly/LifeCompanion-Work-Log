import React, { useState } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Button } from '../ui/button';
import { Plus, Check, Clock, Calendar, X, Coffee, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function SmartFAB() {
  const { activeSession, startSession, endSession, getBalances, logSpecialSession } = useWorkLog();
  const [isOpen, setIsOpen] = useState(false);
  
  const balances = getBalances();
  const hasPendingCompensations = balances.availableCompensations.length > 0;

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Menu */}
      <div className={`fixed bottom-24 left-6 z-50 flex flex-col-reverse items-start gap-3 transition-all duration-500 ease-out ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        
        {/* Core Actions */}
        <div className="flex bg-card/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl flex-col gap-2 min-w-[220px]">
          <p className="text-xs font-semibold text-muted-foreground px-2 pt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-500" /> إجراءات سريعة
          </p>
          <Button 
            className="justify-start gap-3 w-full rounded-xl font-bold transition-all shadow-lg" 
            variant={activeSession ? "destructive" : "default"}
            onClick={() => handleAction(() => activeSession ? endSession('انتهى العمل') : startSession('salary'))}
          >
            {activeSession ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {activeSession ? 'تسجيل انصراف' : 'تسجيل حضور'}
          </Button>
        </div>

        {/* Smart Alternatives depending on balance */}
        <div className="flex bg-card/80 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl flex-col gap-2 min-w-[220px]">
          <p className="text-xs font-semibold text-muted-foreground px-1 pb-1">رصيدك الذكي</p>
          
          {balances.remainingPermissionsHours >= 1 && (
            <div className="flex flex-col gap-2 w-full border-t border-white/5 pt-2">
              <span className="text-[10px] text-muted-foreground px-1">تصاريح (متبقي {balances.remainingPermissionsHours} س)</span>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 text-xs h-9 rounded-xl bg-secondary/50 hover:bg-secondary border-none" variant="outline"
                  onClick={() => handleAction(() => logSpecialSession('permission', { hours: 1 }))}
                >
                  <Clock className="w-3 h-3 ml-1 text-indigo-400" /> 1 س
                </Button>
                {balances.remainingPermissionsHours >= 2 && (
                  <Button 
                    className="flex-1 text-xs h-9 rounded-xl bg-secondary/50 hover:bg-secondary border-none" variant="outline"
                    onClick={() => handleAction(() => logSpecialSession('permission', { hours: 2 }))}
                  >
                    <Clock className="w-3 h-3 ml-1 text-indigo-400" /> 2 س
                  </Button>
                )}
              </div>
            </div>
          )}

          {balances.remainingAnnualLeaves > 0 && (
            <Button 
              className="justify-start gap-2 h-10 border-t border-white/5 rounded-xl bg-secondary/30 mt-1 hover:bg-secondary/60" variant="ghost"
              onClick={() => handleAction(() => logSpecialSession('annual_leave'))}
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-sm">إجازة سنوية</span>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full mr-auto rtl:ml-auto rtl:mr-0">{balances.remainingAnnualLeaves} يوم</span>
            </Button>
          )}

          {balances.availableCompensations.length > 0 && (
            <div className="flex flex-col gap-2 w-full border-t border-white/5 pt-3 mb-1 mt-1">
               <span className="text-[10px] text-red-400 font-medium px-1 flex items-center gap-1">
                 📌 أيام بديلة لم تُستخدم!
               </span>
               <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                 {balances.availableCompensations.map(c => (
                   <Button 
                     key={c.id}
                     className="justify-start gap-2 h-9 text-xs rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-100 border border-red-500/20" variant="secondary"
                     onClick={() => handleAction(() => logSpecialSession('compensation', { linkedId: c.id }))}
                   >
                     <Coffee className="w-3 h-3 text-red-400" />
                     بدل عمل يوم {format(new Date(c.startTime), 'd MMM', { locale: ar })}
                   </Button>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <div className="fixed bottom-[80px] md:bottom-6 left-6 z-50">
        {hasPendingCompensations && !isOpen && (
          <span className="absolute -top-1 -right-1 flex w-4 h-4 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background"></span>
          </span>
        )}
        <Button 
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center p-0 transition-all duration-300 ${isOpen ? 'bg-secondary text-foreground rotate-45 hover:bg-secondary' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30 hover:scale-105'}`}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </>
  );
}
