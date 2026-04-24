import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Play, Square, Clock, Calendar, Coffee, FileText, Check, Bell, Zap, Timer, Shuffle, Brain, Loader2, Send } from 'lucide-react';
import { useWorkLog, isPublicHoliday } from '../../contexts/WorkLogContext';
import { useAICore } from '../../contexts/AICoreContext';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '../ui/input';

export default function HomeView() {
  const { activeSession, sessions, jobs, shifts, startSession, addSession, endSession, settings, getBalances, logSpecialSession, updateSession, updateActiveSession, toggleBreak } = useWorkLog();
  const { askAI } = useAICore();
  const [now, setNow] = useState(new Date());

  const isTodayRestDay = (settings.restDays || []).includes(now.getDay()) || isPublicHoliday(now, settings.customHolidays);

  // Modals state
  const [actionDialog, setActionDialog] = useState<'permission' | 'note' | 'pomodoro' | null>(null);
  const [dispatcherOpen, setDispatcherOpen] = useState(false);
  const [moodDialogState, setMoodDialogState] = useState<'start' | 'end' | null>(null);
  const [pendingStartData, setPendingStartData] = useState<{ type: any, jobId?: string } | null>(null);
  
  // AI Logging State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILogging, setIsAILogging] = useState(false);
  
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
  const [compensationLeaveSourceId, setCompensationLeaveSourceId] = useState<string>('');
  const [showHalfDayPrompt, setShowHalfDayPrompt] = useState<{show: boolean, type: any, entityId?: string, forceYesterday?: boolean}>({show: false, type: 'salary'});
  const [selectedPreEntryMode, setSelectedPreEntryMode] = useState<'regular' | 'annual_leave' | 'compensation' | 'half_day'>('regular');
  const [compensationTypeDialogOpen, setCompensationTypeDialogOpen] = useState(false);
  const [selectedCompType, setSelectedCompType] = useState<'1_day' | '1_day_plus_overtime' | '2_days'>('1_day');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryTime, setManualEntryTime] = useState(format(now, 'HH:mm'));

  const getAvailableCompensations = () => {
    return sessions.filter(s => s.isRestDayWork && !s.isArchived).map(s => {
      let accrued = 0;
      if (s.restDayCompensation === '1_day' || s.restDayCompensation === '1_day_plus_overtime') accrued = 1;
      else if (s.restDayCompensation === '2_days') accrued = 2;

      // Count how many compensation leaves point to this session
      const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
      return { ...s, availableDays: accrued - taken };
    }).filter(s => s.availableDays > 0);
  };

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

  // Auto Check-out for sessions exceeding 16 hours
  useEffect(() => {
    if (activeSession && currentSessionMinutes > 16 * 60) {
      const dummyTime = new Date(activeSession.startTime);
      // Auto-cap it at the expected end time or daily hours + 1 to denote an honest mistake
      dummyTime.setMinutes(dummyTime.getMinutes() + (settings.dailyHours * 60 + 60)); 
      endSession('انصراف آلي (16 ساعة تجاوز)', { endTime: dummyTime.toISOString() });
    }
  }, [activeSession, currentSessionMinutes, endSession, settings.dailyHours]);

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
    if (isTodayRestDay && selectedPreEntryMode === 'regular') {
       // It's a rest day. Let's ask for compensation type before starting via dialog.
       setCompensationTypeDialogOpen(true);
       return;
    }

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
  const [compensationOverrides, setCompensationOverrides] = useState<any>(null);
  const [overtimeAskDialog, setOvertimeAskDialog] = useState<{show: boolean, baseMins: number} | null>(null);

  const startSpecificSession = (type: any, entityId?: string) => {
    setDispatcherOpen(false);
    
    // Night Shift detection
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      setPendingNightJob({type, entityId});
      setNightShiftModalOpen(true);
      return;
    }
    
    processSessionStart(type, entityId, false, false, compensationOverrides);
    setCompensationOverrides(null);
  };

  const processSessionStart = (type: any, entityId?: string, forceYesterday?: boolean, skipHalfDayCheck?: boolean, explicitOverrides?: any) => {
    setNightShiftModalOpen(false);
    setPendingNightJob(null);
    let overrideData: any = { ...explicitOverrides };

    if (forceYesterday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      overrideData = { ...overrideData, startTime: yesterday.toISOString() };
    }

    // Grace Period Lateness logic
    let lateMins = 0;
    if (!skipHalfDayCheck && settings.system !== 'freelance' && settings.expectedStartTime && settings.usageComplexity === 'advanced' && settings.advancedRules?.gracePeriodMinutes) {
       const expectedStart = new Date();
       const [h, m] = settings.expectedStartTime.split(':').map(Number);
       expectedStart.setHours(h, m, 0, 0);
       const diffMins = (now.getTime() - expectedStart.getTime()) / 60000;
       
       if (diffMins > settings.advancedRules.gracePeriodMinutes) {
         // Ask user what to do since they hit grace period limit
         setShowHalfDayPrompt({show: true, type, entityId, forceYesterday, explicitOverrides, isGracePeriodHit: true, lateMins: Math.floor(diffMins)});
         return;
       }
    }

    // Half Day Check fallback
    if (!skipHalfDayCheck && settings.system !== 'freelance' && settings.expectedStartTime && (!settings.usageComplexity || settings.usageComplexity !== 'advanced')) {
       const expectedStart = new Date();
       const [h, m] = settings.expectedStartTime.split(':').map(Number);
       expectedStart.setHours(h, m, 0, 0);
       
       const diffMins = (now.getTime() - expectedStart.getTime()) / 60000;
       
       // If late by > 60 mins and less than half shift (e.g. 4 hours)
       if (diffMins > 60 && diffMins < (settings.dailyHours * 60 / 2)) {
         setShowHalfDayPrompt({show: true, type, entityId, forceYesterday, explicitOverrides, isGracePeriodHit: false});
         return;
       }
    }

    if (settings.modules?.healthMood) {
      setPendingStartData((prev) => ({ 
        type, 
        jobId: entityId, 
        overrideData: { ...prev?.overrideData, ...overrideData } 
      }));
      setMoodDialogState('start');
    } else {
      startSession(type, entityId, { ...pendingStartData?.overrideData, ...overrideData });
      setPendingStartData(null);
    }
  };

  const handleHalfDayAccept = (accept: boolean | string) => {
     const { type, entityId, forceYesterday, explicitOverrides, isGracePeriodHit, lateMins } = showHalfDayPrompt as any;
     setShowHalfDayPrompt({show: false, type});
     
     if (isGracePeriodHit) {
        // Calculate the backdated expected start time
        const expectedStart = new Date();
        const [h, m] = settings.expectedStartTime!.split(':').map(Number);
        expectedStart.setHours(h, m, 0, 0);

        if (accept === 'ignore_and_overtime') {
           // Will deduct from overtime tracking later, start as normal
           processSessionStart(type, entityId, forceYesterday, true, { ...explicitOverrides, startTime: expectedStart.toISOString() });
        } else if (accept === 'use_permission') {
           // Starts normal work, but deducts a permission
           processSessionStart(type, entityId, forceYesterday, true, { ...explicitOverrides, startTime: expectedStart.toISOString(), notes: `تأخير (${lateMins} دقيقة) - تم استخدام تصريح` });
        } else if (accept === 'count_full') {
           // Normal late log
           processSessionStart(type, entityId, forceYesterday, true, { ...explicitOverrides, startTime: expectedStart.toISOString(), dayStatus: 'late', notes: `خصم تأخير (${lateMins} دقيقة)` });
        }
     } else {
        if (accept === true) {
          logSpecialSession('half_day', { note: 'تأخير تلقائي' });
        } else {
          processSessionStart(type, entityId, forceYesterday, true, explicitOverrides);
        }
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
    // Check if we need to ask for dynamic overtime rounding
    if (activeSession && settings.usageComplexity === 'advanced' && settings.advancedRules?.overtimeRoundingStrategy === 'dynamic_ask') {
      const endTime = new Date();
      let duration = Math.round((endTime.getTime() - new Date(activeSession.startTime).getTime()) / 60000);
      let finalBreaks = activeSession.breaks || 0;
      if (activeSession.activeBreakStartTime) {
         finalBreaks += Math.round((endTime.getTime() - new Date(activeSession.activeBreakStartTime).getTime()) / 60000);
      }
      duration = Math.max(0, duration - finalBreaks);
      const isRestDay = activeSession.isRestDayWork || false;
      const compType = activeSession.restDayCompensation;
      
      let baseOvertime = 0;
      if (isRestDay) {
        if (compType === '1_day_plus_overtime') baseOvertime = duration;
        else if (compType === '2_days') baseOvertime = 0;
        else baseOvertime = compType === '1_day' ? 0 : duration; 
      } else {
        const expectedMins = settings.dailyHours * 60;
        baseOvertime = duration > expectedMins ? duration - expectedMins : 0;
      }

      if (baseOvertime > 0) {
        setOvertimeAskDialog({ show: true, baseMins: baseOvertime });
        return;
      }
    }
    
    proceedEndSession();
  };

  const proceedEndSession = (overtimeOverride?: number) => {
    const finalNotes = noteText || 'انتهى العمل';
    const manualData = overtimeOverride !== undefined ? { overtimeMinutes: overtimeOverride } : undefined;
    
    if (settings.modules?.healthMood) {
      setMoodDialogState('end');
      if (manualData) {
        setPendingStartData({ overrideData: manualData } as any);
      }
    } else {
      endSession(finalNotes, manualData);
    }
  };

  const submitMoodEnd = () => {
    const combinedNotes = `${noteText ? noteText + '\n' : ''}[المزاج النهائي: ${moodScore}/5 | الإنجاز: ${selfScore}/10]`;
    const manualData = pendingStartData?.overrideData || undefined;
    endSession(combinedNotes, manualData as any);
    setMoodDialogState(null);
    setPendingStartData(null);
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

  const processAILog = async () => {
    if (!aiPrompt.trim()) return;
    setIsAILogging(true);
    try {
      const response = await askAI(
        `قم بتحليل هذا النص: "${aiPrompt}". واستخرج منه البيانات التالية بتنسيق JSON فقط:
        - action: (إما "log_past_session" إذا كان يذكر عملاً انتهى، أو "start_new" إذا كان سيبدأ الآن)
        - durationMinutes: (المدة بالدقائق إذا صرح بها، وإلا 0)
        - breakMinutes: (مدة الاستراحة بالدقائق إن ذكرها، وإلا 0)
        - projectKeywords: (كلمة دالة على المشروع إذا ذكر، وإلا فارغ)
        - notes: (توليد ملاحظة احترافية بناءً على المدخل)`,
        "أنت مساعد استخراج بيانات تقوم بإرجاع JSON صالح فقط ولا شيء غيره.",
        {
          type: "object",
          properties: {
             action: { type: "string" },
             durationMinutes: { type: "number" },
             breakMinutes: { type: "number" },
             projectKeywords: { type: "string" },
             notes: { type: "string" }
          }
        }
      );
      
      const parsed = JSON.parse(response);
      let targetJobStr = parsed.projectKeywords;
      let matchedJobId = undefined;

      if (targetJobStr) {
         const match = jobs.find(j => j.name.toLowerCase().includes(targetJobStr.toLowerCase()));
         if (match) matchedJobId = match.id;
      }

      if (parsed.action === 'log_past_session' && parsed.durationMinutes > 0) {
         // Create a past session right now
         const end = new Date();
         const start = addMinutes(end, -parsed.durationMinutes);
         
         const dummySession: WorkSession = {
           id: Date.now().toString(),
           startTime: start.toISOString(),
           endTime: end.toISOString(),
           duration: parsed.durationMinutes - (parsed.breakMinutes || 0),
           breaks: parsed.breakMinutes || 0,
           type: matchedJobId ? 'project' : (settings.system === 'freelance' ? 'freelance' : 'salary'),
           jobId: matchedJobId,
           location: 'office',
           dayStatus: 'work',
           notes: parsed.notes || 'تسجيل ذكي'
         };
         
         addSession(dummySession);

      } else {
         startSession(matchedJobId ? 'project' : 'salary', matchedJobId, { notes: parsed.notes });
      }

      setAiPrompt('');
      alert('تم التسجيل بنجاح عبر المحرك الذكي!');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ في فهم طلبك. تأكد من إدخال المفتاح في الإعدادات.');
    } finally {
      setIsAILogging(false);
    }
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
      <div className="flex justify-between items-start px-1 mb-2 shrink-0 pt-2" dir="rtl">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">سجل يومك</h2>
          <p className="text-[10px] font-bold text-muted-foreground mt-1 tracking-wide">{format(now, 'EEEE، d MMMM', { locale: ar })}</p>
          <p className="text-[9px] font-medium text-muted-foreground/80 mt-0.5">
             {new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(now)}
          </p>
        </div>
        <div className="flex gap-2 items-center mt-1">
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
        <div className="flex flex-col gap-3 mx-1 flex-1 justify-center min-h-0 relative z-10 pb-16">
          
          {/* Card 1: Main Metric & Check-out */}
          <div className="relative bg-card rounded-[2rem] p-6 shadow-sm border border-border/50 flex flex-col items-center gap-6 shrink-0 mt-4">
            
            <div className="flex flex-col items-center w-full" dir="rtl">
              <span className="text-sm font-bold text-foreground mb-4">
                {isTodayRestDay && !activeSession ? 'هل لديك عمل إضافي اليوم؟' : 'سجل اليوم:'}
              </span>
              
              <div className="flex items-center justify-center w-48 h-48 rounded-full border-8 border-secondary relative mb-2">
                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-emerald-500 opacity-20" />
                    <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-emerald-500 transition-all duration-1000 ease-out" 
                       strokeDasharray={`${Math.min(289, (totalMinutesToday / (settings.dailyHours * 60)) * 289)} 289`}
                    />
                 </svg>
                 <div className="flex flex-col items-center justify-center relative z-10">
                    <span className="text-5xl font-black tracking-tighter text-foreground drop-shadow-sm leading-none">{displayHours}</span>
                    <span className="text-sm text-foreground/60 font-medium mt-1">ساعات</span>
                 </div>
              </div>
            </div>

            <button 
              onClick={() => activeSession ? handleEndSession() : handlePreEntrySubmit()}
              className={`w-full rounded-[1.2rem] h-14 font-extrabold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                activeSession 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg' 
                  : selectedPreEntryMode === 'regular' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 shadow-lg'
                  : selectedPreEntryMode === 'half_day' ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 shadow-lg'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg'
              }`}
            >
              {activeSession ? (
                <>
                   <Square className="fill-current w-5 h-5 flex-shrink-0" />
                   تسجيل الانصراف
                </>
              ) : (
                <>
                   {selectedPreEntryMode === 'regular' ? (
                     <>تسجيل الحضور</>
                   ) : selectedPreEntryMode === 'half_day' ? (
                     <>تسجيل نصف يوم</>
                   ) : (
                     <>تسجيل إجازة</>
                   )}
                </>
              )}
            </button>
            {!activeSession && selectedPreEntryMode === 'regular' && (
              <div className="flex justify-center -mt-2 w-full">
                 <Button variant="link" className="text-[11px] font-medium text-muted-foreground h-auto p-0 hover:text-foreground" onClick={() => setShowManualEntry(true)}>
                   تسجيل وقت مختلف؟
                 </Button>
              </div>
            )}

            {!activeSession && (
               <div className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none snap-x mt-1" dir="rtl">
                 <Button 
                   variant={selectedPreEntryMode === 'regular' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-9 px-4 text-xs font-bold flex-1 ${selectedPreEntryMode === 'regular' ? 'bg-emerald-600 text-white' : 'bg-secondary/50 text-foreground hover:bg-secondary'}`}
                   onClick={() => setSelectedPreEntryMode('regular')}
                 >
                   {isTodayRestDay ? 'إضافي' : 'عمل منتظم'}
                 </Button>
                 <Button 
                   variant={selectedPreEntryMode === 'half_day' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-9 px-4 text-xs font-bold flex-1 ${selectedPreEntryMode === 'half_day' ? 'bg-orange-500 text-white' : 'bg-secondary/50 text-foreground hover:bg-secondary'}`}
                   onClick={() => setSelectedPreEntryMode('half_day')}
                 >
                   نصف يوم
                 </Button>
                 <Button 
                   variant={selectedPreEntryMode === 'annual_leave' ? 'default' : 'secondary'} 
                   className={`snap-start shrink-0 rounded-xl h-9 px-4 text-xs font-bold flex-1 ${selectedPreEntryMode === 'annual_leave' ? 'bg-indigo-500 text-white' : 'bg-secondary/50 text-foreground hover:bg-secondary'}`}
                   onClick={() => setSelectedPreEntryMode('annual_leave')}
                 >
                   إجازة كاملة
                 </Button>
               </div>
            )}
            
            {/* Action Bar (Only shows during active session) */}
            {activeSession && (
              <div className="flex gap-2 w-full mt-2 z-10">
                <Button 
                  variant="secondary" 
                  className={`flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 text-xs ${activeSession.activeBreakStartTime ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : ''}`}
                  onClick={toggleBreak}
                >
                  <Coffee className="w-3.5 h-3.5 mr-1" />
                  {activeSession.activeBreakStartTime ? 'إنهاء الاستراحة' : 'استراحة'}
                </Button>
                <Button variant="secondary" className="flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={() => setDispatcherOpen(true)}>
                  <Shuffle className="w-3.5 h-3.5 mr-1" /> تبديل
                </Button>
                <Button variant="secondary" className="flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={openNoteDialog}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> مذكرات
                </Button>
              </div>
            )}
          </div>

          {/* Floating AI Record Button */}
          {settings.customAIApiKey && (
             <div className="fixed bottom-24 left-4 z-50">
               <Sheet>
                 <SheetTrigger asChild>
                   <Button className="w-14 h-14 rounded-full shadow-2xl shadow-indigo-500/30 bg-indigo-500 hover:bg-indigo-600 text-white p-0 flex items-center justify-center border-[3px] border-background animate-in slide-in-from-bottom-4">
                      <Brain className="w-6 h-6" />
                   </Button>
                 </SheetTrigger>
                 <SheetContent side="bottom" className="rounded-t-[2rem] z-[110] p-6 text-center shadow-2xl">
                   <SheetHeader className="pb-4">
                     <SheetTitle className="text-xl font-bold flex items-center justify-center gap-2">
                       <Brain className="w-5 h-5 text-indigo-500" /> التسجيل الذكي
                     </SheetTitle>
                     <p className="text-xs text-muted-foreground font-medium mt-1">تحدث أو اكتب ما قمت به وسيتولى الذكاء تنظيم السجل.</p>
                   </SheetHeader>
                   <div className="flex flex-col gap-4 mt-2" dir="rtl">
                      <Input 
                        placeholder="مثال: اشتغلت ساعتين وطلعت نص ساعة بريك"
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        className="text-sm h-14 rounded-xl border-border/50 bg-background/50 font-medium"
                        onKeyDown={e => e.key === 'Enter' && processAILog()}
                      />
                      <Button onClick={processAILog} disabled={!aiPrompt || isAILogging} className="w-full h-14 rounded-xl text-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg">
                         {isAILogging ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تسجيل الآن'}
                      </Button>
                   </div>
                 </SheetContent>
               </Sheet>
             </div>
          )}

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
                <span className="font-bold text-foreground flex items-center gap-2">
                  {activeSession ? format(new Date(activeSession.startTime), "hh:mm a", {locale: ar}) : '--:--'}
                  {activeSession && (
                     <Button variant="ghost" size="icon" className="w-6 h-6 p-0 opacity-50 hover:opacity-100" onClick={() => setShowManualEntry(true)}>
                       <Clock className="w-3.5 h-3.5" />
                     </Button>
                  )}
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
                     else {
                       workMins += (s.duration || 0);
                     }
                   });

                   if (activeSession) {
                     const sDate = new Date(activeSession.startTime);
                     if (sDate.getDate() === now.getDate() && sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear()) {
                       // @ts-ignore - Assuming currentSessionMinutes is available in this scope
                       workMins += currentSessionMinutes;
                     }
                   }

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
              {!isFreelance && balances.remainingPermissionsHours >= 2 && (
                <Button 
                  variant="secondary" 
                  className="snap-start shrink-0 bg-secondary/30 rounded-[1rem] h-12 px-6 shadow-sm border border-white/5 flex gap-2 text-indigo-400"
                  onClick={() => openPermissionDialog(2)}
                >
                  <Clock className="w-4 h-4" />
                  تصريح (ساعتين)
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

               {absenceType === 'compensation' && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="text-sm font-bold mt-2">اختر العمل الإضافي المراد استبداله</label>
                   <select 
                     className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm mt-1"
                     value={compensationLeaveSourceId}
                     onChange={(e) => setCompensationLeaveSourceId(e.target.value)}
                   >
                     <option value="">-- اختر يوم العمل --</option>
                     {getAvailableCompensations().map(comp => (
                       <option key={comp.id} value={comp.id}>
                         {format(new Date(comp.startTime), 'EEEE، dd MMM yyyy', {locale: ar})} 
                         (متاح {comp.availableDays} يوم)
                       </option>
                     ))}
                   </select>
                   {getAvailableCompensations().length === 0 && (
                     <p className="text-xs text-destructive mt-1">عفواً، لا يوجد لديك رصيد أيام بديلة متاح.</p>
                   )}
                 </div>
               )}

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
                disabled={absenceType === 'compensation' && (!compensationLeaveSourceId || getAvailableCompensations().length === 0)}
                onClick={() => {
                  if (absenceType === 'compensation' && compensationLeaveSourceId) {
                    const sessionToLog: any = {
                      id: Date.now().toString(),
                      type: 'salary',
                      startTime: new Date(absenceDate).toISOString(),
                      endTime: new Date(absenceDate).toISOString(),
                      duration: settings.dailyHours * 60,
                      breaks: 0,
                      location: 'office',
                      dayStatus: 'compensation',
                      notes: noteText || 'إجازة كبديل لعمل يوم راحة',
                      linkedCompensationSessionId: compensationLeaveSourceId,
                      isArchived: false
                    };
                    addSession(sessionToLog);
                  } else {
                    handleSmartAction(() => logSpecialSession(absenceType, { date: absenceDate, note: noteText }));
                  }
                  
                  setAbsenceDialogOpen(false);
                  setNoteText('');
                  setCompensationLeaveSourceId('');
                  
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

      {/* Overlay: Half Day Prompt / Lateness */}
      {showHalfDayPrompt.show && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 text-center" dir="rtl">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              
              {showHalfDayPrompt.isGracePeriodHit ? (
                <>
                  <h3 className="text-xl font-bold mt-2 text-center text-orange-500">تجاوز وقت السماح</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed text-center">
                    لقد تأخرت بنسبة <strong>{(showHalfDayPrompt as any).lateMins} دقيقة</strong>، ووقت السماح هو {settings.advancedRules?.gracePeriodMinutes} دقيقة.
                    كيف تود التعامل مع هذا التأخير؟
                  </p>
                  <div className="flex flex-col gap-2 mt-4 text-sm gap-y-3">
                    <Button 
                      onClick={() => handleHalfDayAccept('ignore_and_overtime')} 
                      className="bg-indigo-500 hover:bg-indigo-600 rounded-xl whitespace-normal h-auto py-2"
                    >
                      لا تحسب التأخير (سأعوضه لاحقاً أو كإضافي)
                    </Button>
                    <Button 
                      onClick={() => handleHalfDayAccept('use_permission')} 
                      variant="outline" 
                      className="rounded-xl border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                    >
                      استخدام تصريح تأخير
                    </Button>
                    <Button 
                      onClick={() => handleHalfDayAccept('count_full')} 
                      variant="ghost" 
                      className="rounded-xl text-muted-foreground"
                    >
                      احتساب كخصم تأخير
                    </Button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
           </div>
         </div>
      )}

      {/* Overlay: Compensation Type Prompt for Rest Days */}
      {compensationTypeDialogOpen && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mt-2 text-center">عمل في يوم راحة</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                كيف تود تعويض هذا اليوم في نظام البدائل؟
              </p>
              
              <div className="flex flex-col gap-2 mt-2">
                 <Button 
                   variant={selectedCompType === '1_day' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('1_day')}
                 >
                   بدل راحة (تعويض بيوم إجازة بديل)
                 </Button>
                 <Button 
                   variant={selectedCompType === '1_day_plus_overtime' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('1_day_plus_overtime')}
                 >
                   بديل يوم + إضافة ساعات كعمل إضافي
                 </Button>
                 <Button 
                   variant={selectedCompType === '2_days' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('2_days')}
                 >
                   تعويض بيومين إجازة
                 </Button>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1 rounded-xl h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white" 
                  onClick={() => {
                    setCompensationTypeDialogOpen(false);
                    // Pass the compensation type into the dispatcher logic so it gets attached to the session
                    // We need a subtle overrideData
                    setCompensationOverrides({ restDayCompensation: selectedCompType });
                    // It will proceed to normal dispatcher or start after this
                    if (shifts.length > 0 || jobs.length > 0) {
                      setDispatcherOpen(true);
                    } else {
                      startSpecificSession('salary');
                    }
                  }}
                >
                  تأكيد والمتابعة
                </Button>
                <Button 
                  variant="ghost"
                  className="rounded-xl h-12" 
                  onClick={() => setCompensationTypeDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Manual Past Session Entry */}
      {showManualEntry && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8">
              <h3 className="text-xl font-bold mt-2 text-center">تسجيل دخول فائت</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                لم تقم بتسجيل الدخول في وقتها؟ أدخل الوقت الفعلي أدناه.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">وقت البدء الفعلي</label>
                  <Input 
                    type="time" 
                    value={manualEntryTime}
                    onChange={(e) => setManualEntryTime(e.target.value)}
                    className="h-12 bg-secondary/50 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                     className="flex-1 rounded-xl h-12"
                     onClick={() => {
                        setShowManualEntry(false);
                        const [th, tm] = manualEntryTime.split(':').map(Number);
                        const modifiedStart = new Date(now);
                        modifiedStart.setHours(th, tm, 0, 0);
                        
                        // if user entered a time in the future, maybe it meant yesterday?
                        if (modifiedStart > now) {
                           modifiedStart.setDate(modifiedStart.getDate() - 1);
                        }
                        if (activeSession) {
                           updateActiveSession({ startTime: modifiedStart.toISOString() });
                        } else {
                           processSessionStart('salary', undefined, false, true, { startTime: modifiedStart.toISOString() });
                        }
                     }}
                  >
                     {activeSession ? 'تحديث وقت البدء' : 'تأكيد وبدء'}
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setShowManualEntry(false)}>
                     إلغاء
                  </Button>
                </div>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Dynamic Overtime Ask */}
      {overtimeAskDialog?.show && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 text-center">
              <h3 className="text-xl font-bold mt-2 text-primary">تسجيل الإضافي</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                لقد عملت وقت إضافي مقداره <span className="font-bold text-foreground">{Math.floor(overtimeAskDialog.baseMins / 60)} ساعة و {overtimeAskDialog.baseMins % 60} دقيقة</span>. كيف تود احتسابه؟
              </p>
              
              <div className="flex flex-col gap-2 mt-2">
                  <Button 
                     className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90"
                     onClick={() => {
                        proceedEndSession(overtimeAskDialog.baseMins);
                        setOvertimeAskDialog(null);
                     }}
                  >
                     احتسابه كما هو بالدقيقة
                  </Button>
                  <Button 
                     variant="outline"
                     className="w-full rounded-xl h-12"
                     onClick={() => {
                        // Round up to nearest hour
                        proceedEndSession(Math.ceil(overtimeAskDialog.baseMins / 60) * 60);
                        setOvertimeAskDialog(null);
                     }}
                  >
                     جبره للأعلى ({Math.ceil(overtimeAskDialog.baseMins / 60)} ساعة)
                  </Button>
                  <Button 
                     variant="outline"
                     className="w-full rounded-xl h-12"
                     onClick={() => {
                        // Round down to nearest hour
                        proceedEndSession(Math.floor(overtimeAskDialog.baseMins / 60) * 60);
                        setOvertimeAskDialog(null);
                     }}
                  >
                     اختار التقريب وتجاهل الكسر ({Math.floor(overtimeAskDialog.baseMins / 60)} ساعة)
                  </Button>
              </div>
           </div>
         </div>
      )}

    </div>
  );
}
