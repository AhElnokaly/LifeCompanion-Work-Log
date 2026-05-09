import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Play, Square, Clock, Calendar, Coffee, FileText, Check, Bell, Zap, Timer, Shuffle, Brain, Loader2, Send, Activity, Moon, Sun, Sunrise, Sunset, Plus, Minus, LogIn, LogOut, Palmtree, Briefcase, Trophy } from 'lucide-react';
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
import { formatMinutesToHHMM } from '../../lib/utils';
import WeatherWidget from './WeatherWidget';
import { useLanguage } from '../../contexts/LanguageContext';

export default function HomeView() {
  const { 
    activeSession, sessions, jobs, shifts, shiftAssignments, startSession, addSession, endSession, settings, updateSettings, getBalances, logSpecialSession, updateSession, updateActiveSession, toggleBreak,
    pomodoroTimeLeft, pomodoroIsActive, pomodoroMode, togglePomodoro, resetPomodoro
  } = useWorkLog();
  const { t, lang } = useLanguage();
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
  const [moodScore, setMoodScore] = useState<number>(3);
  const [selfScore, setSelfScore] = useState<number>(5);
  const [clientScore, setClientScore] = useState<number>(5);
  const [permissionHours, setPermissionHours] = useState<number>(1);
  const [permissionType, setPermissionType] = useState<'entry' | 'exit'>('entry');
  const [noteText, setNoteText] = useState('');

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
  const [retroType, setRetroType] = useState<'salary' | 'freelance' | 'project' | 'annual_leave' | 'sick_leave' | 'half_day_leave' | 'casual_leave' | 'permission' | 'compensation'>('salary');
  const [retroJobId, setRetroJobId] = useState<string>('none');
  const [retroBreak, setRetroBreak] = useState('0');
  const [retroCompType, setRetroCompType] = useState<'1_day' | '1_day_plus_overtime' | '2_days'>('1_day');
  const [retroIsRest, setRetroIsRest] = useState(false);

  useEffect(() => {
     if (retroDialogOpen && retroDate) {
        const d = new Date(retroDate);
        const isRest = (settings.restDays || []).includes(d.getDay()) || isPublicHoliday(d, settings.customHolidays);
        setRetroIsRest(isRest);
     }
  }, [retroDate, retroDialogOpen, settings.restDays, settings.customHolidays]);

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
    t('t_auto_279'),
    t('t_auto_280'),
    t('t_auto_281'),
    t('t_auto_282'),
    t('t_auto_283')
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

  const openPomodoroDialog = () => {
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
      endSession(t('home.auto_checkout'), { endTime: dummyTime.toISOString() });
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
    if (todaySessions.some(s => s.dayStatus === 'compensation')) return "${t('home.enjoy_rest')}";
    return "${t('home.enjoy_annual')}";
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
           processSessionStart(type, entityId, forceYesterday, true, { ...explicitOverrides, startTime: expectedStart.toISOString(), notes: `${t('home.late_permission_used').replace('{mins}', lateMins.toString())}` });
        } else if (accept === 'count_full') {
           // Normal late log
           processSessionStart(type, entityId, forceYesterday, true, { ...explicitOverrides, startTime: expectedStart.toISOString(), dayStatus: 'late', notes: `${t('home.late_deduction').replace('{mins}', lateMins.toString())}` });
        }
     } else {
        if (accept === true) {
          logSpecialSession('half_day_leave', { note: t('home.auto_late') });
        } else {
          processSessionStart(type, entityId, forceYesterday, true, explicitOverrides);
        }
     }
  };

  const submitMoodStart = () => {
    if (pendingStartData) {
      const existingNotes = (pendingStartData as any).overrideData?.notes || '';
      const moodNotes = `${t('home.start_mood').replace('{score}', moodScore.toString())} ${existingNotes}`;
      
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
    const finalNotes = noteText || t('home.work_ended');
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
    const combinedNotes = `${noteText ? noteText + '\n' : ''}${t('home.end_mood').replace('{score}', moodScore.toString()).replace('{self}', selfScore.toString())}`;
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
      toast.error(t('home.checkout_after_checkin'));
      return;
    }

    const startIso = startTimeDate.toISOString();
    const endIso = endTimeDate.toISOString();
    let duration = differenceInMinutes(endTimeDate, startTimeDate);
    const breaks = parseInt(retroBreak) || 0;
    duration = Math.max(0, duration - breaks);

    const isRestDayWork = retroIsRest && retroType === 'salary';

    if (['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave', 'permission', 'compensation'].includes(retroType)) {
       if (retroType === 'compensation' && !compensationLeaveSourceId) {
          toast.error(t('home.choose_overtime_day'));
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
         notes: noteText || t('home.manual_entry')
       } as any);
    } else {
       let baseOvertime = 0;
       if (isRestDayWork) {
         if (retroCompType === '1_day_plus_overtime') baseOvertime = duration;
         else if (retroCompType === '2_days') baseOvertime = 0;
         else baseOvertime = retroCompType === '1_day' ? 0 : duration; 
       } else {
         const expectedMins = settings.dailyHours * 60;
         baseOvertime = duration > expectedMins ? duration - expectedMins : 0;
       }

       addSession({
         id: Date.now().toString(),
         startTime: startIso,
         endTime: endIso,
         type: retroType as any,
         jobId: retroJobId !== 'none' ? retroJobId : undefined,
         duration,
         overtimeMinutes: baseOvertime,
         breaks,
         dayStatus: 'work',
         isRestDayWork,
         restDayCompensation: isRestDayWork ? retroCompType : undefined,
         location: 'office',
         notes: noteText || t('home.manual_entry')
       } as any);
    }

    setRetroDialogOpen(false);
    setNoteText('');
    toast.success(t('home.log_added'));
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
        t('t_auto_284'),
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
         logSpecialSession((parsed.leaveType as any) || 'casual_leave', { note: parsed.notes || t('home.smart_leave') });
      } else if (parsed.action === 'log_permission') {
         logSpecialSession('permission', { hours: (parsed.durationMinutes || 60) / 60, note: parsed.notes || t('home.smart_permission') });
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
           notes: parsed.notes || t('t_auto_285')
         };
         
         addSession(dummySession);

      } else {
         startSession(matchedJobId ? 'project' : 'salary', matchedJobId, { notes: parsed.notes });
      }

      setAiPrompt('');
      toast.success(t('home.smart_log_success'));
    } catch (err: any) {
      alert(err.message || t('home.understanding_error'));
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
    timeGreeting = t('home.good_morning');
    timeGradient = 'from-amber-400 to-orange-500'; 
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = t('home.good_day');
    timeGradient = 'from-sky-400 to-blue-600'; 
  } else if (hour >= 17 && hour < 20) {
    timeGreeting = t('home.good_evening');
    timeGradient = 'from-rose-400 to-purple-600'; 
  } else {
    timeGreeting = t('home.good_night');
    timeGradient = 'from-indigo-800 to-slate-900'; 
  }

  let shiftStartHour = null;
  let shiftEndHour = null;
  if (settings.expectedStartTime) {
     shiftStartHour = parseInt(settings.expectedStartTime.split(':')[0]);
     shiftEndHour = Math.floor((shiftStartHour + settings.dailyHours) % 24);
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-700 max-w-sm w-full mx-auto pb-4" dir="ltr">
      
      {/* Date / Title Row */}
      <div className={`bg-gradient-to-br ${timeGradient} rounded-[2rem] p-5 text-white text-center shadow-lg relative overflow-hidden shrink-0 mt-2 mx-1`} dir="rtl">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full border-[16px] border-white/10 opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center">
           <div className="flex items-center justify-center gap-2 mb-1.5">
             <span className="text-sm font-medium text-white/90">{timeGreeting}</span>
             {hour >= 5 && hour < 12 ? <Sunrise className="w-5 h-5 text-white/90" /> : 
              hour >= 12 && hour < 17 ? <Sun className="w-5 h-5 text-white/90" /> : 
              hour >= 17 && hour < 20 ? <Sunset className="w-5 h-5 text-white/90" /> : 
              <Moon className="w-5 h-5 text-white/90" />}
           </div>
           <h2 className="text-lg font-bold mb-1 opacity-90">
             {format(now, t('t_auto_286'), { locale: ar })}
           </h2>
           <div className="text-6xl font-black tracking-tighter mb-2 drop-shadow-md flex items-baseline gap-1" dir="ltr">
             {format(now, 'hh:mm')}
             <span className="text-2xl opacity-70 font-bold">{format(now, 'a', { locale: ar }).replace(t('t_auto_287'), t('t_auto_287')).replace(t('t_auto_288'), t('t_auto_288'))}</span>
           </div>
           <WeatherWidget variant="inline" shiftStartHour={shiftStartHour} shiftEndHour={shiftEndHour} />
        </div>
      </div>

      {/* Mini Balances Row */}
      <div className="flex justify-center flex-wrap gap-2 px-4 mt-3 scale-95" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
         {(() => {
            const comps = getAvailableCompensations().reduce((acc, c) => acc + c.availableDays, 0);
            const ann = getBalances().remainingAnnualLeaves;
            return (
              <>
                {ann > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/50 rounded-full shadow-sm text-[10px] font-bold text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>{ann} {t('cal.annual')}</span>
                  </div>
                )}
                {comps > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{comps} {t('notif.comps_days_left')}</span>
                  </div>
                )}
              </>
            );
         })()}
      </div>

      {isOnFullDayLeave ? (
         <div className="flex flex-col items-center justify-center bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] p-8 shadow-2xl my-auto text-center mx-1 flex-1 mt-3" dir="rtl">
            {getLeaveIcon()}
            <span className="text-lg font-bold tracking-wide mt-2">
              {getLeaveText()}
            </span>
            <p className="text-xs text-muted-foreground mt-2 opacity-60 leading-relaxed">
              {t('home.happy_day')}
            </p>
         </div>
      ) : (
        <div className="flex flex-col gap-3 mx-1 flex-1 min-h-0 relative z-10 pb-16 mt-3">
        
        {/* Today's Details Card */}
        <div className="bg-card rounded-[1.5rem] p-4 border border-border/50 shadow-sm shrink-0 flex flex-col gap-4" dir="rtl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-foreground">{t('home.details_day')}</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center divide-x divide-x-reverse divide-border/20">
            <div className="flex flex-col gap-1 justify-center px-1">
               <span className="text-[10px] text-muted-foreground font-medium">{t('home.entry')}</span>
               <span className="text-lg font-bold font-mono tracking-tight">{activeSession ? format(new Date(activeSession.startTime), "HH:mm") : '--:--'}</span>
            </div>
            <div className="flex flex-col gap-1 justify-center px-1">
               <span className="text-[10px] text-muted-foreground font-medium">{t('home.exit')}</span>
               <span className="text-lg font-bold font-mono tracking-tight">{!activeSession || expectedCheckoutStr === '--:--' ? '--:--' : expectedCheckoutStr.replace(t('t_auto_287'), '').replace(t('t_auto_288'), '').trim()}</span>
            </div>
            <div className="flex flex-col gap-1 justify-center px-1">
               <span className="text-[10px] text-muted-foreground font-medium">{t('home.total')}</span>
               <span className="text-lg font-bold font-mono tracking-tight">{displayHours}{t('t_auto_9')}</span>
            </div>
            <div className="flex flex-col gap-1 justify-center px-1">
               <span className="text-[10px] text-muted-foreground font-medium">{t('home.overtime')}</span>
               <span className="text-lg font-bold font-mono tracking-tight text-emerald-500">{formatMinutesToHHMM(overtimeMinutes)}</span>
            </div>
          </div>
          {/* Action Bar inside details (Only shows during active session) */}
          {activeSession && (
            <div className="flex gap-2 w-full mt-1 border-t pt-3">
              <Button 
                variant="secondary" 
                className={`flex-1 rounded-xl h-9 font-bold shadow-sm border border-border/50 text-xs ${activeSession.activeBreakStartTime ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : ''}`}
                onClick={toggleBreak}
              >
                <Coffee className="w-3.5 h-3.5 ml-1" />
                {activeSession.activeBreakStartTime ? t('t_auto_289') : t('t_auto_290')}
              </Button>
              <Button variant="secondary" className="flex-1 rounded-xl h-9 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={() => setDispatcherOpen(true)}>
                <Shuffle className="w-3.5 h-3.5 ml-1" /> {t('home.switch')}
              </Button>
              <Button variant="secondary" className="flex-1 rounded-xl h-9 font-bold shadow-sm border border-border/50 bg-secondary/40 text-xs" onClick={openNoteDialog}>
                <FileText className="w-3.5 h-3.5 ml-1" /> {t('home.notes')}
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2 shrink-0" dir="rtl">
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
              className={`rounded-2xl p-3 flex items-center justify-center gap-3 transition-colors text-right h-[70px] shadow-sm group ${(!isOnFullDayLeave || activeSession) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${activeSession ? 'bg-teal-500/10 text-teal-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                 {activeSession ? <Clock className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              </div>
              <span className="text-sm font-bold text-foreground leading-tight flex-1">{activeSession ? t('home.switch') : t('home.entry')}</span>
           </button>
           
           <button onClick={() => activeSession && handleEndSession()} disabled={!activeSession} className={`rounded-2xl p-3 flex items-center justify-center gap-3 transition-colors text-right h-[70px] shadow-sm group ${activeSession ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-500 transition-transform group-hover:scale-110">
                 <LogOut className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground leading-tight flex-1">{t('home.exit')}</span>
           </button>

           <button onClick={() => setIsPermissionSheetOpen(true)} disabled={isOnFullDayLeave} className={`rounded-2xl p-3 flex items-center justify-center gap-3 transition-colors text-right h-[70px] shadow-sm group ${(!isOnFullDayLeave) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-500 transition-transform group-hover:scale-110">
                 <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground leading-tight flex-1">{t('home.permission')}</span>
           </button>

           <button onClick={() => setIsLeaveSheetOpen(true)} disabled={!!activeSession || isOnFullDayLeave} className={`rounded-2xl p-3 flex items-center justify-center gap-3 transition-colors text-right h-[70px] shadow-sm group ${(!activeSession && !isOnFullDayLeave) ? 'bg-card hover:bg-card/80 border border-border/50' : 'bg-card/30 border border-border/20 opacity-60 cursor-not-allowed'}`}>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 transition-transform group-hover:scale-110">
                 <Palmtree className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground leading-tight flex-1">{t('home.leave')}</span>
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
                       <Brain className="w-5 h-5 text-indigo-500" /> {t('home.smart_log')}
                     </SheetTitle>
                     <p className="text-xs text-muted-foreground font-medium mt-1">{t('home.smart_log_desc')}</p>
                   </SheetHeader>
                   <div className="flex flex-col gap-4 mt-2" dir="rtl">
                      <Input 
                        placeholder={t('home.smart_log_placeholder')}
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        className="text-sm h-14 rounded-xl border-border/50 bg-background/50 font-medium"
                        onKeyDown={e => e.key === 'Enter' && processAILog()}
                      />
                      <Button onClick={processAILog} disabled={!aiPrompt || isAILogging} className="w-full h-14 rounded-xl text-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg">
                         {isAILogging ? <Loader2 className="w-6 h-6 animate-spin" /> : t('home.smart_log_btn')}
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
                    <span className="text-sm font-bold text-foreground">{t('home.base_hours')}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{t('home.base_hours_desc')}</span>
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
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">{t('home.task_project')}</span>
            </button>
            
            <button 
              onClick={() => openPomodoroDialog()}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.2rem] p-3 flex flex-col items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                 <Timer className="w-4 h-4 opacity-80" />
              </div>
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">{t('home.focus_tracking')}</span>
            </button>

            <button 
              onClick={() => setRetroDialogOpen(true)}
              className="flex-1 bg-card/40 hover:bg-card/60 backdrop-blur-2xl border border-white/5 rounded-[1.2rem] p-3 flex flex-col items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                 <Calendar className="w-4 h-4 opacity-80" />
              </div>
              <span className="text-[11px] font-bold text-foreground/90 leading-tight">{t('home.previous_days')}</span>
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
                {activeSession.activeBreakStartTime ? t('home.end_break') : t('home.start_break')}
              </Button>
              
              {!isFreelance && balances.remainingPermissionsHours >= 1 && (
                <Button 
                  variant="secondary" 
                  className="snap-start shrink-0 bg-secondary/30 rounded-[1rem] h-12 px-6 shadow-sm border border-white/5 flex gap-2 text-indigo-400"
                  onClick={() => openPermissionDialog(1)}
                >
                  <Clock className="w-4 h-4" />
                  {t('t_auto_291')}
                                                      </Button>
              )}
              {!isFreelance && balances.remainingPermissionsHours >= 2 && (
                <Button 
                  variant="secondary" 
                  className="snap-start shrink-0 bg-secondary/30 rounded-[1rem] h-12 px-6 shadow-sm border border-white/5 flex gap-2 text-indigo-400"
                  onClick={() => openPermissionDialog(2)}
                >
                  <Clock className="w-4 h-4" />
                  {t('t_auto_292')}
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
                   {t('home.manage_leaves')}
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
                     if (holDay === 2) { suggestion = t('t_auto_293'); suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() - 1); }
                     // If holiday is Wednesday (3), suggest Thursday (4)
                     if (holDay === 3) { suggestion = t('t_auto_294'); suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() + 1); }
                     // If holiday is Thursday (4), suggest Sunday (0) to get 4 days (Fri, Sat, Sun, Mon - no wait, Thu off means Wed+Thu+Fri+Sat = 4 days!)
                     if (holDay === 4) { suggestion = t('t_auto_295'); suggestedDate = new Date(upcomingHoliday); suggestedDate.setDate(suggestedDate.getDate() - 1); }

                     if (suggestion && suggestedDate) {
                       return (
                         <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden" dir="rtl">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                               <Brain className="w-4 h-4 text-primary" />
                             </div>
                             <div>
                               <p className="text-xs font-bold text-primary">{t('home.ai_coach')}</p>
                               <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                 {t('t_auto_296')} <strong>{suggestion}</strong> ({format(suggestedDate, 'dd/MM')}{t('t_auto_297')} {format(upcomingHoliday, 'dd/MM')} {t('t_auto_298')}
                                                                          </p>
                             </div>
                           </div>
                           <Button 
                             size="sm" 
                             className="h-8 rounded-xl text-xs w-full mt-1 bg-primary text-primary-foreground font-bold"
                             onClick={() => {
                               setAbsenceType('annual_leave');
                               setAbsenceDate(format(suggestedDate, 'yyyy-MM-dd'));
                               setNoteText(t('t_auto_299'));
                               setAbsenceDialogOpen(true);
                             }}
                           >
                             {t('home.book_now')}
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
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-background/80 p-4">
          <div className="bg-card border border-white/10 p-6 rounded-[2.5rem] w-full max-w-sm shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col mb-2 text-center" dir="rtl">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black">{t('home.log_attendance')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('home.select_task_shift')}</p>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar" dir="rtl">
              {shifts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Clock className="w-3 h-3"/> {t('home.scheduled_shifts')}</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {shifts.map(shift => {
                      return (
                        <button 
                          key={shift.id} 
                          className="w-full flex items-center justify-between p-3 rounded-2xl bg-secondary/30 hover:bg-secondary border border-white/5 transition-all text-right group"
                          onClick={() => startSpecificSession('shift', shift.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-background flex flex-col items-center justify-center shadow-sm">
                              <span className="text-xs font-bold text-foreground leading-none">{shift.startTime.split(':')[0]}</span>
                              <span className="text-[10px] text-muted-foreground leading-none">{shift.startTime.split(':')[1]}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="font-bold text-sm text-foreground">{shift.name}</span>
                               <span className="text-[10px] text-muted-foreground">{t('home.work_shift')}</span>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Play className="w-4 h-4 ml-0.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {jobs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><FileText className="w-3 h-3"/> {t('home.jobs_projects')}</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {jobs.map(job => (
                      <button 
                        key={job.id} 
                        className="w-full flex flex-col items-center justify-center p-3 h-24 rounded-2xl bg-secondary/30 hover:bg-secondary border border-white/5 transition-all text-center group"
                        onClick={() => startSpecificSession(job.type, job.id)}
                      >
                        <div className="w-10 h-10 rounded-xl mb-2 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110" style={{backgroundColor: `${job.color}15`, color: job.color}}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-xs text-foreground line-clamp-1">{job.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/50">
                 <button 
                    className="w-full flex items-center justify-between p-3 h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-bold group"
                    onClick={() => startSpecificSession('salary')}
                 >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <Check className="w-5 h-5" />
                       </div>
                       <span>{t('home.general_attendance')}</span>
                    </div>
                 </button>
              </div>
            </div>

            <Button variant="ghost" className="w-full mt-1 h-12 rounded-xl text-muted-foreground hover:bg-secondary/50 font-medium" onClick={() => setDispatcherOpen(false)}>
              {t('home.cancel_undo')}
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
                 <h3 className="text-lg font-bold">{t('home.manage_leaves')}</h3>
                 <p className="text-[10px] text-muted-foreground">{t('home.manage_absence_desc')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-1">
               <label className="text-sm font-bold">{t('cal.leave_type')}</label>
               <select 
                 className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                 value={absenceType}
                 onChange={(e) => setAbsenceType(e.target.value as any)}
               >
                 <option value="annual_leave">{t('home.annual_leave')}</option>
                 <option value="casual_leave">{t('home.casual_leave')}</option>
                 <option value="sick_leave">{t('home.sick_leave')}</option>
                 <option value="half_day_leave">{t('home.half_day_leave')}</option>
                 <option value="compensation">{t('home.comp_day')}</option>
               </select>

               {absenceType === 'compensation' && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="text-sm font-bold mt-2">{t('home.choose_overtime_day')}</label>
                   <select 
                     className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm mt-1"
                     value={compensationLeaveSourceId}
                     onChange={(e) => setCompensationLeaveSourceId(e.target.value)}
                   >
                     <option value="">-- {t('home.day')} --</option>
                     {getAvailableCompensations(absenceDate).map(comp => (
                       <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                         {format(new Date(comp.startTime), t('t_auto_300'), {locale: ar})} 
                         {t('t_auto_301')} {comp.availableDays} {t('t_auto_302')}{comp.isExpired ? ' - ' + t('home.expired') : ''}
                       </option>
                     ))}
                   </select>

                   {getAvailableCompensations(absenceDate).filter(c => c.isExpired).length > 0 && (
                     <div className="mt-3">
                       <p className="text-[11px] text-muted-foreground mb-1 font-bold">{t('home.expired_comp')}</p>
                       <div className="flex flex-wrap gap-2">
                         {getAvailableCompensations(absenceDate).filter(c => c.isExpired).map(comp => (
                           <Button 
                             key={comp.id} 
                             variant="outline" 
                             size="sm"
                             className="h-7 text-[10px] rounded-full border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10"
                             onClick={(e) => {
                               e.preventDefault();
                               if (window.confirm(t('home.add_exception_confirm'))) {
                                 // Add exception
                                 updateSession(comp.id, { compensationException: true });
                                 toast.success(t('home.exception_added'));
                               }
                             }}
                           >
                             {format(new Date(comp.startTime), 'dd MMM', {locale: ar})} ({t('home.exception')})
                           </Button>
                         ))}
                       </div>
                     </div>
                   )}

                   {getAvailableCompensations(absenceDate).length === 0 && (
                     <p className="text-xs text-destructive mt-1">{t('home.no_comp_days')}</p>
                   )}
                 </div>
               )}

               <label className="text-sm font-bold mt-2">{t('home.date')}</label>
               <input 
                 type="date" 
                 value={absenceDate}
                 onChange={(e) => setAbsenceDate(e.target.value)}
                 className="w-full h-12 rounded-xl bg-secondary/30 px-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm"
               />

               <label className="text-sm font-bold mt-2">{t('home.notes_optional')}</label>
               <textarea 
                  className="w-full bg-secondary/30 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px] border border-border"
                  placeholder={t('home.leave_reason')}
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
                      notes: noteText || t('home.leave_as_comp'),
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
                        sendAppNotification(t('home.position_logged'), { body: t('home.calendar_updated') });
                     });
                  }
                }}
              >
                {t('t_auto_303')}
                                            </Button>
              <Button className="flex-1 rounded-xl h-12" variant="ghost" onClick={() => setAbsenceDialogOpen(false)}>
                {t('t_auto_304')}
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
              {actionDialog === 'permission' ? t('home.permission_hours').replace('{hours}', permissionHours.toString()) : actionDialog === 'pomodoro' ? t('home.pomodoro') : t('home.session_note')}
            </h3>
            
            {actionDialog === 'permission' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3 p-3 bg-indigo-500/10 text-indigo-500 rounded-xl mb-2 text-sm border border-indigo-500/20">
                  <Activity className="w-5 h-5 auto flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>AI:</strong> {t('home.ai_classified')} <strong className="bg-indigo-500/20 px-1 rounded">{permissionType === 'entry' ? t('home.late_entry') : t('home.early_exit')}</strong> {t('home.based_on_schedule')}
                  </span>
                </div>
                <div className="flex gap-2 opacity-60 grayscale scale-95 pointer-events-none">
                  <Button className="flex-1 rounded-xl h-10" variant={permissionType === 'entry' ? 'default' : 'secondary'}>{t('home.late_entry')}</Button>
                  <Button className="flex-1 rounded-xl h-10" variant={permissionType === 'exit' ? 'default' : 'secondary'}>{t('home.early_exit')}</Button>
                </div>
              </div>
            )}

            {actionDialog === 'pomodoro' ? (
              <div className="flex flex-col items-center justify-center py-6">
                 <div className="text-5xl font-black tabular-nums tracking-tight text-primary drop-shadow-md mb-6">
                   {String(Math.floor(pomodoroTimeLeft / 60)).padStart(2, '0')}:{String(pomodoroTimeLeft % 60).padStart(2, '0')}
                 </div>
                 <div className="flex gap-4 w-full">
                    {pomodoroIsActive ? (
                      <Button className="flex-1 h-12 rounded-xl text-lg font-bold" variant="destructive" onClick={togglePomodoro}>{t('home.stop')}</Button>
                    ) : (
                      <Button className="flex-1 h-12 rounded-xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={togglePomodoro}>{t('home.start_focus')}</Button>
                    )}
                 </div>
              </div>
            ) : (
              <textarea 
                className="w-full bg-secondary/30 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] border border-border"
                placeholder={t('home.write_notes')}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            )}

            <div className="flex gap-2 mt-2">
              {actionDialog !== 'pomodoro' && (
                <Button className="flex-1 rounded-xl h-12 font-bold" onClick={actionDialog === 'permission' ? submitPermission : submitNote}>
                  {t('t_auto_234')}
                                                  </Button>
              )}
              <Button className="flex-1 rounded-xl h-12" variant={actionDialog === 'pomodoro' ? 'default' : 'ghost'} onClick={() => setActionDialog(null)}>
                {actionDialog === 'pomodoro' ? t('t_auto_304') : t('t_auto_305')}
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
               <h3 className="text-xl font-bold">{moodDialogState === 'start' ? t('t_auto_306') : t('t_auto_307')}</h3>
               <p className="text-sm text-muted-foreground mt-1">
                 {moodDialogState === 'start' ? t('t_auto_308') : t('t_auto_309')}
               </p>
             </div>

             <div className="space-y-4 my-2">
               <div className="bg-secondary/20 p-4 rounded-3xl">
                  <p className="text-sm font-medium mb-4 text-center text-foreground/80">{t('t_auto_310')}</p>
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
                      <p className="text-sm font-medium mb-3 text-foreground/80">{t('t_auto_311')}</p>
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
               {moodDialogState === 'start' ? t('t_auto_312') : t('t_auto_313')}
             </Button>
             <Button variant="ghost" className="rounded-xl h-10 text-muted-foreground" onClick={() => {
                if (moodDialogState === 'start') submitMoodStart();
                else submitMoodEnd();
             }}>
               {t('t_auto_314')}
                                       </Button>
          </div>
        </div>
      )}

      {/* Overlay: Night Shift Attribution */}
      {nightShiftModalOpen && pendingNightJob && (
         <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 text-center" dir="rtl">
              <h3 className="text-xl font-bold">{t('t_auto_315')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('t_auto_316')}
                                        </p>
              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1 rounded-xl h-12" 
                  onClick={() => processSessionStart(pendingNightJob.type, pendingNightJob.entityId, false)}
                >
                  {t('t_auto_317')}
                                              </Button>
                <Button 
                  className="flex-1 rounded-xl h-12" variant="outline"
                  onClick={() => processSessionStart(pendingNightJob.type, pendingNightJob.entityId, true)}
                >
                  {t('t_auto_318')}
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
                  <h3 className="text-xl font-bold mt-2 text-center text-orange-500">{t('t_auto_319')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed text-center">
                    {t('t_auto_320')} <strong>{(showHalfDayPrompt as any).lateMins} {t('t_auto_171')}</strong>{t('t_auto_321')} {settings.advancedRules?.gracePeriodMinutes} {t('t_auto_322')}
                                                    </p>
                  <div className="flex flex-col gap-2 mt-4 text-sm gap-y-3">
                    <Button 
                      onClick={() => handleHalfDayAccept('ignore_and_overtime')} 
                      className="bg-indigo-500 hover:bg-indigo-600 rounded-xl whitespace-normal h-auto py-2"
                    >
                      {t('t_auto_323')}
                                                          </Button>
                    <Button 
                      onClick={() => handleHalfDayAccept('use_permission')} 
                      variant="outline" 
                      className="rounded-xl border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                    >
                      {t('t_auto_324')}
                                                          </Button>
                    <Button 
                      onClick={() => handleHalfDayAccept('count_full')} 
                      variant="ghost" 
                      className="rounded-xl text-muted-foreground"
                    >
                      {t('t_auto_325')}
                                                          </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mt-2">{t('t_auto_326')}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                   {t('t_auto_327')} <strong>{t('t_auto_328')}</strong>{t('t_auto_329')}
                                                        </p>
                  <div className="flex flex-col gap-2 mt-4">
                    <Button 
                      className="w-full rounded-xl h-12 font-bold bg-orange-500 hover:bg-orange-600 text-white" 
                      onClick={() => handleHalfDayAccept(true)}
                    >
                      {t('t_auto_330')}
                                                              </Button>
                    <Button 
                      variant="outline"
                      className="w-full rounded-xl h-12" 
                      onClick={() => handleHalfDayAccept(false)}
                    >
                      {t('t_auto_331')}
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
              <h3 className="text-xl font-bold mt-2 text-center">{t('t_auto_332')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                {t('t_auto_333')}
                                        </p>
              
              <div className="flex flex-col gap-2 mt-2">
                 <Button 
                   variant={selectedCompType === '1_day' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('1_day')}
                 >
                   {t('t_auto_334')}
                                               </Button>
                 <Button 
                   variant={selectedCompType === '1_day_plus_overtime' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('1_day_plus_overtime')}
                 >
                   {t('t_auto_335')}
                                               </Button>
                 <Button 
                   variant={selectedCompType === '2_days' ? 'default' : 'outline'}
                   className="justify-start h-12 rounded-xl text-right px-4"
                   onClick={() => setSelectedCompType('2_days')}
                 >
                   {t('t_auto_336')}
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
                  {t('t_auto_337')}
                                              </Button>
                <Button 
                  variant="ghost"
                  className="rounded-xl h-12" 
                  onClick={() => setCompensationTypeDialogOpen(false)}
                >
                  {t('t_auto_305')}
                                              </Button>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Retroactive Past Day Log */}
      {retroDialogOpen && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8 overflow-y-auto max-h-full">
              <h3 className="text-xl font-bold mt-2 text-center text-emerald-500">{t('t_auto_338')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center mb-2">{t('t_auto_339')}</p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">{t('home.date')}</label>
                  <Input type="date" value={retroDate} onChange={e => setRetroDate(e.target.value)} max={format(now, 'yyyy-MM-dd')} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">{t('t_auto_246')}</label>
                  <select 
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    value={retroType}
                    onChange={e => setRetroType(e.target.value as any)}
                  >
                    <option value="salary">{t('t_auto_340')}</option>
                    <option value="project">{t('t_auto_341')}</option>
                    <option disabled>──────────</option>
                    <option value="compensation">{t('t_auto_342')}</option>
                    <option value="permission">{t('t_auto_343')}</option>
                    <option value="half_day_leave">{t('t_auto_229')}</option>
                    <option value="annual_leave">{t('t_auto_344')}</option>
                    <option value="sick_leave">{t('home.sick_leave')}</option>
                    <option value="casual_leave">{t('home.casual_leave')}</option>
                  </select>
                </div>

                {retroType === 'compensation' && (
                  <div className="space-y-1 animate-in fade-in pb-2">
                    <label className="text-xs font-bold text-emerald-500">{t('home.choose_overtime_day')}</label>
                    <select 
                      className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 font-bold"
                      value={compensationLeaveSourceId}
                      onChange={e => setCompensationLeaveSourceId(e.target.value)}
                    >
                      <option value="">-- {t('home.day')} --</option>
                      {getAvailableCompensations(retroDate).map(comp => (
                        <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                          {format(new Date(comp.startTime), t('t_auto_300'), {locale: ar})} 
                          {t('t_auto_301')} {comp.availableDays} {t('t_auto_302')}{comp.isExpired ? ' - ' + t('home.expired') : ''}
                        </option>
                      ))}
                    </select>

                    {getAvailableCompensations(retroDate).filter(c => c.isExpired).length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-muted-foreground mb-1 font-bold">{t('home.expired_comp')}</p>
                        <div className="flex flex-wrap gap-2">
                          {getAvailableCompensations(retroDate).filter(c => c.isExpired).map(comp => (
                            <Button 
                              key={`retro-${comp.id}`} 
                              variant="outline" 
                              size="sm"
                              className="h-6 px-2 text-[10px] rounded-full border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm(t('home.add_exception_confirm'))) {
                                  updateSession(comp.id, { compensationException: true });
                                  toast.success(t('home.exception_added'));
                                }
                              }}
                            >
                              {format(new Date(comp.startTime), 'dd MMM', {locale: ar})} ({t('home.exception')})
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {retroType === 'project' && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-xs font-bold text-foreground">{t('t_auto_345')}</label>
                    <select 
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      value={retroJobId}
                      onChange={e => setRetroJobId(e.target.value)}
                    >
                      <option value="none">{t('t_auto_346')}</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </div>
                )}

                {!['annual_leave', 'sick_leave', 'half_day_leave', 'casual_leave', 'permission', 'compensation'].includes(retroType) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">{t('t_auto_347')}</label>
                        <SmartTimePicker value={retroStart} onChange={setRetroStart} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">{t('t_auto_348')}</label>
                        <SmartTimePicker value={retroEnd} onChange={setRetroEnd} />
                      </div>
                    </div>
                    <div className="space-y-1 pb-2">
                       <label className="text-xs font-bold text-foreground inline-flex items-center gap-1"><Coffee className="w-3 h-3"/> {t('t_auto_349')}</label>
                       <Input type="number" min="0" value={retroBreak} onChange={e => setRetroBreak(e.target.value)} placeholder={t('t_auto_350')} />
                    </div>
                    
                    {retroIsRest && ['salary', 'freelance'].includes(retroType) && (
                       <div className="space-y-1 animate-in fade-in pb-2">
                         <div className="bg-orange-500/10 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold mb-2">
                           {t('t_auto_351')}
                                                                       </div>
                         <label className="text-xs font-bold text-orange-500">{t('t_auto_352')}</label>
                         <select 
                           className="w-full rounded-xl border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm text-orange-600 font-bold"
                           value={retroCompType}
                           onChange={e => setRetroCompType(e.target.value as any)}
                         >
                           <option value="1_day">{t('t_auto_353')}</option>
                           <option value="1_day_plus_overtime">{t('t_auto_354')}</option>
                           <option value="2_days">{t('t_auto_355')}</option>
                         </select>
                       </div>
                    )}
                  </>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">{t('home.notes_optional')}</label>
                  <Input placeholder={t('t_auto_356')} value={noteText} onChange={e => setNoteText(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                 <Button onClick={submitRetroSession} className="flex-1 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">{t('t_auto_357')}</Button>
                 <Button variant="ghost" onClick={() => {setRetroDialogOpen(false); setNoteText('');}} className="h-12 rounded-xl text-muted-foreground hover:bg-secondary">{t('t_auto_305')}</Button>
              </div>
           </div>
         </div>
      )}

      {/* Overlay: Manual Past Session Entry o Edit Active Session Time */}
      {showManualEntry && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4" dir="rtl">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8">
              <h3 className="text-xl font-bold mt-2 text-center">{activeSession ? t('t_auto_358') : t('t_auto_359')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed text-center">
                {activeSession ? t('t_auto_360') : t('t_auto_361')}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('t_auto_362')}</label>
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
                     {activeSession ? t('t_auto_363') : t('t_auto_364')}
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setShowManualEntry(false)}>
                     {t('t_auto_305')}
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
              <h3 className="text-xl font-bold mt-2 text-primary">{t('t_auto_365')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('t_auto_366')} <span className="font-bold text-foreground">{Math.floor(overtimeAskDialog.baseMins / 60)} {t('t_auto_367')} {overtimeAskDialog.baseMins % 60} {t('t_auto_171')}</span>{t('t_auto_368')}
                                        </p>
              
              <div className="flex flex-col gap-2 mt-2">
                  <Button 
                     className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90"
                     onClick={() => {
                        proceedEndSession(overtimeAskDialog.baseMins);
                        setOvertimeAskDialog(null);
                     }}
                  >
                     {t('t_auto_369')}
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
                     {t('t_auto_370')}{Math.ceil(overtimeAskDialog.baseMins / 60)} {t('t_auto_371')}
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
                     {t('t_auto_372')}{Math.floor(overtimeAskDialog.baseMins / 60)} {t('t_auto_371')}
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
                {t('t_auto_373')}
                                          <span className="text-sm font-normal text-muted-foreground">{t('t_auto_374')}</span>
             </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4">
             <button onClick={() => { logSpecialSession('casual_leave'); setIsLeaveSheetOpen(false); toast.success(t('t_auto_375')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">{t('t_auto_376')}</span>
                <div className="w-14 h-14 rounded-[14px] bg-blue-500/10 flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110">
                  <Palmtree className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { setAbsenceType('compensation'); setAbsenceDialogOpen(true); setIsLeaveSheetOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">{t('t_auto_377')}</span>
                <div className="w-14 h-14 rounded-[14px] bg-teal-500/10 flex items-center justify-center text-teal-500 transition-transform group-hover:scale-110">
                  <Calendar className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('sick_leave'); setIsLeaveSheetOpen(false); toast.success(t('t_auto_378')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">{t('t_auto_379')}</span>
                <div className="w-14 h-14 rounded-[14px] bg-red-500/10 flex items-center justify-center text-red-500 transition-transform group-hover:scale-110">
                  <Clock className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('annual_leave'); setIsLeaveSheetOpen(false); toast.success(t('t_auto_380')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <span className="font-bold text-foreground text-lg mr-2">{t('t_auto_381')}</span>
                <div className="w-14 h-14 rounded-[14px] bg-orange-500/10 flex items-center justify-center text-orange-500 transition-transform group-hover:scale-110">
                  <Zap className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => setIsLeaveSheetOpen(false)} className="w-full mt-2 h-[60px] rounded-[1.5rem] bg-secondary/40 hover:bg-secondary text-foreground font-bold transition-colors">
                {t('t_auto_305')}
                                       </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isPermissionSheetOpen} onOpenChange={setIsPermissionSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[90vh] p-6 z-[120] border-t border-border/50" dir="rtl">
          <SheetHeader className="pb-4 text-center">
             <SheetTitle className="text-2xl font-bold flex flex-col items-center gap-2">
                {t('t_auto_382')}
                                          <span className="text-sm font-normal text-muted-foreground">{t('t_auto_383')}</span>
             </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4">
             <button onClick={() => { logSpecialSession('permission', { hours: 1, subtype: 'entry' }); setIsPermissionSheetOpen(false); toast.success(t('t_auto_384')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">{t('t_auto_385')}</span>
                   <span className="text-xs text-muted-foreground mt-0.5">{t('t_auto_386')}</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-yellow-500/10 flex items-center justify-center text-yellow-500 transition-transform group-hover:scale-110">
                  <Timer className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('permission', { hours: 2, subtype: 'exit' }); setIsPermissionSheetOpen(false); toast.success(t('t_auto_387')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">{t('t_auto_388')}</span>
                   <span className="text-xs text-muted-foreground mt-0.5">{t('t_auto_386')}</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-purple-500/10 flex items-center justify-center text-purple-500 transition-transform group-hover:scale-110">
                  <LogOut className="w-7 h-7" />
                </div>
             </button>
             <button onClick={() => { logSpecialSession('half_day_leave'); setIsPermissionSheetOpen(false); toast.success(t('t_auto_389')); }} className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/40 group">
                <div className="flex flex-col text-right mr-2">
                   <span className="font-bold text-foreground text-lg">{t('home.half_day_leave')}</span>
                   <span className="text-xs text-muted-foreground mt-0.5">{t('t_auto_390')}</span>
                </div>
                <div className="w-14 h-14 rounded-[14px] bg-teal-500/10 flex items-center justify-center text-teal-500 transition-transform group-hover:scale-110">
                  <Activity className="w-7 h-7" />
                </div>
             </button>
             
             <button onClick={() => setIsPermissionSheetOpen(false)} className="w-full mt-2 h-[60px] rounded-[1.5rem] bg-secondary/40 hover:bg-secondary text-foreground font-bold transition-colors">
                {t('t_auto_305')}
                                       </button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
