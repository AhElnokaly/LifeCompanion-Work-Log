import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Play, Square, Clock, Calendar, Coffee, FileText, Check, Bell, Zap, Timer, Shuffle, Brain, Loader2, Send, Activity, Moon, Sun, Sunrise, Sunset, Plus, Minus, LogIn, LogOut, Palmtree } from 'lucide-react';
import { useWorkLog, isPublicHoliday } from '../../contexts/WorkLogContext';
import { useAICore } from '../../contexts/AICoreContext';
import { format, differenceInMinutes, addMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Input } from '../ui/input';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { WorkSession } from '../../types';
import { toast } from 'sonner';
import { detectPermissionType, generateSmartInsights, AttendanceInsight } from '../../lib/smartAttendance';

export default function HomeView() {
  const { activeSession, sessions, jobs, shifts, shiftAssignments, startSession, addSession, endSession, settings, updateSettings, getBalances, logSpecialSession, updateSession, updateActiveSession, toggleBreak } = useWorkLog();
  const { askAI } = useAICore();
  const [now, setNow] = useState(new Date());

  const isTodayRestDay = (settings.restDays || []).includes(now.getDay()) || isPublicHoliday(now, settings.customHolidays);

  // Modals state
  const [actionDialog, setActionDialog] = useState<'permission' | 'note' | 'pomodoro' | null>(null);
  const [dispatcherOpen, setDispatcherOpen] = useState(false);
  const [moodDialogState, setMoodDialogState] = useState<'start' | 'end' | null>(null);
  const [pendingStartData, setPendingStartData] = useState<{ type: any, jobId?: string, overrideData?: any } | null>(null);
  
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
  const [showHalfDayPrompt, setShowHalfDayPrompt] = useState<{show: boolean, type: any, entityId?: string, forceYesterday?: boolean, explicitOverrides?: any, isGracePeriodHit?: boolean, lateMins?: number}>({show: false, type: 'salary'});
  const [selectedPreEntryMode, setSelectedPreEntryMode] = useState<'regular' | 'annual_leave' | 'compensation' | 'half_day_leave'>('regular');
  const [compensationTypeDialogOpen, setCompensationTypeDialogOpen] = useState(false);
  const [selectedCompType, setSelectedCompType] = useState<'1_day' | '1_day_plus_overtime' | '2_days'>('1_day');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryTime, setManualEntryTime] = useState(format(now, 'HH:mm'));
  
  const [isLeaveSheetOpen, setIsLeaveSheetOpen] = useState(false);
  const [isPermissionSheetOpen, setIsPermissionSheetOpen] = useState(false);

  const [retroDialogOpen, setRetroDialogOpen] = useState(false);
  const [retroDate, setRetroDate] = useState(format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd'));
  const [retroStart, setRetroStart] = useState('09:00');
  const [retroEnd, setRetroEnd] = useState('17:00');
  const [retroType, setRetroType] = useState<'salary' | 'freelance' | 'project' | 'annual_leave' | 'sick_leave' | 'half_day_leave' | 'casual_leave' | 'permission' | 'compensation' | 'rest_day_work'>('salary');
  const [retroJobId, setRetroJobId] = useState<string>('none');
  const [retroBreak, setRetroBreak] = useState('0');
  const [retroCompType, setRetroCompType] = useState<'1_day' | '1_day_plus_overtime' | '2_days'>('1_day');

  const activeInsight = useMemo(() => {
     const insights = generateSmartInsights(sessions, settings, jobs, shifts, shiftAssignments);
     if (!insights || insights.length === 0) return null;
     // Pick a random insight based on today's date so it doesn't flicker too often, or just random
     const daySeed = new Date().getDate();
     return insights[daySeed % insights.length];
  }, [sessions, settings, jobs, shifts, shiftAssignments]);


  const getAvailableCompensations = (dateBeingProcessed: string = format(now, 'yyyy-MM-dd')) => {
    return sessions.filter(s => s.isRestDayWork && !s.isArchived).map(s => {
      let accrued = 0;
      if (s.restDayCompensation === '1_day' || s.restDayCompensation === '1_day_plus_overtime') accrued = 1;
      else if (s.restDayCompensation === '2_days') accrued = 2;

      // Check validity
      const validityDays = settings.compensationValidityDays || 30; // default 30
      const daysSinceEarned = (new Date(dateBeingProcessed).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24);
      const isExpired = daysSinceEarned > validityDays && !s.compensationException;

      // Count how many compensation leaves point to this session
      const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
      return { ...s, availableDays: accrued - taken, isExpired, daysUntilExpiry: Math.floor(validityDays - daysSinceEarned) };
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
     } else if (selectedPreEntryMode === 'half_day_leave') {
        logSpecialSession('half_day_leave');
     } else {
        setAbsenceType(selectedPreEntryMode as any);
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
      import('../../lib/notifications').then(({ sendAppNotification, playAlarm }) => {
         if (settings.notificationsEnabled) {
            sendAppNotification('انتهت جلسة التركيز', { body: 'أحسنت! خذ استراحة قصيرة لتجديد نشاطك.' });
            if (settings.notificationPreferences?.pomodoro) {
               playAlarm(settings.notificationPreferences?.alarmSound || 'digital');
            }
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
    (s.dayStatus === 'annual_leave' && (s.duration || 0) >= targetMins) || 
    s.dayStatus === 'casual_leave' ||
    s.dayStatus === 'sick_leave' ||
    s.dayStatus === 'compensation'
  );

  const getLeaveIcon = () => {
    if (todaySessions.some(s => s.dayStatus === 'compensation')) return <Coffee className="w-16 h-16 text-red-500/50 mb-4" />;
    return <Calendar className="w-16 h-16 text-emerald-500/50 mb-4" />;
  };

  const getLeaveText = () => {
    if (todaySessions.some(s => s.dayStatus === 'compensation')) return "تستمتع بيوم راحة كـ (بديل)";
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
          logSpecialSession('half_day_leave', { note: 'تأخير تلقائي' });
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

  const submitRetroSession = () => {
    if (!retroDate) return;
    
    // Parse times
    const startStr = `${retroDate}T${retroStart}:00`;
    const endStr = `${retroDate}T${retroEnd}:00`;
    
    const startTimeDate = new Date(startStr);
    const endTimeDate = new Date(endStr);
    
    // Check validity
    if (endTimeDate < startTimeDate && !['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave', 'permission', 'compensation'].includes(retroType)) {
      toast.error("وقت الانصراف يجب أن يكون بعد وقت الحضور");
      return;
    }

    const startIso = startTimeDate.toISOString();
    const endIso = endTimeDate.toISOString();
    let duration = differenceInMinutes(endTimeDate, startTimeDate);
    const breaks = parseInt(retroBreak) || 0;
    duration = Math.max(0, duration - breaks);

    const isRestDayWork = retroType === 'rest_day_work';

    if (['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave', 'permission', 'compensation'].includes(retroType)) {
       if (retroType === 'compensation' && !compensationLeaveSourceId) {
          toast.error("يرجى اختيار يوم العمل الإضافي المراد استبداله");
          return;
       }
       addSession({
         id: Date.now().toString(),
         startTime: startIso,
         endTime: startIso,
         type: 'salary',
         duration: retroType === 'half_day_leave' ? (settings.dailyHours * 60) / 2 : (retroType === 'permission' ? 60 : settings.dailyHours * 60),
         dayStatus: retroType as any,
         linkedCompensationSessionId: retroType === 'compensation' ? compensationLeaveSourceId : undefined,
         location: 'remote',
         notes: noteText || 'أدخلت يدويا من سجل الأيام السابقة'
       } as any);
    } else {
       addSession({
         id: Date.now().toString(),
         startTime: startIso,
         endTime: endIso,
         type: retroType === 'rest_day_work' ? 'salary' : (retroType as any),
         jobId: retroJobId !== 'none' ? retroJobId : undefined,
         duration,
         breaks,
         dayStatus: 'work',
         isRestDayWork,
         restDayCompensation: isRestDayWork ? retroCompType : undefined,
         location: 'office',
         notes: noteText || 'أدخلت يدويا من سجل الأيام السابقة'
       } as any);
    }

    setRetroDialogOpen(false);
    setNoteText('');
    alert('تم إضافة السجل بنجاح!');
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
    const pType = detectPermissionType(new Date(), settings, shifts, shiftAssignments);
    setPermissionType(pType);
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
        - action: (إما "log_past_session" للإضافة المباشرة ليوم عمل، أو "start_new" للبدء الآن، أو "log_leave" لتسجيل إجازة، أو "log_permission" لإذن أو نصف يوم)
        - leaveType: (إذا كان إجازة: "annual_leave", "sick_leave", "casual_leave", وإلا اتركه فارغ)
        - durationMinutes: (المدة بالدقائق إذا صرح بها للاستئذان أو العمل، وإلا 0)
        - breakMinutes: (مدة الاستراحة بالدقائق إن ذكرها، وإلا 0)
        - projectKeywords: (كلمة دالة على المشروع إذا ذكر، وإلا فارغ)
        - notes: (توليد ملاحظة احترافية بناءً على المدخل)`,
        "أنت مساعد استخراج بيانات تقوم بإرجاع JSON صالح فقط ولا شيء غيره.",
        {
          type: "object",
          properties: {
             action: { type: "string" },
             leaveType: { type: "string" },
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

      if (parsed.action === 'log_leave') {
         logSpecialSession((parsed.leaveType as any) || 'casual_leave', { note: parsed.notes || 'تسجيل ذكي للإجازة' });
      } else if (parsed.action === 'log_permission') {
         logSpecialSession('permission', { hours: (parsed.durationMinutes || 60) / 60, note: parsed.notes || 'تسجيل ذكي للإذن' });
      } else if (parsed.action === 'log_past_session' && parsed.durationMinutes > 0) {
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
      toast.success('تم التسجيل بنجاح عبر المحرك الذكي!');
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

  // Dynamic header based on time of day
  const hour = now.getHours();
  let timeGreeting = '';
  let timeGradient = '';
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'صباح الخير';
    timeGradient = 'from-amber-400 to-orange-500'; 
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'طاب يومك';
    timeGradient = 'from-sky-400 to-blue-600'; 
  } else if (hour >= 17 && hour < 20) {
    timeGreeting = 'مساء الخير';
    timeGradient = 'from-rose-400 to-purple-600'; 
  } else {
    timeGreeting = 'طابت ليلتك';
    timeGradient = 'from-indigo-800 to-slate-900'; 
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-700 max-w-sm w-full mx-auto pb-4" dir="ltr">
      
      {/* Date / Title Row */}
      <div className={`bg-gradient-to-br ${timeGradient} rounded-[2rem] p-6 text-white text-center shadow-lg relative overflow-hidden shrink-0 mt-2 mx-1`} dir="rtl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full border-[16px] border-white/10 opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center">
           <div className="flex items-center justify-center gap-2 mb-2">
             {hour >= 5 && hour < 12 ? <Sunrise className="w-5 h-5 text-white/90" /> : 
              hour >= 12 && hour < 17 ? <Sun className="w-5 h-5 text-white/90" /> : 
              hour >= 17 && hour < 20 ? <Sunset className="w-5 h-5 text-white/90" /> : 
              <Moon className="w-5 h-5 text-white/90" />}
             <span className="text-sm font-medium text-white/90">{timeGreeting}</span>
           </div>
           <h2 className="text-2xl font-bold mb-1">
             {format(now, 'EEEE، d MMMM', { locale: ar })}
           </h2>
           <p className="text-sm text-white/80 mt-1">سجل حضورك اليوم بدقة وأناقة.</p>
        </div>
      </div>

      {isOnFullDayLeave ? (
         <div className="flex flex-col items-center justify-center bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl my-auto text-center mx-1 flex-1 mt-4" dir="rtl">
            {getLeaveIcon()}
            <span className="text-lg font-bold tracking-wide">
              {getLeaveText()}
            </span>
            <p className="text-xs text-muted-foreground mt-2 opacity-60 leading-relaxed">
              نتمنى لك يوماً سعيداً بعيداً عن ضغوط العمل
            </p>
         </div>
      ) : (
        <div className="flex flex-col gap-3 mx-1 flex-1 min-h-0 relative z-10 pb-16 mt-4">
        


        {/* Today's Details Card */}
        <div className="bg-card rounded-[2rem] p-6 border border-border/50 shadow-sm shrink-0 flex flex-col gap-6" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">تفاصيل اليوم</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-center">
            <div className="flex flex-col gap-1.5 justify-center group relative">
               <span className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                 تسجيل دخول
               </span>
               <span className="text-xl font-bold font-mono tracking-tight">{activeSession ? format(new Date(activeSession.startTime), "HH:mm") : '--:--'}</span>
            </div>
            <div className="flex flex-col gap-1.5 justify-center">
               <span className="text-xs text-muted-foreground font-medium">تسجيل خروج</span>
               <span className="text-xl font-bold font-mono tracking-tight">{!activeSession || expectedCheckoutStr === '--:--' ? '--:--' : expectedCheckoutStr.replace('ص', '').replace('م', '').trim()}</span>
            </div>
            <div className="flex flex-col gap-1.5 justify-center">
               <span className="text-xs text-muted-foreground font-medium">الإجمالي</span>
               <span className="text-xl font-bold font-mono tracking-tight">{displayHours} <span className="text-sm font-normal text-muted-foreground">س</span></span>
            </div>
            <div className="flex flex-col gap-1.5 justify-center">
               <span className="text-xs text-muted-foreground font-medium">س إضافي</span>
               <span className="text-xl font-bold font-mono tracking-tight text-emerald-500">{(overtimeMinutes / 60).toFixed(1)} <span className="text-sm font-normal text-emerald-500/70">س</span></span>
            </div>
          </div>
          {/* Action Bar inside details (Only shows during active session) */}
          {activeSession && (
            <div className="flex gap-2 w-full mt-2 border-t pt-4">
              <Button 
                variant="secondary" 
                className={`flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 text-xs ${activeSession.activeBreakStartTime ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : ''}`}
                onClick={toggleBreak}
              >
                <Coffee className="w-3.5 h-3.5 ml-1" />
                {activeSession.activeBreakStartTime ? 'إنهاء الاستراحة' : 'استراحة'}
              </Button>
              <Button variant="secondary" className="flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={() => setDispatcherOpen(true)}>
                <Shuffle className="w-3.5 h-3.5 ml-1" /> تبديل
              </Button>
              <Button variant="secondary" className="flex-1 rounded-xl h-10 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={openNoteDialog}>
                <FileText className="w-3.5 h-3.5 ml-1" /> مذكرات
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0" dir="rtl">
           <button 
              onClick={() => {
                 if (activeSession) {
                    setManualEntryTime(format(new Date(activeSession.startTime), "HH:mm"));
                    setShowManualEntry(true);
                 } else if (!isOnFullDayLeave) {
                    handleStartSession();
                 }
              }} 
              disabled={!activeSession && isOnFullDayLeave} 
              className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center h-[110px] shadow-sm group ${(!isOnFullDayLeave || activeSession) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${activeSession ? 'bg-teal-500/10 text-teal-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                 {activeSession ? <Clock className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              </div>
              <span className="text-sm font-bold text-foreground">{activeSession ? 'تعديل الدخول' : 'تسجيل دخول'}</span>
           </button>
           
           <button onClick={() => activeSession && handleEndSession()} disabled={!activeSession} className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center h-[110px] shadow-sm group ${activeSession ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 transition-transform group-hover:scale-110">
                 <LogOut className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground">تسجيل خروج</span>
           </button>

           <button onClick={() => setIsPermissionSheetOpen(true)} disabled={isOnFullDayLeave} className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center h-[110px] shadow-sm group ${(!isOnFullDayLeave) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 transition-transform group-hover:scale-110">
                 <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground">إذن/نصف يوم</span>
           </button>

           <button onClick={() => setIsLeaveSheetOpen(true)} disabled={!!activeSession || isOnFullDayLeave} className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center h-[110px] shadow-sm group ${(!activeSession && !isOnFullDayLeave) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110">
                 <Palmtree className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground">تسجيل إجازة</span>
           </button>
        </div>

          {/* Floating AI Record Button */}
          {settings.customAIApiKey && (
             <div className="fixed bottom-24 left-4 z-50">
               <Sheet>
                 <SheetTrigger render={<Button className="w-14 h-14 rounded-full shadow-2xl shadow-indigo-500/30 bg-indigo-500 hover:bg-indigo-600 text-white p-0 flex items-center justify-center border-[3px] border-background animate-in slide-in-from-bottom-4" />}>
                      <Brain className="w-6 h-6" />
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
            <div className="flex flex-col gap-3 mb-2 shrink-0">
              {/* Base Work Hours */}
              <div className="bg-card rounded-[1.5rem] p-4 border border-border/50 flex items-center justify-between shadow-sm" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                     <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-bold text-foreground">ساعات العمل الأساسية</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">سيتم حساب الإضافي بناءً عليها</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-secondary/30 rounded-xl px-2 py-1.5 border border-border/40">
                  <button onClick={() => updateSettings({ ...settings, dailyHours: Math.min(24, settings.dailyHours + 1) })} className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/50 text-foreground hover:bg-secondary">
                     <Plus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-sm w-4 text-center">{settings.dailyHours}</span>
                  <button onClick={() => updateSettings({ ...settings, dailyHours: Math.max(1, settings.dailyHours - 1) })} className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/50 text-foreground hover:bg-secondary">
                     <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Daily Quote */}
              <div className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-4 text-center">
                 <p className="text-xs font-medium text-foreground/80 italic leading-relaxed" dir="rtl">"{dailyQuote}"</p>
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
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.2rem] p-3 flex flex-col items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                 <Zap className="w-4 h-4 fill-current opacity-80" />
              </div>
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">مهمة/مشروع</span>
            </button>
            
            <button 
              onClick={() => openPomodoroDialog()}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.2rem] p-3 flex flex-col items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                 <Timer className="w-4 h-4 opacity-80" />
              </div>
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">تتبع تركيز</span>
            </button>

            <button 
              onClick={() => setRetroDialogOpen(true)}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.2rem] p-3 flex flex-col items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                 <Calendar className="w-4 h-4 opacity-80" />
              </div>
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">أيام سابقة</span>
            </button>
          </div>

          {/* Secondary Quick Actions Strip (Breaks, Permissions, etc.) */}
          {activeSession && (
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
          )}

          {/* Out of session actions and universally available actions */}
          {!isFreelance && (
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
                 {!activeSession && (() => {
                   const upcomingDays = Array.from({length: 30}).map((_, i) => {
                     const d = new Date();
                     d.setDate(d.getDate() + i + 1);
                     return d;
                   });
                   const upcomingHoliday = upcomingDays.find(d => isPublicHoliday(d, settings.customHolidays));
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
                     {getAvailableCompensations(absenceDate).map(comp => (
                       <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                         {format(new Date(comp.startTime), 'EEEE، dd MMM yyyy', {locale: ar})} 
                         (متاح {comp.availableDays} يوم){comp.isExpired ? ' - منتهي الصلاحية' : ''}
                       </option>
                     ))}
                   </select>

                   {getAvailableCompensations(absenceDate).filter(c => c.isExpired).length > 0 && (
                     <div className="mt-3">
                       <p className="text-[11px] text-muted-foreground mb-1 font-bold">أيام بديلة منتهية الصلاحية (يمكن إضافة استثناء):</p>
                       <div className="flex flex-wrap gap-2">
                         {getAvailableCompensations(absenceDate).filter(c => c.isExpired).map(comp => (
                           <Button 
                             key={comp.id} 
                             variant="outline" 
                             size="sm"
                             className="h-7 text-[10px] rounded-full border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10"
                             onClick={(e) => {
                               e.preventDefault();
                               if (window.confirm('هل تريد إضافة استثناء لتفعيل هذا اليوم البديل على الرغم من انتهاء صلاحيته؟')) {
                                 // Add exception
                                 updateSession(comp.id, { compensationException: true });
                                 toast.success('تمت إضافة الاستثناء بنجاح، يمكنك الآن اختياره.');
                               }
                             }}
                           >
                             {format(new Date(comp.startTime), 'dd MMM', {locale: ar})} (+ استثناء)
                           </Button>
                         ))}
                       </div>
                     </div>
                   )}

                   {getAvailableCompensations(absenceDate).length === 0 && (
                     <p className="text-xs text-destructive mt-1">عفواً، لا توجد أيام بديلة صالحة في هذا التاريخ.</p>
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
                disabled={absenceType === 'compensation' && (!compensationLeaveSourceId || getAvailableCompensations(absenceDate).length === 0)}
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
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3 p-3 bg-indigo-500/10 text-indigo-500 rounded-xl mb-2 text-sm border border-indigo-500/20">
                  <Activity className="w-5 h-5 auto flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>الذكاء الاصطناعي:</strong> تم تصنيف الإذن تلقائياً كـ <strong className="bg-indigo-500/20 px-1 rounded">{permissionType === 'entry' ? 'تأخير دخول' : 'خروج مبكر'}</strong> بناءً على جدول عملك اليوم.
                  </span>
                </div>
                <div className="flex gap-2 opacity-60 grayscale scale-95 pointer-events-none">
                  <Button className="flex-1 rounded-xl h-10" variant={permissionType === 'entry' ? 'default' : 'secondary'}>دخول متأخر</Button>
                  <Button className="flex-1 rounded-xl h-10" variant={permissionType === 'exit' ? 'default' : 'secondary'}>خروج مبكر</Button>
                </div>
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

      {/* Overlay: Retroactive Past Day Log */}
      {retroDialogOpen && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 overflow-y-auto max-h-full">
              <h3 className="text-xl font-bold mt-2 text-center text-emerald-500">سجل يوم سابق</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center mb-2">أضف أعمال، إجازات، أو تصاريح لأي يوم مضى.</p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">التاريخ</label>
                  <Input type="date" value={retroDate} onChange={e => setRetroDate(e.target.value)} max={format(now, 'yyyy-MM-dd')} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نوع السجل</label>
                  <select 
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    value={retroType}
                    onChange={e => setRetroType(e.target.value as any)}
                  >
                    <option value="salary">عمل (راتب / أساسي)</option>
                    <option value="project">مشروع / وظيفة أخرى</option>
                    <option value="rest_day_work">عمل في يوم راحة (للحصول على بديلة)</option>
                    <option value="compensation">إجازة بديلة (استهلاك بديلة)</option>
                    <option value="permission">استئذان (تأخير / مبكر)</option>
                    <option value="half_day_leave">نصف يوم</option>
                    <option value="annual_leave">إجازة اعتيادية</option>
                    <option value="sick_leave">إجازة مرضية</option>
                    <option value="casual_leave">إجازة عارضة</option>
                  </select>
                </div>

                {retroType === 'compensation' && (
                  <div className="space-y-1 animate-in fade-in pb-2">
                    <label className="text-xs font-bold text-emerald-500">اختر العمل الإضافي المراد استبداله</label>
                    <select 
                      className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 font-bold"
                      value={compensationLeaveSourceId}
                      onChange={e => setCompensationLeaveSourceId(e.target.value)}
                    >
                      <option value="">-- اختر يوم العمل --</option>
                      {getAvailableCompensations(retroDate).map(comp => (
                        <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                          {format(new Date(comp.startTime), 'EEEE، dd MMM yyyy', {locale: ar})} 
                          (متاح {comp.availableDays} يوم){comp.isExpired ? ' - منتهي الصلاحية' : ''}
                        </option>
                      ))}
                    </select>

                    {getAvailableCompensations(retroDate).filter(c => c.isExpired).length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-muted-foreground mb-1 font-bold">أيام بديلة منتهية الصلاحية (يمكن إضافة استثناء):</p>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableCompensations(retroDate).filter(c => c.isExpired).map(comp => (
                            <Button 
                              key={`retro-${comp.id}`} 
                              variant="outline" 
                              size="sm"
                              className="h-6 px-2 text-[10px] rounded-full border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm('هل تريد إضافة استثناء لتفعيل هذا اليوم البديل على الرغم من انتهاء صلاحيته؟')) {
                                  updateSession(comp.id, { compensationException: true });
                                  toast.success('تمت إضافة الاستثناء بنجاح، يمكنك الآن اختياره.');
                                }
                              }}
                            >
                              {format(new Date(comp.startTime), 'dd MMM', {locale: ar})} (+ استثناء)
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {retroType === 'project' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-xs font-bold text-foreground">المشروع/الجهة</label>
                    <select 
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      value={retroJobId}
                      onChange={e => setRetroJobId(e.target.value)}
                    >
                      <option value="none">-- اختر عمل --</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </div>
                )}

                {!['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave', 'permission', 'compensation'].includes(retroType) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">وقت الحضور</label>
                        <SmartTimePicker value={retroStart} onChange={setRetroStart} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">وقت الانصراف</label>
                        <SmartTimePicker value={retroEnd} onChange={setRetroEnd} />
                      </div>
                    </div>
                    <div className="space-y-1 pb-2">
                       <label className="text-xs font-bold text-foreground inline-flex items-center gap-1"><Coffee className="w-3 h-3"/> الخصومات/الاستراحات (بالدقائق)</label>
                       <Input type="number" min="0" value={retroBreak} onChange={e => setRetroBreak(e.target.value)} placeholder="مثال: 30" />
                    </div>
                    
                    {retroType === 'rest_day_work' && (
                       <div className="space-y-1 animate-in fade-in pb-2">
                         <label className="text-xs font-bold text-orange-500">طبيعة تعويض يوم الراحة/الإجازة</label>
                         <select 
                           className="w-full rounded-xl border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm text-orange-600 font-bold"
                           value={retroCompType}
                           onChange={e => setRetroCompType(e.target.value as any)}
                         >
                           <option value="1_day">يوم راحة بديل واحد</option>
                           <option value="1_day_plus_overtime">يوم راحة بديل + ساعات إضافية</option>
                           <option value="2_days">يومي راحة بديلة (2)</option>
                         </select>
                       </div>
                    )}
                  </>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">ملاحظات (اختياري)</label>
                  <Input placeholder="أضف أي ملحوظة عن اليوم..." value={noteText} onChange={e => setNoteText(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                 <Button onClick={submitRetroSession} className="flex-1 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">حفظ السجل</Button>
                 <Button variant="ghost" onClick={() => {setRetroDialogOpen(false); setNoteText('');}} className="h-12 rounded-xl text-muted-foreground hover:bg-secondary">إلغاء</Button>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Manual Past Session Entry o Edit Active Session Time */}
      {showManualEntry && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8">
              <h3 className="text-xl font-bold mt-2 text-center">{activeSession ? 'تعديل وقت الدخول' : 'تسجيل دخول فائت'}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                {activeSession ? 'هل قمت بالدخول في وقت مختلف؟ قم بتعديل الوقت أدناه وسنقوم بإعادة الحسابات تلقائياً.' : 'لم تقم بتسجيل الدخول في وقتها؟ أدخل الوقت الفعلي أدناه.'}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">وقت البدء الفعلي</label>
                  <SmartTimePicker 
                    value={manualEntryTime}
                    onChange={setManualEntryTime}
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

      {/* Modern Sheets for Leaves and Permissions */}
      <Sheet open={isLeaveSheetOpen} onOpenChange={setIsLeaveSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[90vh] p-6 z-[120] border-t border-border/50" dir="rtl">
          <SheetHeader className="pb-4 text-center">
             <SheetTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                تسجيل إجازة
                <span className="text-sm font-normal text-muted-foreground">اختر نوع الإجازة لليوم</span>
             </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4">
             <button onClick={() => { logSpecialSession('casual_leave'); setIsLeaveSheetOpen(false); toast.success('تم تسجيل راحة بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">راحة</span>
                <div className="w-14 h-14 rounded-[14px] bg-blue-500/10 flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110">
                  <Palmtree className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { setAbsenceType('compensation'); setAbsenceDialogOpen(true); setIsLeaveSheetOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">بديلة</span>
                <div className="w-14 h-14 rounded-[14px] bg-teal-500/10 flex items-center justify-center text-teal-500 transition-transform group-hover:scale-110">
                  <Calendar className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('sick_leave'); setIsLeaveSheetOpen(false); toast.success('تم تسجيل إجازة مرضية بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">مرضي</span>
                <div className="w-14 h-14 rounded-[14px] bg-red-500/10 flex items-center justify-center text-red-500 transition-transform group-hover:scale-110">
                  <Clock className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('annual_leave'); setIsLeaveSheetOpen(false); toast.success('تم تسجيل إجازة سنوية بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">سنوي</span>
                <div className="w-14 h-14 rounded-[14px] bg-orange-500/10 flex items-center justify-center text-orange-500 transition-transform group-hover:scale-110">
                  <Zap className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => setIsLeaveSheetOpen(false)} className="w-full mt-2 h-[60px] rounded-[1.5rem] bg-secondary/40 hover:bg-secondary text-foreground font-bold transition-colors">
                إلغاء
             </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isPermissionSheetOpen} onOpenChange={setIsPermissionSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[90vh] p-6 z-[120] border-t border-border/50" dir="rtl">
          <SheetHeader className="pb-4 text-center">
             <SheetTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                إذن / نصف يوم
                <span className="text-sm font-normal text-muted-foreground">اختر نوع التصريح للإدخال</span>
             </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4">
             <button onClick={() => { logSpecialSession('permission', { hours: 1, subtype: 'entry' }); setIsPermissionSheetOpen(false); toast.success('تم تسجيل إذن التأخير بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">إذن تأخير (ساعة)</span>
                   <span className="text-xs text-muted-foreground mt-0.5">يخصم من رصيد الأذونات</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-yellow-500/10 flex items-center justify-center text-yellow-500 transition-transform group-hover:scale-110">
                  <Timer className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('permission', { hours: 2, subtype: 'exit' }); setIsPermissionSheetOpen(false); toast.success('تم تسجيل إذن الخروج بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">إذن خروج (ساعتين)</span>
                   <span className="text-xs text-muted-foreground mt-0.5">يخصم من رصيد الأذونات</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-purple-500/10 flex items-center justify-center text-purple-500 transition-transform group-hover:scale-110">
                  <LogOut className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('half_day_leave'); setIsPermissionSheetOpen(false); toast.success('تم تسجيل نصف يوم بنجاح'); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">إجازة نصف يوم</span>
                   <span className="text-xs text-muted-foreground mt-0.5">يخصم كإجازة معتمدة لنصف اليوم</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-teal-500/10 flex items-center justify-center text-teal-500 transition-transform group-hover:scale-110">
                  <Activity className="w-7 h-7" />
                </div>
             </button>
             
             <button onClick={() => setIsPermissionSheetOpen(false)} className="w-full mt-2 h-[60px] rounded-[1.5rem] bg-secondary/40 hover:bg-secondary text-foreground font-bold transition-colors">
                إلغاء
             </button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
