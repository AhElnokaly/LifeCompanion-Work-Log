import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Play, Square, Clock, Calendar, Coffee, FileText, Check, Bell, Zap, Timer, Shuffle } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function HomeView() {
  const { activeSession, sessions, jobs, shifts, startSession, endSession, settings, getBalances, logSpecialSession, updateSession, toggleBreak } = useWorkLog();
  const [now, setNow] = useState(new Date());

  // Modals state
  const [actionDialog, setActionDialog] = useState<'permission' | 'note' | 'pomodoro' | null>(null);
  const [dispatcherOpen, setDispatcherOpen] = useState(false);
  const [moodDialogState, setMoodDialogState] = useState<'start' | 'end' | null>(null);
  const [pendingStartData, setPendingStartData] = useState<{ type: any, jobId?: string } | null>(null);
  
  // Mood form state
  const [moodScore, setMoodScore] = useState<number>(3); // 1-5
  const [selfScore, setSelfScore] = useState<number>(5); // 1-10
  const [clientScore, setClientScore] = useState<number>(5); // 1-10
  const [permissionHours, setPermissionHours] = useState<number>(1);
  const [permissionType, setPermissionType] = useState<'entry' | 'exit'>('entry');
  const [noteText, setNoteText] = useState('');

  // Pomodoro state
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(0);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);

  // Added absence management state
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [absenceType, setAbsenceType] = useState<'annual_leave' | 'sick_leave' | 'casual_leave' | 'half_day_leave' | 'compensation'>('annual_leave');
  const [absenceDate, setAbsenceDate] = useState<string>(format(now, 'yyyy-MM-dd'));
  const [showHalfDayPrompt, setShowHalfDayPrompt] = useState<{show: boolean, type: any, entityId?: string, forceYesterday?: boolean}>({show: false, type: 'salary'});
  const [selectedPreEntryMode, setSelectedPreEntryMode] = useState<'regular' | 'annual_leave' | 'compensation' | 'half_day'>('regular');

  // Quotes
  const motivationalQuotes = [
    "النجاح ليس النهاية، والفشل ليس قاتلاً: الشجاعة للاستمرار هي ما يهم.",
    "الطريقة الوحيدة للقيام بعمل عظيم هي أن تحب ما تفعله.",
    "لا تنتظر الفرصة، اصنعها.",
    "التركيز هو سر الإنتاجية العالية.",
    "أنت أقوى مما تعتقد، وأكثر قدرة مما تتخيل."
  ];
  const dailyQuote = useMemo(() => motivationalQuotes[now.getDate() % motivationalQuotes.length], [now.getDate()]);

  const handlePreEntrySubmit = () => {
     if (selectedPreEntryMode === 'regular') {
        handleStartSession();
     } else if (selectedPreEntryMode === 'half_day') {
        logSpecialSession('half_day');
     } else {
        setAbsenceType(selectedPreEntryMode);
        setAbsenceDate(format(now, 'yyyy-MM-dd'));
        setAbsenceDialogOpen(true);
     }
  };


  useEffect(() => {
    let interval: any;
    if (isPomodoroActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPomodoroActive && pomodoroTimeLeft <= 0) {
      setIsPomodoroActive(false);
      import('../../lib/notifications').then(({ sendAppNotification }) => {
         if (settings.notificationsEnabled) {
            sendAppNotification('انتهت جلسة التركيز', { body: 'أحسنت! خذ استراحة قصيرة لتجديد نشاطك.' });
         }
      });
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTimeLeft, settings.notificationsEnabled]);

  const openPomodoroDialog = () => {
    setPomodoroTimeLeft((settings.notificationPreferences?.pomodoroMinutes || 25) * 60);
    setIsPomodoroActive(false);
    setActionDialog('pomodoro');
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todaySessions = sessions.filter(s => new Date(s.startTime).toDateString() === now.toDateString());
  const completedMinutesToday = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  
  let currentSessionMinutes = 0;
  if (activeSession) {
     currentSessionMinutes = differenceInMinutes(now, new Date(activeSession.startTime));
     let breakMinutes = activeSession.breaks || 0;
     if (activeSession.activeBreakStartTime) {
       breakMinutes += differenceInMinutes(now, new Date(activeSession.activeBreakStartTime));
     }
     currentSessionMinutes = Math.max(0, currentSessionMinutes - breakMinutes);
  }

  const totalMinutesToday = completedMinutesToday + currentSessionMinutes;
  const targetMins = settings.dailyHours * 60;
  const remainingMins = Math.max(0, targetMins - totalMinutesToday);
  
  const progressPercent = Math.min((totalMinutesToday / targetMins) * 100, 100);
  // Allow overtime to exceed slightly to show up to 100% full bar
  const isOvertime = totalMinutesToday > targetMins || activeSession?.isRestDayWork;
  const overtimeMinutes = Math.max(0, totalMinutesToday - targetMins);

  const isFreelance = settings.system === 'freelance';
  const balances = getBalances();
  
  const isOnFullDayLeave = todaySessions.some(s => 
    (s.isAnnualLeave && s.duration >= targetMins) || 
    s.isCompensationLeave
  );

  const getLeaveIcon = () => {
    if (todaySessions.some(s => s.isCompensationLeave)) return <Coffee className="w-16 h-16 text-red-500/50 mb-4" />;
    return <Calendar className="w-16 h-16 text-emerald-500/50 mb-4" />;
  };

  const getLeaveText = () => {
    if (todaySessions.some(s => s.isCompensationLeave)) return "تستمتع بيوم راحة كـ (بديل)";
    return "تستمتع بإجازة سنوية";
  };

  const handleStartSession = () => {
    // If user has shifts explicitly requested/setup, force show dispatcher or logic
    if (shifts.length > 0 || jobs.length > 0) {
      if (shifts.length > 0) {
        // Smart Shift Autodetection
        const currentHm = format(now, 'HH:mm');
        const currentH = parseInt(currentHm.split(':')[0]);
        const currentM = parseInt(currentHm.split(':')[1]);

        let matchingShift = null;

        for (const shift of shifts) {
          const startH = parseInt(shift.startTime.split(':')[0]);
          const startM = parseInt(shift.startTime.split(':')[1]);
          
          let diffMinutes = (currentH * 60 + currentM) - (startH * 60 + startM);
          // Handle next day crossing (e.g. shift is 23:00, it's 00:15 now)
          if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;
          else if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;

          // Auto detect if within 60 minutes of shift start
          if (Math.abs(diffMinutes) <= 60) {
             matchingShift = shift;
             break;
          }
        }

        if (matchingShift) {
          startSpecificSession('shift', matchingShift.id);
          return;
        }
      }
      setDispatcherOpen(true);
    } else {
      startSpecificSession('salary');
    }
  };

  const [nightShiftModalOpen, setNightShiftModalOpen] = useState(false);
  const [pendingNightJob, setPendingNightJob] = useState<{type: any, entityId?: string} | null>(null);

  const startSpecificSession = (type: any, entityId?: string) => {
    setDispatcherOpen(false);
    
    // Night Shift detection
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      setPendingNightJob({type, entityId});
      setNightShiftModalOpen(true);
      return;
    }
    
    processSessionStart(type, entityId);
  };

  const processSessionStart = (type: any, entityId?: string, forceYesterday?: boolean, skipHalfDayCheck?: boolean) => {
    setNightShiftModalOpen(false);
    setPendingNightJob(null);
    let overrideData: any = {};
    if (forceYesterday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      overrideData = { startTime: yesterday.toISOString() };
    }

    // Half Day Check
    if (!skipHalfDayCheck && settings.system !== 'freelance' && settings.expectedStartTime) {
       const expectedStart = new Date();
       const [h, m] = settings.expectedStartTime.split(':').map(Number);
       expectedStart.setHours(h, m, 0, 0);
       
       const diffMins = (now.getTime() - expectedStart.getTime()) / 60000;
       
       // If late by > 60 mins and less than half shift (e.g. 4 hours)
       if (diffMins > 60 && diffMins < (settings.dailyHours * 60 / 2)) {
         setShowHalfDayPrompt({show: true, type, entityId, forceYesterday});
         return;
       }
    }

    if (settings.modules?.healthMood) {
      setPendingStartData({ type, jobId: entityId, overrideData });
      setMoodDialogState('start');
    } else {
      startSession(type, entityId, overrideData);
    }
  };

  const handleHalfDayAccept = (accept: boolean) => {
     const { type, entityId, forceYesterday } = showHalfDayPrompt;
     setShowHalfDayPrompt({show: false, type});
     
     if (accept) {
       logSpecialSession('half_day', { note: 'تأخير تلقائي' });
     } else {
       processSessionStart(type, entityId, forceYesterday, true);
     }
  };

  const submitMoodStart = () => {
    if (pendingStartData) {
      const existingNotes = (pendingStartData as any).overrideData?.notes || '';
      const moodNotes = `[مزاج البداية: ${moodScore}/5] ${existingNotes}`;
      
      startSession(
         pendingStartData.type, 
         pendingStartData.jobId, 
         {...(pendingStartData as any).overrideData, notes: moodNotes}
      );
    }
    setMoodDialogState(null);
    setPendingStartData(null);
  };

  const handleEndSession = () => {
    if (settings.modules?.healthMood) {
      setMoodDialogState('end');
    } else {
      endSession(noteText || 'انتهى العمل');
    }
  };

  const submitMoodEnd = () => {
    const combinedNotes = `${noteText ? noteText + '\n' : ''}[المزاج النهائي: ${moodScore}/5 | الإنجاز: ${selfScore}/10]`;
    endSession(combinedNotes);
    setMoodDialogState(null);
  };

  const submitPermission = () => {
    logSpecialSession('permission', { hours: permissionHours, subtype: permissionType, note: noteText });
    setActionDialog(null);
    setNoteText('');
  };

  const submitNote = () => {
    if (activeSession) {
      updateSession(activeSession.id, { notes: noteText });
    }
    setActionDialog(null);
    setNoteText('');
  };

  const openPermissionDialog = (hours: number) => {
    setPermissionHours(hours);
    setPermissionType(currentSessionMinutes < targetMins / 2 ? 'entry' : 'exit');
    setNoteText('');
    setActionDialog('permission');
  };

  const openNoteDialog = () => {
    setNoteText(activeSession?.notes || '');
    setActionDialog('note');
  };

  const handleSmartAction = (action: () => void) => action();

  let expectedCheckoutStr = "--:--";
  if (activeSession) {
    const remainingForTarget = Math.max(0, targetMins - totalMinutesToday);
    const expected = addMinutes(now, remainingForTarget);
    expectedCheckoutStr = format(expected, "hh:mm a", { locale: ar });
  }

  const displayHours = (totalMinutesToday / 60).toFixed(1);

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-700 max-w-sm w-full mx-auto pb-4" dir="ltr">
      
      {/* Date / Title Row */}
      <div className="flex justify-between items-center px-1 mb-2 shrink-0 pt-2" dir="rtl">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">سجل يومك</h2>
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{format(now, 'EEEE، d MMMM', { locale: ar })}</p>
        </div>
        <div className="flex gap-2 items-center">
           {!isFreelance && (
             <div className="text-[10px] text-muted-foreground bg-card shadow-sm px-2.5 py-1 rounded-full border border-border flex items-center gap-1 font-medium">
               <Calendar className="w-3 h-3 text-emerald-500" />
               الإجازات: {balances.remainingAnnualLeaves}
             </div>
           )}
           <div className="w-8 h-8 rounded-full bg-card shadow-sm border border-border flex items-center justify-center">
             <Bell className="w-3.5 h-3.5 text-foreground/80" />
           </div>
        </div>
      </div>

      {isOnFullDayLeave ? (
         <div className="flex flex-col items-center justify-center bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl my-auto text-center mx-1 flex-1" dir="rtl">
            {getLeaveIcon()}
            <span className="text-lg font-bold tracking-wide">
              {getLeaveText()}
            </span>
            <p className="text-xs text-muted-foreground mt-2 opacity-60 leading-relaxed">
              نتمنى لك يوماً سعيداً بعيداً عن ضغوط العمل
            </p>
            <Button variant="outline" className="mt-6 rounded-full h-10 px-6 text-sm" onClick={() => startSpecificSession('salary')}>
              تخطي وبدء العمل
            </Button>
         </div>
      ) : (
        <div className="flex flex-col gap-3 mx-1 flex-1 justify-center min-h-0">
          
          {/* Card 1: Main Metric & Check-out */}
          <div className="relative bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 overflow-hidden shrink-0">
            {/* Ambient Background Glow */}
            <div className="absolute top-[-50%] right-[-10%] w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none"></div>
            
            <div className="flex flex-col z-10" dir="rtl">
              <span className="text-base font-bold text-foreground/80 mb-1">اليوم:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-semibold tracking-tighter text-foreground drop-shadow-sm leading-none">{displayHours}</span>
                <span className="text-xl text-foreground/60 font-medium">ساعات</span>
              </div>
            </div>

            {!activeSession && (
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x" dir="rtl">
                 <Button 
                   variant={selectedPreEntryMode === 'regular' ? 'default' : 'secondary'} 
                   className="snap-start shrink-0 rounded-xl h-8 px-4 text-xs font-bold"
                   onClick={() => setSelectedPreEntryMode('regular')}
                 >
                   عمل منتظم
                 </Button>
                 <Button 
                   variant={selectedPreEntryMode === 'half_day' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-8 px-4 text-xs font-bold ${selectedPreEntryMode === 'half_day' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                   onClick={() => setSelectedPreEntryMode('half_day')}
                 >
                   إجازة نصف يوم
                 </Button>
                 <Button 
                   variant={selectedPreEntryMode === 'annual_leave' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-8 px-4 text-xs font-bold ${selectedPreEntryMode === 'annual_leave' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                   onClick={() => setSelectedPreEntryMode('annual_leave')}
                 >
                   إجازة سنوية
                 </Button>
                 <Button 
                   variant={selectedPreEntryMode === 'compensation' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-8 px-4 text-xs font-bold ${selectedPreEntryMode === 'compensation' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : ''}`}
                   onClick={() => setSelectedPreEntryMode('compensation')}
                 >
                   يوم بديل
                 </Button>
               </div>
            )}

            <button 
              onClick={() => activeSession ? handleEndSession() : handlePreEntrySubmit()}
              className={`w-full z-10 rounded-[1.2rem] h-14 font-bold text-base shadow-xl outline-none transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${
                activeSession 
                  ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                  : selectedPreEntryMode === 'regular' ? 'bg-primary/90 hover:bg-primary text-primary-foreground shadow-primary/20'
                  : selectedPreEntryMode === 'half_day' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
              }`}
            >
              {activeSession ? (
                <>
                   <Square className="fill-current w-4 h-4 flex-shrink-0" />
                   تسجيل الانصراف
                </>
              ) : (
                <>
                   {selectedPreEntryMode === 'regular' ? (
                     <><Play className="fill-current w-5 h-5 flex-shrink-0 mr-1" /> تسجيل الحضور</>
                   ) : selectedPreEntryMode === 'half_day' ? (
                     <><Clock className="fill-current w-5 h-5 flex-shrink-0 mr-1" /> تسجيل إجازة نصف يوم</>
                   ) : (
                     <><Calendar className="fill-current w-5 h-5 flex-shrink-0 mr-1" /> تسجيل إجازة</>
                   )}
                </>
              )}
            </button>
          </div>

          {!activeSession && (
            <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-4 text-center shrink-0">
               <p className="text-xs font-medium text-foreground/80 italic leading-relaxed" dir="rtl">"{dailyQuote}"</p>
            </div>
          )}

          {/* Card 2: Check-in / Checkout Expected */}
          <div className="bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden shrink-0">
            <div className="flex flex-col gap-1.5 text-[12px] text-foreground/80 z-10" dir="rtl">
              <div className="flex gap-2">
                <span className="text-foreground/60 font-medium whitespace-nowrap">تسجيل الدخول:</span>
                <span className="font-bold text-foreground">
                  {activeSession ? format(new Date(activeSession.startTime), "hh:mm a", {locale: ar}) : '--:--'}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-foreground/60 font-medium whitespace-nowrap">الانصراف المتوقع:</span>
                <span className="font-bold text-foreground">{expectedCheckoutStr}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 z-10">
              <div className="h-3.5 w-full bg-secondary/30 rounded-full overflow-hidden shadow-inner flex p-0.5" dir="rtl">
                {(() => {
                   const todaySessions = sessions.filter(s => {
                      const sDate = new Date(s.startTime);
                      return sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear() && !s.isArchived;
                   });
                   
                   let permissionMins = 0;
                   let halfDayMins = 0;
                   let workMins = 0;

                   todaySessions.forEach(s => {
                     if (s.dayStatus === 'permission') permissionMins += (s.permissionHours || 0) * 60;
                     else if (s.dayStatus === 'half_day') halfDayMins += (s.duration || 0);
                     else if (s.id === activeSession?.id) {
                       workMins += currentSessionMinutes;
                     } else {
                       workMins += (s.duration || 0);
                     }
                   });

                   const permPct = Math.min((permissionMins / targetMins) * 100, 100);
                   const halfPct = Math.min((halfDayMins / targetMins) * 100, 100);
                   const workPct = Math.min((workMins / targetMins) * 100, 100);

                   return (
                     <>
                        {permPct > 0 && <div className="h-full bg-purple-500/80 rounded-r-full border-l border-background/20" style={{width: `${permPct}%`}} title="تصريح" />}
                        {halfPct > 0 && <div className="h-full bg-orange-400/80 border-l border-background/20" style={{width: `${halfPct}%`}} title="نصف يوم" />}
                        {workPct > 0 && (
                           <div 
                             className={`h-full transition-all duration-1000 ${isOvertime ? 'bg-amber-400' : 'bg-[#e2aa72] shadow-sm'} ${(permPct === 0 && halfPct === 0) ? 'rounded-r-full' : ''} rounded-l-full relative`}
                             style={{width: `${workPct}%`}} 
                             title="عمل"
                           >
                              {activeSession && <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent to-white/20 animate-pulse pointer-events-none" />}
                           </div>
                        )}
                     </>
                   );
                })()}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-foreground/50 px-1" dir="rtl">
                <span>الساعات الفعلية</span>
                <span>ساعات العقد</span>
              </div>
            </div>
          </div>

            {isOvertime && (currentSessionMinutes > 16 * 60) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex flex-col gap-3 mt-1 shrink-0" dir="rtl">
                <div className="flex gap-2">
                   <Bell className="w-5 h-5 text-destructive font-bold" />
                   <div>
                     <p className="text-sm font-bold text-destructive">جلسة طويلة جداً (أكثر من 16 ساعة)</p>
                     <p className="text-xs text-muted-foreground mt-0.5">هل نسيت تسجيل الانصراف أمس؟</p>
                   </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 rounded-xl h-10 bg-destructive hover:bg-destructive/90 text-white shadow-sm"
                    onClick={() => {
                        // Ghost checkout - cap at expected checkout time
                        const dummyTime = new Date(activeSession.startTime);
                        dummyTime.setMinutes(dummyTime.getMinutes() + targetMins);
                        endSession('انصراف تخيلي (Ghost Check-out)', { endTime: dummyTime.toISOString() });
                    }}
                  >
                    انسحاب وهمي
                  </Button>
                </div>
              </div>
            )}

          {/* Card 3: Overtime Module */}
          {(isOvertime || settings.modules?.finances) && (
            <div className="bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex items-center justify-between shadow-xl shrink-0" dir="rtl">
              <div className="flex gap-3 items-center">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                   <Check className="w-5 h-5 text-emerald-400" />
                 </div>
                 <div className="flex flex-col justify-center">
                   <span className="text-foreground/80 font-bold mb-[1px] text-sm">العمل الإضافي (Overtime)</span>
                   <div className="flex items-baseline gap-1">
                     <span className="text-xl font-black text-foreground drop-shadow-sm">{(overtimeMinutes/60).toFixed(1)}</span>
                     <span className="text-[12px] font-medium text-foreground/60">ساعات إضافية</span>
                   </div>
                   <span className="text-[10px] font-medium text-foreground/40 mt-0.5">تراكم ساعات • مستحقات الإضافي</span>
                 </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex gap-2.5 shrink-0" dir="rtl">
            <button 
              onClick={() => {
                if (settings.system === 'freelance') {
                  startSpecificSession('project');
                } else {
                  setDispatcherOpen(true);
                }
              }}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-2.5 transition-colors shadow-lg active:scale-95"
            >
              <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                 <Zap className="w-4 h-4 fill-current opacity-80" />
              </div>
              <span className="text-xs font-bold text-foreground/90">بدء مهمة/مشروع</span>
            </button>
            
            <button 
              onClick={() => openPomodoroDialog()}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center gap-2.5 transition-colors shadow-lg active:scale-95"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                 <Timer className="w-4 h-4 opacity-80" />
              </div>
              <span className="text-xs font-bold text-foreground/90">تتبع تركيز (Focus)</span>
            </button>
          </div>

          {/* Secondary Quick Actions Strip (Breaks, Permissions, etc.) */}
          {activeSession ? (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-none snap-x" dir="rtl">
              <Button 
                variant="secondary"
                className={`snap-start shrink-0 rounded-[1rem] h-12 px-6 shadow-sm border border-white/5 flex gap-2 w-auto ${activeSession.activeBreakStartTime ? 'bg-amber-500/10 text-amber-500 font-bold' : ''}`}
                onClick={toggleBreak}
              >
                <Coffee className="w-4 h-4" />
                {activeSession.activeBreakStartTime ? 'إنهاء الاستراحة' : 'بدء استراحة'}
              </Button>
              
              {!isFreelance && balances.remainingPermissionsHours >= 1 && (
                <Button 
                  variant="secondary" 
                  className="snap-start shrink-0 bg-secondary/30 rounded-[1rem] h-12 px-6 shadow-sm border border-white/5 flex gap-2 text-indigo-400"
                  onClick={() => openPermissionDialog(1)}
                >
                  <Clock className="w-4 h-4" />
                  تصريح (ساعة)
                </Button>
              )}
            </div>
          ) : (
            // Out of session actions
            !isFreelance && (
              <div className="flex flex-col gap-2 mt-2">
                 <Button 
                   className="w-full bg-secondary/30 hover:bg-secondary/50 rounded-[1.5rem] h-14 shadow-sm border border-white/5 flex gap-2 text-foreground relative overflow-hidden"
                   onClick={() => setAbsenceDialogOpen(true)}
                 >
                   <Calendar className="w-5 h-5 text-emerald-400" />
                   إدارة الغياب والبدائل
                   <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />
                 </Button>

                 {/* Smart Leave Predictor Recommendation */}
                 {(() => {
                   const EGYPTIAN_HOLIDAYS = ["01-07","01-25","04-25","05-01","06-30","07-23","10-06"];
                   const upcomingDays = Array.from({length: 30}).map((_, i) => {
                     const d = new Date();
                     d.setDate(d.getDate() + i + 1);
                     return d;
                   });
                   const upcomingHoliday = upcomingDays.find(d => EGYPTIAN_HOLIDAYS.includes(format(d, 'MM-dd')));
                   if (upcomingHoliday && balances.remainingAnnualLeaves > 0) {
                     const holDay = upcomingHoliday.getDay();
                     let suggestion = null;
                     let suggestedDate = null;
                     
                     // If holiday is Tuesday (2), suggest Monday (1)
                     if (holDay === 2) { suggestion = 'الإثنين القادم'; suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() - 1); }
                     // If holiday is Wednesday (3), suggest Thursday (4)
                     if (holDay === 3) { suggestion = 'الخميس القادم'; suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() + 1); }
                     // If holiday is Thursday (4), suggest Sunday (0) to get 4 days (Fri, Sat, Sun, Mon - no wait, Thu off means Wed+Thu+Fri+Sat = 4 days!)
                     if (holDay === 4) { suggestion = 'الأربعاء القادم'; suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() - 1); }

                     if (suggestion && suggestedDate) {
                       return (
                         <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden" dir="rtl">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                               <Brain className="w-4 h-4 text-primary" />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-primary">المتنبئ الذكي للإجازات</p>
                               <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                 إذا أخذت إجازة <strong>{suggestion}</strong> ({format(suggestedDate, 'dd/MM')}) ستدمجها مع عطلة {format(upcomingHoliday, 'dd/MM')} وعطلة نهاية الأسبوع!
                               </p>
                             </div>
                           </div>
                           <Button 
                             size="sm" 
                             className="h-8 rounded-xl text-xs w-full mt-1 bg-primary text-primary-foreground font-bold"
                             onClick={() => {
                               setAbsenceType('annual_leave');
                               setAbsenceDate(format(suggestedDate, 'yyyy-MM-dd'));
                               setNoteText('إجازة مدمجة مع عطلة رسمية (مقترح المدرب الذكي)');
                               setAbsenceDialogOpen(true);
                             }}
                           >
                             احجزها الآن
                           </Button>
                         </div>
                       );
                     }
                   }
                   return null;
                 })()}
              </div>
            )
          )}

        </div>
      )}


      {/* Overlay: Smart Dispatcher */}
      {dispatcherOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
          <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8">
            <div className="flex flex-col mb-1" dir="rtl">
              <h3 className="text-xl font-bold">بدء التسجيل</h3>
              <p className="text-sm text-muted-foreground mt-1">اختر نوع التسجيل للوردية أو الوظيفة الحالية</p>
            </div>
            
            {shifts.length > 0 && (
              <div className="space-y-2 mt-2" dir="rtl">
                <h4 className="font-bold text-xs text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3 h-3"/> الورديات</h4>
                {shifts.map(shift => {
                  return (
                    <Button 
                      key={shift.id} 
                      variant="outline"
                      className="w-full justify-start h-12 rounded-xl relative shadow-sm"
                      onClick={() => startSpecificSession('shift', shift.id)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full mr-2 ml-3 bg-foreground opacity-70" />
                      {shift.name} ({shift.startTime})
                    </Button>
                  );
                })}
              </div>
            )}

            {jobs.length > 0 && (
              <div className="space-y-2 mt-2" dir="rtl">
                <h4 className="font-bold text-xs text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><FileText className="w-3 h-3"/> وظائف أخرى</h4>
                {jobs.map(job => (
                  <Button 
                    key={job.id} 
                    variant="outline"
                    className="w-full justify-start h-12 rounded-xl shadow-sm"
                    onClick={() => startSpecificSession(job.type, job.id)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full mr-2 ml-3" style={{backgroundColor: job.color}} />
                    {job.name}
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-2 pt-4 border-t border-border" dir="rtl">
               <Button className="w-full h-12 rounded-xl" variant="default" onClick={() => startSpecificSession('salary')}>
                 حضور عام (موظف)
               </Button>
            </div>

            <Button variant="ghost" className="mt-1 h-12 rounded-xl text-muted-foreground hover:bg-secondary" onClick={() => setDispatcherOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Overlay: Smart Absence Dialog */}
      {absenceDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
          <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 overflow-y-auto max-h-[90vh]" dir="rtl">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                 <h3 className="text-lg font-bold">إدارة الغياب والبدائل</h3>
                 <p className="text-[10px] text-muted-foreground">قم بتسجيل الإجازات من الأنواع المختلفة</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-1">
               <label className="text-sm font-bold">نوع الغياب</label>
               <select 
                 className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                 value={absenceType}
                 onChange={(e) => setAbsenceType(e.target.value as any)}
               >
                 <option value="annual_leave">إجازة اعتيادية/سنوية (يخصم رصيد)</option>
                 <option value="casual_leave">إجازة عارضة</option>
                 <option value="sick_leave">إجازة مرضية</option>
                 <option value="half_day_leave">إجازة نصف يوم</option>
                 <option value="compensation">يوم بديل (تعويض عمل الإضافي)</option>
               </select>

               <label className="text-sm font-bold mt-2">التاريخ</label>
               <input 
                 type="date" 
                 value={absenceDate}
                 onChange={(e) => setAbsenceDate(e.target.value)}
                 className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm"
               />

               <label className="text-sm font-bold mt-2">ملاحظات (اختياري)</label>
               <textarea 
                  className="w-full bg-secondary/30 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] border border-border"
                  placeholder="سبب الإجازة..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
               />
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button 
                className="flex-1 rounded-xl h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white" 
                onClick={() => {
                  handleSmartAction(() => logSpecialSession(absenceType, { date: absenceDate, note: noteText }));
                  setAbsenceDialogOpen(false);
                  setNoteText('');
                  if (settings.notificationsEnabled) {
                     import('../../lib/notifications').then(({ sendAppNotification }) => {
                        sendAppNotification('تم تسجيل الموقف بنجاح', { body: 'تم تحديث سجل اليوم في التقويمات.' });
                     });
                  }
                }}
              >
                تأكيد
              </Button>
              <Button className="flex-1 rounded-xl h-12" variant="ghost" onClick={() => setAbsenceDialogOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Note / Permission / Pomodoro Modal */}
      {actionDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
          <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8" dir="rtl">
            <h3 className="text-lg font-bold">
              {actionDialog === 'permission' ? `تصريح (${permissionHours} ساعة/ساعات)` : actionDialog === 'pomodoro' ? 'مؤقت التركيز (Pomodoro)' : 'ملاحظة الجلسة'}
            </h3>
            
            {actionDialog === 'permission' && (
              <div className="flex gap-2">
                <Button 
                  className="flex-1 rounded-xl h-10" 
                  variant={permissionType === 'entry' ? 'default' : 'secondary'}
                  onClick={() => setPermissionType('entry')}
                >
                  دخول متأخر
                </Button>
                <Button 
                  className="flex-1 rounded-xl h-10" 
                  variant={permissionType === 'exit' ? 'default' : 'secondary'}
                  onClick={() => setPermissionType('exit')}
                >
                  خروج مبكر
                </Button>
              </div>
            )}

            {actionDialog === 'pomodoro' ? (
              <div className="flex flex-col items-center justify-center py-6">
                 <div className="text-5xl font-black tabular-nums tracking-tight text-primary drop-shadow-md mb-6">
                   {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, '0')}:{String(pomodoroTimeLeft % 60).padStart(2, '0')}
                 </div>
                 <div className="flex gap-4 w-full">
                    {isPomodoroActive ? (
                      <Button className="flex-1 h-12 rounded-xl text-lg font-bold" variant="destructive" onClick={() => setIsPomodoroActive(false)}>إيقاف</Button>
                    ) : (
                      <Button className="flex-1 h-12 rounded-xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsPomodoroActive(true)}>بدء التركيز</Button>
                    )}
                 </div>
              </div>
            ) : (
              <textarea 
                className="w-full bg-secondary/30 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] border border-border"
                placeholder="اكتب ملاحظاتك..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            )}

            <div className="flex gap-2 mt-2">
              {actionDialog !== 'pomodoro' && (
                <Button className="flex-1 rounded-xl h-12 font-bold" onClick={actionDialog === 'permission' ? submitPermission : submitNote}>
                  حفظ
                </Button>
              )}
              <Button className="flex-1 rounded-xl h-12" variant={actionDialog === 'pomodoro' ? 'default' : 'ghost'} onClick={() => setActionDialog(null)}>
                {actionDialog === 'pomodoro' ? 'إغلاق' : 'إلغاء'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Mood Modal */}
      {moodDialogState && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
          <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8" dir="rtl">
             <div className="flex flex-col text-center mt-2">
               <h3 className="text-xl font-bold">{moodDialogState === 'start' ? 'استعد للعمل!' : 'تقييم اليوم'}</h3>
               <p className="text-sm text-muted-foreground mt-1">
                 {moodDialogState === 'start' ? 'كيف تشعر قبل بدء هذه الجلسة؟' : 'كيف تقيم هذه الجلسة؟'}
               </p>
             </div>

             <div className="space-y-4 my-2">
               <div className="bg-secondary/20 p-4 rounded-3xl">
                  <p className="text-sm font-medium mb-4 text-center text-foreground/80">المزاج الحالي</p>
                  <div className="flex justify-between px-2">
                    {['😫', '😕', '😐', '🙂', '🤩'].map((emoji, idx) => {
                      const score = idx + 1;
                      return (
                        <button 
                          key={score}
                          onClick={() => setMoodScore(score)}
                          className={`text-4xl transition-transform ${moodScore === score ? 'scale-125 drop-shadow-md' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
               </div>

               {moodDialogState === 'end' && (
                 <>
                   <div className="pt-2 px-1">
                      <p className="text-sm font-medium mb-3 text-foreground/80">مستوى إنجازك اليوم</p>
                      <input 
                        type="range" min="1" max="10" 
                        value={selfScore} onChange={(e) => setSelfScore(Number(e.target.value))}
                        className="w-full accent-primary" 
                      />
                   </div>
                 </>
               )}
             </div>

             <Button 
               className="w-full h-14 mt-2 text-base font-bold rounded-2xl shadow-md" 
               onClick={moodDialogState === 'start' ? submitMoodStart : submitMoodEnd}
             >
               {moodDialogState === 'start' ? 'ابدأ العمل بشغف!' : 'حفظ التقييم والمغادرة'}
             </Button>
             <Button variant="ghost" className="rounded-xl h-10 text-muted-foreground" onClick={() => {
                if (moodDialogState === 'start') submitMoodStart();
                else submitMoodEnd();
             }}>
               تخطي
             </Button>
          </div>
        </div>
      )}

      {/* Overlay: Night Shift Attribution */}
      {nightShiftModalOpen && pendingNightJob && (
         <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 text-center" dir="rtl">
              <h3 className="text-xl font-bold">وردية ليلية</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لقد قمت بتسجيل الدخول بعد منتصف الليل. هل هذا الدوام استكمال لعمل الأمس أم بداية يوم جديد؟
              </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1 rounded-xl h-12" 
                  onClick={() => processSessionStart(pendingNightJob.type, pendingNightJob.entityId, false)}
                >
                  يوم جديد
                </Button>
                <Button 
                  className="flex-1 rounded-xl h-12" variant="outline"
                  onClick={() => processSessionStart(pendingNightJob.type, pendingNightJob.entityId, true)}
                >
                  دوام الأمس
                </Button>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Half Day Prompt */}
      {showHalfDayPrompt.show && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 text-center" dir="rtl">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mt-2">تسجيل إجازة نصف يوم؟</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
               لقد تأخرت عن موعد بدء العمل المعتاد بأكثر من ساعة. هل تود وتسجيل هذا اليوم كأنه <strong>نصف يوم عمل</strong>؟
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  className="w-full rounded-xl h-12 font-bold bg-orange-500 hover:bg-orange-600 text-white" 
                  onClick={() => handleHalfDayAccept(true)}
                >
                  نعم، سجل نصف يوم
                </Button>
                <Button 
                  variant="outline"
                  className="w-full rounded-xl h-12" 
                  onClick={() => handleHalfDayAccept(false)}
                >
                  لا، عمل كامل
                </Button>
              </div>
           </div>
         </div>
      )}

    </div>
  );
}
