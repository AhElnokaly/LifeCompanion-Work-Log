import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WorkSession, Job, ScheduledShift, MoodLog, AlarmConfig, PaymentLog, WorkSettings, Project } from '../types';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { sendAppNotification } from '../lib/notifications';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const generateEgyptianHolidays = (currentYear: number): {date: string, name: string}[] => {
  const generatedHolidays: {date: string, name: string}[] = [
    { date: `${currentYear}-01-07`, name: 'عيد الميلاد المجيد' },
    { date: `${currentYear}-01-25`, name: 'عيد الشرطة وثورة 25 يناير' },
    { date: `${currentYear}-04-25`, name: 'عيد تحرير سيناء' },
    { date: `${currentYear}-05-01`, name: 'عيد العمال' },
    { date: `${currentYear}-06-30`, name: 'ثورة 30 يونيو' },
    { date: `${currentYear}-07-23`, name: 'ثورة 23 يوليو' },
    { date: `${currentYear}-10-06`, name: 'عيد القوات المسلحة' },
  ];

  for(let i=0; i<366; i++) {
     const day = new Date(currentYear, 0, 1 + i);
     if (day.getFullYear() > currentYear) break;

     let hMonth = 0, hDay = 0;
     try {
        const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', { month: 'numeric', day: 'numeric' });
        const hParts = hijriFormatter.formatToParts(day);
        const mPart = hParts.find(p => p.type === 'month')?.value;
        const dPart = hParts.find(p => p.type === 'day')?.value;
        if(mPart && dPart) {
           hMonth = parseInt(mPart);
           hDay = parseInt(dPart);
        }
     } catch(e) {}

     const yyyy = day.getFullYear();
     const mm = String(day.getMonth() + 1).padStart(2, '0');
     const dd = String(day.getDate()).padStart(2, '0');
     const dateStr = `${yyyy}-${mm}-${dd}`;

     if (hMonth === 10 && hDay === 1) generatedHolidays.push({date: dateStr, name: 'عيد الفطر المبارك'});
     if (hMonth === 10 && hDay === 2) generatedHolidays.push({date: dateStr, name: 'عيد الفطر (اليوم الثاني)'});
     if (hMonth === 10 && hDay === 3) generatedHolidays.push({date: dateStr, name: 'عيد الفطر (اليوم الثالث)'});

     if (hMonth === 12 && hDay === 9) generatedHolidays.push({date: dateStr, name: 'وقفة عرفات'});
     if (hMonth === 12 && hDay === 10) generatedHolidays.push({date: dateStr, name: 'عيد الأضحى المبارك'});
     if (hMonth === 12 && hDay === 11) generatedHolidays.push({date: dateStr, name: 'عيد الأضحى (اليوم الثاني)'});
     if (hMonth === 12 && hDay === 12) generatedHolidays.push({date: dateStr, name: 'عيد الأضحى (اليوم الثالث)'});
     if (hMonth === 12 && hDay === 13) generatedHolidays.push({date: dateStr, name: 'عيد الأضحى (اليوم الرابع)'});

     if (hMonth === 1 && hDay === 1) generatedHolidays.push({date: dateStr, name: 'رأس السنة الهجرية'});
     if (hMonth === 3 && hDay === 12) generatedHolidays.push({date: dateStr, name: 'المولد النبوي الشريف'});
  }
  
  return generatedHolidays.sort((a,b) => a.date.localeCompare(b.date));
};

export const isPublicHoliday = (day: Date, customHolidays?: {date: string, name: string}[]): boolean => {
  const fullDateKey = format(day, 'yyyy-MM-dd');
  if (customHolidays?.some(h => h.date === fullDateKey)) return true;
  return false;
};

interface WorkLogContextType {
  sessions: WorkSession[];
  archivedSessions: WorkSession[];
  projects: Project[];
  jobs: Job[];
  shifts: ScheduledShift[];
  shiftAssignments: Record<string, string>; // Maps YYYY-MM-DD to shiftId
  activeSession: WorkSession | null;
  settings: WorkSettings;
  updateSettings: (settings: WorkSettings) => void;
  startSession: (type: WorkSession['type'], projectId?: string, overrideData?: Partial<WorkSession>) => void;
  endSession: (notes: string, manualData?: Partial<WorkSession>) => void;
  addSession: (session: WorkSession) => void;
  updateSession: (id: string, updates: Partial<WorkSession>) => void;
  updateActiveSession: (updates: Partial<WorkSession>) => void;
  deleteSession: (id: string, hardDelete?: boolean) => void;
  restoreSession: (id: string) => void;
  addProject: (project: Omit<Project, 'id' | 'totalHours'>) => void;
  addJob: (job: Omit<Job, 'id'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  addShift: (shift: Omit<ScheduledShift, 'id'>) => void;
  updateShift: (id: string, updates: Partial<ScheduledShift>) => void;
  removeJob: (id: string) => void;
  removeShift: (id: string) => void;
  toggleShiftAssignment: (dateStr: string, shiftId: string) => void;
  toggleBreak: () => void;
  getBalances: () => {
    remainingAnnualLeaves: number;
    remainingPermissionsHours: number;
    availableCompensations: WorkSession[];
  };
  logSpecialSession: (type: 'annual_leave' | 'half_day_leave' | 'permission' | 'compensation' | 'sick_leave' | 'casual_leave', data?: any) => void;
  deleteAllData: () => Promise<void>;
  
  // Pomodoro
  pomodoroTimeLeft: number;
  pomodoroIsActive: boolean;
  pomodoroMode: 'work' | 'break';
  togglePomodoro: () => void;
  resetPomodoro: (mode: 'work' | 'break') => void;

  // Alarms
  alarms: AlarmConfig[];
  addAlarm: (alarm: Omit<AlarmConfig, 'id'>) => void;
  toggleAlarm: (id: string, enabled?: boolean) => void;
  deleteAlarm: (id: string) => void;
}

const defaultSettings: WorkSettings = {
  system: 'fixed',
  dailyHours: 8,
  monthlyPermissions: 8,
  annualLeaves: 21,
  restDays: [5, 6], // Friday, Saturday
  modules: {
    analytics: true,
    aiSuggestions: true,
    shifts: false,
    healthMood: false,
    finances: false
  }
};

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined);

export const WorkLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>({});
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [settings, setSettings] = useState<WorkSettings>({ ...defaultSettings, onboardingCompleted: false });

  // Pomodoro State
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [pomodoroIsActive, setPomodoroIsActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');

  // Alarms from Dexie
  const alarms = useLiveQuery(() => db.alarms.toArray(), []) || [];

  useEffect(() => {
    let interval: any = null;
    if (pomodoroIsActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (pomodoroIsActive && pomodoroTimeLeft === 0) {
      setPomodoroIsActive(false);
      if (pomodoroMode === 'work') {
        setPomodoroMode('break');
        setPomodoroTimeLeft(5 * 60);
        sendAppNotification('تقنية بومودورو', { body: 'انتهى وقت العمل، خذ راحة 5 دقائق!', tag: 'pomodoro', icon: '/vite.svg' });
      } else {
        setPomodoroMode('work');
        setPomodoroTimeLeft(25 * 60);
        sendAppNotification('تقنية بومودورو', { body: 'انتهت الراحة، حان وقت العمل!', tag: 'pomodoro', icon: '/vite.svg' });
      }
    }
    return () => clearInterval(interval);
  }, [pomodoroIsActive, pomodoroTimeLeft, pomodoroMode]);

  const togglePomodoro = () => setPomodoroIsActive(!pomodoroIsActive);
  const resetPomodoro = (mode: 'work' | 'break') => {
    setPomodoroMode(mode);
    setPomodoroTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
    setPomodoroIsActive(false);
  };

  const addAlarm = async (alarm: Omit<AlarmConfig, 'id'>) => {
    const id = crypto.randomUUID();
    await db.alarms.add({ ...alarm, id });
  };

  const toggleAlarm = async (id: string, enabled?: boolean) => {
    const alarm = await db.alarms.get(id);
    if (alarm) {
      await db.alarms.update(id, { enabled: enabled !== undefined ? enabled : !alarm.enabled });
    }
  };

  const deleteAlarm = async (id: string) => {
    await db.alarms.delete(id);
  };

  // Load from local storage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('worklog_sessions');
    const savedProjects = localStorage.getItem('worklog_projects');
    const savedJobs = localStorage.getItem('worklog_jobs');
    const savedShifts = localStorage.getItem('worklog_shifts');
    const savedAssignments = localStorage.getItem('worklog_shift_assignments');
    const savedActive = localStorage.getItem('worklog_active');
    const savedSettings = localStorage.getItem('worklog_settings');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedShifts) setShifts(JSON.parse(savedShifts));
    if (savedAssignments) setShiftAssignments(JSON.parse(savedAssignments));
    if (savedActive) setActiveSession(JSON.parse(savedActive));
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      
      // Auto-populate Egyptian holidays for the current year if customHolidays is missing or empty
      if (!parsedSettings.customHolidays || parsedSettings.customHolidays.length === 0) {
        parsedSettings.customHolidays = generateEgyptianHolidays(new Date().getFullYear());
      }
      
      setSettings(parsedSettings);
    } else {
      // Auto-populate for default settings
      const newSettings = { ...defaultSettings, onboardingCompleted: false };
      newSettings.customHolidays = generateEgyptianHolidays(new Date().getFullYear());
      setSettings(newSettings);
    }

    // Load sessions and cleanup old archived sessions automatically (Feature 8)
    if (savedSessions) {
      let loadedSessions: WorkSession[] = JSON.parse(savedSessions);
      const now = new Date();
      const cleanedSessions = loadedSessions.filter(s => {
        if (!s.isArchived || !s.archivedAt) return true;
        const diffMs = now.getTime() - new Date(s.archivedAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays < 365; // Keep only if archived within the last 365 days
      });
      setSessions(cleanedSessions);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('worklog_sessions', JSON.stringify(sessions));
    localStorage.setItem('worklog_projects', JSON.stringify(projects));
    localStorage.setItem('worklog_jobs', JSON.stringify(jobs));
    localStorage.setItem('worklog_shifts', JSON.stringify(shifts));
    localStorage.setItem('worklog_shift_assignments', JSON.stringify(shiftAssignments));
    localStorage.setItem('worklog_active', JSON.stringify(activeSession));
    localStorage.setItem('worklog_settings', JSON.stringify(settings));
  }, [sessions, projects, jobs, shifts, shiftAssignments, activeSession, settings]);

  const updateSettings = (newSettings: WorkSettings) => {
    setSettings(newSettings);
  };

  const startSession = (type: WorkSession['type'], entityId?: string, overrideData?: Partial<WorkSession>) => {
    if (activeSession) return;
    
    const startTimeStr = overrideData?.startTime || new Date().toISOString();
    const startTime = new Date(startTimeStr);

    // Check if rest day or public holiday
    const dayOfWeek = startTime.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const isRestDayWork = overrideData?.isRestDayWork !== undefined ? overrideData.isRestDayWork : (settings.restDays.includes(dayOfWeek) || isPublicHoliday(startTime, settings.customHolidays));

    const newSession: WorkSession = {
      id: Date.now().toString(),
      type,
      jobId: type !== 'freelance' ? entityId : undefined,
      projectId: type === 'freelance' ? entityId : undefined,
      startTime: startTimeStr,
      breaks: 0,
      location: 'office',
      notes: '',
      dayStatus: 'work',
      isRestDayWork,
      ...overrideData
    };
    
    setActiveSession(newSession);

    if (settings.notificationsEnabled) {
      sendAppNotification('تم تسجيل الحضور بنجاح', { body: 'نتمنى لك يوم عمل مثمر! يعتمد عليك المحرك الذكي في تتبع إنتاجيتك.' });
    }
    toast.success('تم تسجيل الحضور بنجاح');
  };

  const calculateOvertime = (durationMins: number, isRestDay: boolean, compType?: '1_day' | '2_days' | '1_day_plus_overtime') => {
    let baseOvertime = 0;
    
    if (isRestDay) {
      if (compType === '1_day_plus_overtime') {
         baseOvertime = durationMins;
      } else if (compType === '2_days') {
         baseOvertime = 0;
      } else {
         baseOvertime = compType === '1_day' ? 0 : durationMins; 
      }
    } else {
      const expectedMins = settings.dailyHours * 60;
      baseOvertime = durationMins > expectedMins ? durationMins - expectedMins : 0;
    }

    if (baseOvertime === 0) return 0;
    
    const advanced = settings.advancedRules;
    if (settings.usageComplexity === 'advanced' && advanced) {
       // Threshold check (e.g. if worked < 60 min overtime, and threshold is 60, counts as 0)
       if (advanced.overtimeMinThresholdMinutes && baseOvertime < advanced.overtimeMinThresholdMinutes) {
          return 0; // Did not cross threshold
       }

       // Rounding Strategy
       if (advanced.overtimeRoundingStrategy === 'round_down_hour') {
          return Math.floor(baseOvertime / 60) * 60;
       } else if (advanced.overtimeRoundingStrategy === 'round_down_half') {
          return Math.floor(baseOvertime / 30) * 30;
       }
       // dynamic_ask is handled at endSession UI level usually, but we keep exact here for now
    }

    return baseOvertime;
  };

  const endSession = (notes: string, manualData?: Partial<WorkSession>) => {
    if (!activeSession) return;
    
    let endTime = new Date();
    let duration = Math.round((endTime.getTime() - new Date(activeSession.startTime).getTime()) / 60000);
    
    if (manualData?.endTime) {
      endTime = new Date(manualData.endTime);
      duration = Math.round((endTime.getTime() - new Date(manualData.startTime || activeSession.startTime).getTime()) / 60000);
    }
    
    // Close active break if ending while on break
    let finalBreaks = activeSession.breaks || 0;
    if (activeSession.activeBreakStartTime) {
       const breakStart = new Date(activeSession.activeBreakStartTime);
       finalBreaks += Math.round((endTime.getTime() - breakStart.getTime()) / 60000);
    }
    
    duration = Math.max(0, duration - finalBreaks);

    const isRestDay = activeSession.isRestDayWork || false;
    const compType = activeSession.restDayCompensation;
    const overtimeMinutes = calculateOvertime(duration, isRestDay, compType);

    const completedSession: WorkSession = {
      ...activeSession,
      ...manualData, 
      endTime: endTime.toISOString(),
      duration,
      breaks: finalBreaks,
      activeBreakStartTime: undefined,
      overtimeMinutes,
      notes,
    };
    
    setSessions([...sessions, completedSession]);
    setActiveSession(null);

    if (settings.notificationsEnabled && settings.notificationPreferences?.endOfDay) {
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      sendAppNotification('تم تسجيل الانصراف بنجاح', { body: `مدة العمل: ${hours} ساعة و ${mins} دقيقة. استرح الآن لتجديد طاقتك!` });
    }
    toast.success('تم إنهاء الجلسة وحفظها بنجاح');
  };

  const toggleBreak = () => {
    if (!activeSession) return;
    
    if (activeSession.activeBreakStartTime) {
      // End break
      const breakStart = new Date(activeSession.activeBreakStartTime);
      const breakDuration = Math.round((new Date().getTime() - breakStart.getTime()) / 60000);
      setActiveSession({
        ...activeSession,
        breaks: (activeSession.breaks || 0) + breakDuration,
        activeBreakStartTime: undefined,
      });
    } else {
      // Start break
      setActiveSession({
        ...activeSession,
        activeBreakStartTime: new Date().toISOString(),
      });
    }
  };

  const addSession = (session: WorkSession) => {
    const isRestDay = session.isRestDayWork || false;
    let duration = session.duration || 0;
    
    if (!duration && session.startTime && session.endTime) {
      duration = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
    }
    
    const overtimeMinutes = session.overtimeMinutes !== undefined ? session.overtimeMinutes : calculateOvertime(duration, isRestDay, session.restDayCompensation);
    
    setSessions([...sessions, { ...session, duration, overtimeMinutes }]);
  };

  const updateSession = (id: string, updates: Partial<WorkSession>) => {
    setSessions(current => current.map(sess => {
      if (sess.id !== id) return sess;
      const updated = { ...sess, ...updates };
      // Recalculate duration & overtime if times changed or if compensation changed
      if (updates.startTime || updates.endTime || updates.isRestDayWork !== undefined || updates.duration !== undefined || updates.restDayCompensation !== undefined) {
         if (updated.endTime && updated.startTime) {
           updated.duration = Math.round((new Date(updated.endTime).getTime() - new Date(updated.startTime).getTime()) / 60000);
         }
         const isRest = updated.isRestDayWork || false;
         updated.overtimeMinutes = calculateOvertime(updated.duration || 0, isRest, updated.restDayCompensation);
      }
      return updated;
    }));
  };

  const updateActiveSession = (updates: Partial<WorkSession>) => {
    setActiveSession(current => current ? { ...current, ...updates } : null);
  };

  const deleteSession = (id: string, hardDelete = false) => {
    if (hardDelete) {
      setSessions(current => current.filter(sess => sess.id !== id));
    } else {
      setSessions(current => current.map(sess => 
        sess.id === id ? { ...sess, isArchived: true, archivedAt: new Date().toISOString() } : sess
      ));
    }
  };

  const restoreSession = (id: string) => {
    setSessions(current => current.map(sess => 
      sess.id === id ? { ...sess, isArchived: false, archivedAt: undefined } : sess
    ));
  };

  const addProject = (projectData: Omit<Project, 'id' | 'totalHours'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      totalHours: 0,
    };
    setProjects([...projects, newProject]);
  };

  const addJob = (jobData: Omit<Job, 'id'>) => {
    setJobs([...jobs, { ...jobData, id: Date.now().toString() }]);
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(current => current.map(job => job.id === id ? { ...job, ...updates } : job));
  };

  const addShift = (shiftData: Omit<ScheduledShift, 'id'>) => {
    setShifts([...shifts, { ...shiftData, id: Date.now().toString() }]);
  };

  const updateShift = (id: string, updates: Partial<ScheduledShift>) => {
    setShifts(current => current.map(shift => shift.id === id ? { ...shift, ...updates } : shift));
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const removeShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const toggleShiftAssignment = (dateStr: string, shiftId: string) => {
    setShiftAssignments(current => {
      const next = { ...current };
      if (next[dateStr] === shiftId) {
        delete next[dateStr];
      } else {
        next[dateStr] = shiftId;
      }
      return next;
    });
  };

  const getBalances = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Annual leaves
    const usedAnnualLeaves = sessions
      .filter(s => s.dayStatus === "annual_leave" && new Date(s.startTime).getFullYear() === currentYear)
      .reduce((acc, s) => acc + (s.duration === (settings.dailyHours * 60) / 2 ? 0.5 : 1), 0);
    const remainingAnnualLeaves = settings.annualLeaves - usedAnnualLeaves;

    // Permissions (hours)
    const usedPermissionsHours = sessions
      .filter(s => s.dayStatus === 'permission' && new Date(s.startTime).getMonth() === currentMonth && new Date(s.startTime).getFullYear() === currentYear)
      .reduce((acc, s) => acc + (s.permissionHours || ((s.duration || 0) / 60)), 0);
    const remainingPermissionsHours = settings.monthlyPermissions - usedPermissionsHours;

    // Compensations (Find rest day work sessions that don't have a linked compensation leave)
    let compensationDaysAccrued = 0;
    let compensationDaysTaken = sessions.filter(s => s.dayStatus === 'compensation').length;

    sessions.forEach(s => {
      if (s.isRestDayWork) {
        if (s.restDayCompensation === '1_day' || s.restDayCompensation === '1_day_plus_overtime') compensationDaysAccrued += 1;
        else if (s.restDayCompensation === '2_days') compensationDaysAccrued += 2;
      }
    });
    
    // We can also calculate actual available compensation instances based on linked ID logic in HomeView,
    // but here we just return the accrued vs taken to avoid double counting if any exist
    const availableCompensations = sessions.filter(s => s.isRestDayWork && !s.isArchived); // Expose the raw list, HomeView handles mapping

    return {
      remainingAnnualLeaves,
      remainingPermissionsHours,
      availableCompensations
    };
  };

  const logSpecialSession = (type: 'annual_leave' | 'half_day_leave' | 'permission' | 'compensation' | 'sick_leave' | 'casual_leave', data?: any) => {
    const startTime = data?.date ? new Date(data.date) : new Date();
    const newSession: WorkSession = {
      id: Date.now().toString(),
      type: 'salary',
      startTime: startTime.toISOString(),
      endTime: startTime.toISOString(), // special sessions might just be 0 duration markers or standard 8 hours depending on type
      duration: 0,
      breaks: 0,
      location: 'office',
      dayStatus: 'work',
      notes: data?.note || '',
    };

    if (type === 'annual_leave') {
      newSession.dayStatus = 'annual_leave';
      newSession.duration = settings.dailyHours * 60;
      newSession.notes = data?.note || 'إجازة سنوية/اعتيادية';
    } else if (type === 'half_day_leave') {
      newSession.dayStatus = 'half_day_leave';
      newSession.duration = (settings.dailyHours * 60) / 2;
      newSession.notes = data?.note || 'إجازة نصف يوم';
    } else if (type === 'sick_leave') {
      newSession.dayStatus = 'sick_leave';
      newSession.duration = settings.dailyHours * 60;
      newSession.notes = data?.note || 'إجازة مرضية';
    } else if (type === 'casual_leave') {
      newSession.dayStatus = 'casual_leave';
      newSession.duration = settings.dailyHours * 60;
      newSession.notes = data?.note || 'إجازة عارضة';
    } else if (type === 'permission') {
      newSession.dayStatus = 'permission';
      const hours = data?.hours || 1;
      const subtype = data?.subtype === 'entry' ? 'تصريح دخول متأخر' : data?.subtype === 'exit' ? 'تصريح خروج مبكر' : 'تصريح';
      newSession.duration = hours * 60;
      newSession.permissionHours = hours;
      newSession.notes = `${subtype} (${hours} ساعة/ساعات)${data?.note ? ' - ' + data.note : ''}`;
    } else if (type === 'compensation') {
      newSession.dayStatus = 'compensation';
      newSession.linkedCompensationSessionId = data?.linkedId;
      newSession.duration = settings.dailyHours * 60;
      newSession.notes = data?.note || 'يوم بديل لعمل في يوم راحة';
    }

    setSessions([...sessions, newSession]);
  };

  const deleteAllData = async () => {
    // Clear localStorage
    localStorage.removeItem('worklog_sessions');
    localStorage.removeItem('worklog_projects');
    localStorage.removeItem('worklog_jobs');
    localStorage.removeItem('worklog_shifts');
    localStorage.removeItem('worklog_active');
    localStorage.removeItem('worklog_settings');
    
    // Clear Dexie DB
    await Promise.all([
      db.sessions.clear(),
      db.jobs.clear(),
      db.shifts.clear(),
      db.moods.clear(),
      db.alarms.clear(),
      db.payments.clear()
    ]);

    // Reset Context State
    setSessions([]);
    setProjects([]);
    setJobs([]);
    setShifts([]);
    setActiveSession(null);
    setSettings(defaultSettings);
    
    // Hard refresh to clear any potentially stuck state
    window.location.reload();
  };

  const activeSessions = sessions.filter(s => !s.isArchived);
  const archivedSessions = sessions.filter(s => s.isArchived);

  return (
    <WorkLogContext.Provider value={{ 
      sessions: activeSessions, archivedSessions, projects, jobs, shifts, shiftAssignments, activeSession, settings, 
      updateSettings, startSession, endSession, addSession, updateSession, updateActiveSession, deleteSession, restoreSession, addProject, addJob, updateJob, addShift, updateShift, removeJob, removeShift, toggleShiftAssignment,
      toggleBreak, getBalances, logSpecialSession, deleteAllData,
      pomodoroTimeLeft, pomodoroIsActive, pomodoroMode, togglePomodoro, resetPomodoro,
      alarms, addAlarm, toggleAlarm, deleteAlarm
    }}>
      {children}
    </WorkLogContext.Provider>
  );
};

export const useWorkLog = () => {
  const context = useContext(WorkLogContext);
  if (context === undefined) {
    throw new Error('useWorkLog must be used within a WorkLogProvider');
  }
  return context;
};
