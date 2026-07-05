import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WorkSession, Job, ScheduledShift, MoodLog, AlarmConfig, PaymentLog, WorkSettings, Project } from '../types';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { sendAppNotification } from '../lib/notifications';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { db as firestoreDb } from '../lib/firebase';
import { doc, setDoc, deleteDoc, getDocs, collection, getDoc } from 'firebase/firestore';
import { getRestDaysForDate, isPublicHoliday, isRestDayForDate } from '../lib/utils';


const cleanSettingsToFirestore = (userId: string, s: any) => {
  return {
    userId,
    system: s.system || 'fixed',
    dailyHours: Number(s.dailyHours) || 8,
    monthlyPermissions: Number(s.monthlyPermissions) || 2,
    annualLeaves: Number(s.annualLeaves) || 21,
    restDays: s.restDays || [5, 6],
    onboardingCompleted: !!s.onboardingCompleted,
    weeklyHoursTarget: s.weeklyHoursTarget || null,
    monthlyHoursTarget: s.monthlyHoursTarget || null,
    compensationValidityDays: s.compensationValidityDays || null,
    autoCheckIn: !!s.autoCheckIn,
    customAIApiKey: s.customAIApiKey || '',
    expectedStartTime: s.expectedStartTime || '09:00',
    expectedEndTime: s.expectedEndTime || '17:00',
    restDaysSchedule: s.restDaysSchedule || [],
    customHolidays: s.customHolidays || [],
    notificationsEnabled: !!s.notificationsEnabled,
    notificationPreferences: s.notificationPreferences || {},
    advancedRules: s.advancedRules || {},
    modules: s.modules || {}
  };
};

const cleanSessionToFirestore = (userId: string, s: any) => {
  return {
    userId,
    type: s.type || 'salary',
    jobId: s.jobId || '',
    projectId: s.projectId || '',
    startTime: s.startTime || new Date().toISOString(),
    endTime: s.endTime || '',
    duration: Number(s.duration) || 0,
    breaks: Number(s.breaks) || 0,
    location: s.location || 'office',
    notes: s.notes || '',
    dayStatus: s.dayStatus || 'work',
    isRestDayWork: !!s.isRestDayWork,
    restDayCompensation: s.restDayCompensation || '1_day',
    overtimeMinutes: Number(s.overtimeMinutes) || 0,
    fractionMinutes: Number(s.fractionMinutes) || 0,
    isArchived: !!s.isArchived,
    archivedAt: s.archivedAt || ''
  };
};

const cleanJobToFirestore = (userId: string, j: any) => {
  return {
    userId,
    name: j.name || 'Job',
    color: j.color || '#6366f1',
    type: j.type || 'fixed',
    hourlyRate: Number(j.hourlyRate) || 0,
    monthlyTargetHours: Number(j.monthlyTargetHours) || 0
  };
};

const cleanProjectToFirestore = (userId: string, p: any) => {
  return {
    userId,
    name: p.name || 'Project',
    color: p.color || '#10b981',
    totalHours: Number(p.totalHours) || 0
  };
};

const cleanShiftToFirestore = (userId: string, s: any) => {
  return {
    userId,
    name: s.name || '',
    startTime: s.startTime || '',
    endTime: s.endTime || '',
    jobId: s.jobId || ''
  };
};

const cleanAlarmToFirestore = (userId: string, a: any) => {
  return {
    userId,
    timing: a.timing || 'before',
    anchor: a.anchor || 'startTime',
    minutes: Number(a.minutes) || 0,
    ringtone: a.ringtone || 'digital',
    enabled: !!a.enabled
  };
};

const cleanPaymentToFirestore = (userId: string, p: any) => {
  return {
    userId,
    jobId: p.jobId || '',
    amount: Number(p.amount) || 0,
    expectedDate: p.expectedDate || '',
    status: p.status || 'pending'
  };
};

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
        const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', { month: 'numeric', day: 'numeric' });
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

export { getRestDaysForDate, isPublicHoliday, isRestDayForDate };

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
  getBalances: (targetDate?: Date) => {
    remainingAnnualLeaves: number;
    remainingPermissionsHours: number;
    availableCompensations: WorkSession[];
  };
  calculateOvertimeAndFraction: (
    durationMins: number,
    isRestDay: boolean,
    compType?: '1_day' | '2_days' | '1_day_plus_overtime',
    userSelectedMins?: number
  ) => { overtimeMinutes: number; fractionMinutes: number };
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
  monthlyPermissions: 2,
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
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shifts, setShifts] = useState<ScheduledShift[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>({});
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [settings, setSettings] = useState<WorkSettings>({ ...defaultSettings, onboardingCompleted: false });

  // Cloud Synchronization Hook
  useEffect(() => {
    if (!user) return;

    const syncWithFirestore = async () => {
      const toastId = toast.loading("جاري مزامنة بياناتك مع السحابة...");
      try {
        const userId = user.uid;

        // 1. Sync Settings
        const settingsRef = doc(firestoreDb, 'users', userId, 'settings', 'main');
        const settingsSnap = await getDoc(settingsRef);
        let mergedSettings = { ...settings };
        if (settingsSnap.exists()) {
          const cloudSettings = settingsSnap.data() as any;
          mergedSettings = { ...settings, ...cloudSettings };
          setSettings(mergedSettings);
        } else {
          const dataToUpload = cleanSettingsToFirestore(userId, settings);
          await setDoc(settingsRef, dataToUpload);
        }

        // 2. Sync Jobs
        const jobsRef = collection(firestoreDb, 'users', userId, 'jobs');
        const jobsSnap = await getDocs(jobsRef);
        const cloudJobs = jobsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Job[];
        
        let mergedJobs = [...jobs];
        cloudJobs.forEach(cj => {
          if (!mergedJobs.some(mj => mj.id === cj.id)) {
            mergedJobs.push(cj);
          }
        });
        setJobs(mergedJobs);
        for (const lj of jobs) {
          if (!cloudJobs.some(cj => cj.id === lj.id)) {
            await setDoc(doc(firestoreDb, 'users', userId, 'jobs', lj.id), cleanJobToFirestore(userId, lj));
          }
        }

        // 3. Sync Projects
        const projectsRef = collection(firestoreDb, 'users', userId, 'projects');
        const projectsSnap = await getDocs(projectsRef);
        const cloudProjects = projectsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Project[];
        
        let mergedProjects = [...projects];
        cloudProjects.forEach(cp => {
          if (!mergedProjects.some(mp => mp.id === cp.id)) {
            mergedProjects.push(cp);
          }
        });
        setProjects(mergedProjects);
        for (const lp of projects) {
          if (!cloudProjects.some(cp => cp.id === lp.id)) {
            await setDoc(doc(firestoreDb, 'users', userId, 'projects', lp.id), cleanProjectToFirestore(userId, lp));
          }
        }

        // 4. Sync Sessions
        const sessionsRef = collection(firestoreDb, 'users', userId, 'sessions');
        const sessionsSnap = await getDocs(sessionsRef);
        const cloudSessions = sessionsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as WorkSession[];
        
        let mergedSessions = [...sessions];
        cloudSessions.forEach(cs => {
          if (!mergedSessions.some(ms => ms.id === cs.id)) {
            mergedSessions.push(cs);
          }
        });
        setSessions(mergedSessions);
        for (const ls of sessions) {
          if (!cloudSessions.some(cs => cs.id === ls.id)) {
            await setDoc(doc(firestoreDb, 'users', userId, 'sessions', ls.id), cleanSessionToFirestore(userId, ls));
          }
        }

        // 5. Sync Shifts
        const shiftsRef = collection(firestoreDb, 'users', userId, 'shifts');
        const shiftsSnap = await getDocs(shiftsRef);
        const cloudShifts = shiftsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as ScheduledShift[];
        
        let mergedShifts = [...shifts];
        cloudShifts.forEach(cs => {
          if (!mergedShifts.some(ms => ms.id === cs.id)) {
            mergedShifts.push(cs);
          }
        });
        setShifts(mergedShifts);
        for (const ls of shifts) {
          if (!cloudShifts.some(cs => cs.id === ls.id)) {
            await setDoc(doc(firestoreDb, 'users', userId, 'shifts', ls.id), cleanShiftToFirestore(userId, ls));
          }
        }

        toast.dismiss(toastId);
        toast.success("تمت مزامنة البيانات السحابية بنجاح!");
      } catch (err) {
        console.error("Firestore sync error", err);
        toast.dismiss(toastId);
        toast.error("فشلت بعض عمليات المزامنة الفورية للسحابة من داخل المعاينة الآمنة.");
      }
    };

    syncWithFirestore();
  }, [user]);

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
    const finalAlarm = { ...alarm, id };
    await db.alarms.add(finalAlarm);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'alarms', id), cleanAlarmToFirestore(user.uid, finalAlarm))
        .catch(err => console.error("Cloud alarm add error", err));
    }
  };

  const toggleAlarm = async (id: string, enabled?: boolean) => {
    const alarm = await db.alarms.get(id);
    if (alarm) {
      const nextEnabled = enabled !== undefined ? enabled : !alarm.enabled;
      await db.alarms.update(id, { enabled: nextEnabled });
      if (user) {
        setDoc(doc(firestoreDb, 'users', user.uid, 'alarms', id), cleanAlarmToFirestore(user.uid, { ...alarm, enabled: nextEnabled }))
          .catch(err => console.error("Cloud alarm toggle error", err));
      }
    }
  };

  const deleteAlarm = async (id: string) => {
    await db.alarms.delete(id);
    if (user) {
      deleteDoc(doc(firestoreDb, 'users', user.uid, 'alarms', id))
        .catch(err => console.error("Cloud alarm delete error", err));
    }
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
    let activeSet = defaultSettings;
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      
      // Auto-populate Egyptian holidays for the current year if customHolidays is missing or empty
      if (!parsedSettings.customHolidays || parsedSettings.customHolidays.length === 0) {
        parsedSettings.customHolidays = generateEgyptianHolidays(new Date().getFullYear());
      }
      
      setSettings(parsedSettings);
      activeSet = parsedSettings;
    } else {
      // Auto-populate for default settings
      const newSettings = { ...defaultSettings, onboardingCompleted: false };
      newSettings.customHolidays = generateEgyptianHolidays(new Date().getFullYear());
      setSettings(newSettings);
      activeSet = newSettings;
    }

    // Function to normalize / clean up any old sessions that have float values in overtime or miss fractionMinutes
    const cleanSessionOvertimeAndFractions = (sess: WorkSession, activeSetVal: typeof defaultSettings) => {
      if (sess.dayStatus !== 'work' && sess.dayStatus !== 'rest_day_work') {
        return { ...sess, overtimeMinutes: 0, fractionMinutes: 0 };
      }

      let durationVal = sess.duration || 0;
      if (!durationVal && sess.startTime && sess.endTime) {
        durationVal = Math.round((new Date(sess.endTime).getTime() - new Date(sess.startTime).getTime()) / 60000);
      }

      const isRest = sess.isRestDayWork || false;
      const comp = sess.restDayCompensation;
      let baseOvertime = 0;

      if (isRest) {
        if (comp === '1_day_plus_overtime') {
           baseOvertime = durationVal;
        } else if (comp === '2_days') {
           baseOvertime = 0;
        } else {
           baseOvertime = comp === '1_day' ? 0 : durationVal; 
        }
      } else {
        const expectedMins = activeSetVal.dailyHours * 60;
        baseOvertime = durationVal > expectedMins ? durationVal - expectedMins : 0;
      }

      if (baseOvertime === 0) {
        return { ...sess, duration: durationVal, overtimeMinutes: 0, fractionMinutes: 0 };
      }

      const advanced = activeSetVal.advancedRules;
      if (activeSetVal.usageComplexity === 'advanced' && advanced) {
         if (advanced.overtimeMinThresholdMinutes && baseOvertime < advanced.overtimeMinThresholdMinutes) {
            return { ...sess, duration: durationVal, overtimeMinutes: 0, fractionMinutes: 0 };
         }
      }

      // Respect the rounding strategy
      const strategy = (activeSetVal.usageComplexity === 'advanced' && advanced) 
        ? (advanced.overtimeRoundingStrategy || 'exact') 
        : 'exact';

      let calculatedOvertimeMins = baseOvertime;

      if (strategy === 'round_down_half') {
        calculatedOvertimeMins = Math.floor(baseOvertime / 30) * 30;
      } else {
        // Default to whole hours for exact, round_down_hour, etc.
        calculatedOvertimeMins = Math.floor(baseOvertime / 60) * 60;
      }

      // Apply corporate max overtime cap
      if (activeSetVal.usageComplexity === 'advanced' && advanced && advanced.maxOvertimeHours) {
         calculatedOvertimeMins = Math.min(calculatedOvertimeMins, advanced.maxOvertimeHours * 60);
      }

      const calculatedFractionMins = Math.max(0, baseOvertime - calculatedOvertimeMins);

      return {
        ...sess,
        duration: durationVal,
        overtimeMinutes: calculatedOvertimeMins,
        fractionMinutes: calculatedFractionMins
      };
    };

    // Load sessions and cleanup old archived sessions automatically (Feature 8)
    if (savedSessions) {
      let loadedSessions: WorkSession[] = JSON.parse(savedSessions);
      const now = new Date();
      const cleanedSessions = loadedSessions.filter(s => {
        if (!s.isArchived || !s.archivedAt) return true;
        const diffMs = now.getTime() - new Date(s.archivedAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays < 365; // Keep only if archived within the last 365 days
      }).map(s => cleanSessionOvertimeAndFractions(s, activeSet));
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
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'settings', 'main'), cleanSettingsToFirestore(user.uid, newSettings))
        .catch(err => console.error("Firestore settings update error", err));
    }
  };

  const startSession = (type: WorkSession['type'], entityId?: string, overrideData?: Partial<WorkSession>) => {
    if (activeSession) return;
    
    const startTimeStr = overrideData?.startTime || new Date().toISOString();
    const startTime = new Date(startTimeStr);

    // Check if rest day or public holiday
    const isRestDayWork = overrideData?.isRestDayWork !== undefined ? overrideData.isRestDayWork : isRestDayForDate(startTime, settings);

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

    // Smart attendance detection for Rest Days
    if (isRestDayWork && !overrideData?.restDayCompensation) {
      setTimeout(() => {
        toast('🚨 تنبيه: حضور في يوم إجازة!', {
          description: 'أنت تسجل حضور في يوم مصنف كعطلة أو راحة في إعداداتك. كيف تود احتساب هذا اليوم؟',
          duration: 15000,
          action: {
            label: 'عائد نقدي ووقت إضافي',
            onClick: () => {
              updateActiveSession({ restDayCompensation: '1_day_plus_overtime' });
            }
          }
        });
      }, 1000);
    }
  };

  // +++ تم تعديل السلوك لإرجاع الساعات الإضافية وكسر الساعة بدقة مع احترام استراتيجيات وبنود التقريب +++
  const calculateOvertimeAndFraction = (
    durationMins: number,
    isRestDay: boolean,
    compType?: '1_day' | '2_days' | '1_day_plus_overtime',
    userSelectedMins?: number
  ) => {
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

    if (baseOvertime === 0) {
      return { overtimeMinutes: 0, fractionMinutes: 0 };
    }
    
    const advanced = settings.advancedRules;
    if (settings.usageComplexity === 'advanced' && advanced) {
       // Check threshold
       if (advanced.overtimeMinThresholdMinutes && baseOvertime < advanced.overtimeMinThresholdMinutes) {
          return { overtimeMinutes: 0, fractionMinutes: 0 };
       }
    }

    // If there is an explicit userSelectedMins choice from the dialog (e.g. from endSession)
    if (userSelectedMins !== undefined) {
      const maxMins = (settings.usageComplexity === 'advanced' && advanced && advanced.maxOvertimeHours) 
        ? advanced.maxOvertimeHours * 60 
        : Infinity;
      const finalMins = Math.min(userSelectedMins, maxMins);
      return {
        overtimeMinutes: finalMins,
        fractionMinutes: Math.max(0, baseOvertime - finalMins)
      };
    }

    // Respect the rounding strategy
    const strategy = (settings.usageComplexity === 'advanced' && advanced) 
      ? (advanced.overtimeRoundingStrategy || 'exact') 
      : 'exact';

    let calculatedOvertimeMins = baseOvertime;

    if (strategy === 'round_down_half') {
      calculatedOvertimeMins = Math.floor(baseOvertime / 30) * 30;
    } else {
      // Default to whole hours for exact, round_down_hour, etc.
      calculatedOvertimeMins = Math.floor(baseOvertime / 60) * 60;
    }

    // Apply corporate max overtime cap if applicable
    if (settings.usageComplexity === 'advanced' && advanced && advanced.maxOvertimeHours) {
       calculatedOvertimeMins = Math.min(calculatedOvertimeMins, advanced.maxOvertimeHours * 60);
    }

    const calculatedFractionMins = Math.max(0, baseOvertime - calculatedOvertimeMins);

    return {
      overtimeMinutes: calculatedOvertimeMins,
      fractionMinutes: calculatedFractionMins
    };
  };

  const calculateOvertime = (durationMins: number, isRestDay: boolean, compType?: '1_day' | '2_days' | '1_day_plus_overtime') => {
    return calculateOvertimeAndFraction(durationMins, isRestDay, compType).overtimeMinutes;
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
    
    // +++ استخدام الحسبة الجديدة لتفريع الإضافي والكسر بدقة مع الحفاظ على الاختيار اليدوي للمستخدم +++
    const calcResult = calculateOvertimeAndFraction(duration, isRestDay, compType, manualData?.overtimeMinutes);

    const completedSession: WorkSession = {
      ...activeSession,
      ...manualData, 
      endTime: endTime.toISOString(),
      duration,
      breaks: finalBreaks,
      activeBreakStartTime: undefined,
      overtimeMinutes: calcResult.overtimeMinutes,
      fractionMinutes: calcResult.fractionMinutes,
      notes,
    };
    
    setSessions([...sessions, completedSession]);
    setActiveSession(null);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', completedSession.id), cleanSessionToFirestore(user.uid, completedSession))
        .catch(err => console.error("Cloud session save error", err));
    }

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
    // Overlap check
    if (session.startTime && session.endTime && (session.dayStatus === 'work' || session.dayStatus === 'rest_day_work')) {
      const newStart = new Date(session.startTime).getTime();
      const newEnd = new Date(session.endTime).getTime();
      
      const hasOverlap = sessions.some(s => {
        if (s.id === session.id || s.isArchived) return false;
        if (s.dayStatus !== 'work' && s.dayStatus !== 'rest_day_work') return false;
        if (!s.startTime || !s.endTime) return false;
        const existsStart = new Date(s.startTime).getTime();
        const existsEnd = new Date(s.endTime).getTime();
        // Check overlap
        return (newStart < existsEnd && newEnd > existsStart);
      });
      
      // Allow projects to overlap as they act like "tasks", but main work sessions shouldn't overlap
      if (hasOverlap && session.type !== 'project') {
         toast.error('لا يمكن تسجيل فترتي عمل متداخلتين. تأكد من مواعيد الحضور والانصراف.');
         return; // Cancel insertion
      }
    }
    let isRestDay = session.isRestDayWork || false;
    let duration = session.duration || 0;
    
    // Smart verification for manual entries
    if (session.startTime) {
       const sDate = new Date(session.startTime);
       const isActuallyHoliday = isRestDayForDate(sDate, settings);

       if (session.dayStatus === 'work' && isActuallyHoliday && !isRestDay) {
          if (window.confirm('🚨 تنبيه ذكي: أنت تسجل يوم عمل في تاريخ يُعتبر عطلة رسمية أو يعتب يوم راحة! هل تود اعتباره "عمل في يوم عطلة" (Overtime / Compensation)؟')) {
             isRestDay = true;
             session.isRestDayWork = true;
             session.restDayCompensation = '1_day_plus_overtime';
          }
       } else if (['annual_leave', 'half_day_leave', 'casual_leave'].includes(session.dayStatus || '') && isActuallyHoliday) {
          if (window.confirm('🚨 تنبيه ذكي: هذا التاريخ المحدد يُعتبر بالفعل عطلة رسمية بالدولة أو يوم راحة! هل تود تسجيله كـ "عطلة رسمية" بدلاً من إجازة تخصم من رصيدك السنوي؟')) {
             session.dayStatus = 'public_holiday';
             session.notes = 'عطلة رسمية / يوم راحة (تصحيح ذكي للرصيد)';
          }
       }
    }
    
    if (!duration && session.startTime && session.endTime) {
      duration = Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000);
    }
    
    // +++ استخدام الحسبة الجديدة لتحديد الإضافي والكسر وتجنب ترحيل الكسور للأوفرتايم +++
    const calcResult = calculateOvertimeAndFraction(duration, isRestDay, session.restDayCompensation, session.overtimeMinutes);
    const overtimeMinutes = calcResult.overtimeMinutes;
    const fractionMinutes = calcResult.fractionMinutes;
    
    const finalSession = { ...session, isRestDayWork: isRestDay, duration, overtimeMinutes, fractionMinutes };
    setSessions([...sessions, finalSession]);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', finalSession.id), cleanSessionToFirestore(user.uid, finalSession))
        .catch(err => console.error("Cloud session add error", err));
    }
  };

  const updateSession = (id: string, updates: Partial<WorkSession>) => {
    // Overlap check for updates
    const existingSession = sessions.find(s => s.id === id);
    if (existingSession && (updates.startTime || updates.endTime)) {
      const newStart = updates.startTime ? new Date(updates.startTime).getTime() : new Date(existingSession.startTime).getTime();
      const newEnd = updates.endTime ? new Date(updates.endTime).getTime() : (existingSession.endTime ? new Date(existingSession.endTime).getTime() : null);
      const newDayStatus = updates.dayStatus !== undefined ? updates.dayStatus : existingSession.dayStatus;
      const newType = updates.type !== undefined ? updates.type : existingSession.type;
      
      if (newEnd && (newDayStatus === 'work' || newDayStatus === 'rest_day_work')) {
        const hasOverlap = sessions.some(s => {
          if (s.id === id || s.isArchived) return false;
          if (s.dayStatus !== 'work' && s.dayStatus !== 'rest_day_work') return false;
          if (!s.startTime || !s.endTime) return false;
          const existsStart = new Date(s.startTime).getTime();
          const existsEnd = new Date(s.endTime).getTime();
          return (newStart < existsEnd && newEnd > existsStart);
        });
        
        if (hasOverlap && newType !== 'project') {
           toast.error('لا يمكن تعديل وقت العمل ليتداخل مع فترة عمل أخرى مسجلة.');
           return; // Cancel update
        }
      }
    }
    setSessions(current => current.map(sess => {
      if (sess.id !== id) return sess;
      const updated = { ...sess, ...updates };
      // Recalculate duration & overtime if times, day status, or compensation changed
      if (updates.startTime || updates.endTime || updates.isRestDayWork !== undefined || updates.duration !== undefined || updates.restDayCompensation !== undefined || updates.dayStatus !== undefined) {
         if (updated.endTime && updated.startTime) {
           updated.duration = Math.round((new Date(updated.endTime).getTime() - new Date(updated.startTime).getTime()) / 60000);
         }
         if (updated.dayStatus !== 'work' && updated.dayStatus !== 'rest_day_work') {
           updated.overtimeMinutes = 0;
           updated.fractionMinutes = 0;
         } else {
           const isRest = updated.isRestDayWork || false;
           // +++ استخدام الحسبة الجديدة لتحديث الإضافي والكسر وتصحيحه عند التحديث +++
           const calcResult = calculateOvertimeAndFraction(updated.duration || 0, isRest, updated.restDayCompensation, updates.overtimeMinutes !== undefined ? updates.overtimeMinutes : updated.overtimeMinutes);
           updated.overtimeMinutes = calcResult.overtimeMinutes;
           updated.fractionMinutes = calcResult.fractionMinutes;
         }
      }
      if (user) {
        setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', id), cleanSessionToFirestore(user.uid, updated))
          .catch(err => console.error("Cloud session update error", err));
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
      if (user) {
        deleteDoc(doc(firestoreDb, 'users', user.uid, 'sessions', id))
          .catch(err => console.error("Cloud session delete error", err));
      }
    } else {
      setSessions(current => current.map(sess => {
        if (sess.id === id) {
          const updated = { ...sess, isArchived: true, archivedAt: new Date().toISOString() };
          if (user) {
            setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', id), cleanSessionToFirestore(user.uid, updated))
              .catch(err => console.error("Cloud session archive error", err));
          }
          return updated;
        }
        return sess;
      }));
    }
  };

  const restoreSession = (id: string) => {
    setSessions(current => current.map(sess => {
      if (sess.id === id) {
        const updated = { ...sess, isArchived: false, archivedAt: undefined };
        if (user) {
          setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', id), cleanSessionToFirestore(user.uid, updated))
            .catch(err => console.error("Cloud session restore error", err));
        }
        return updated;
      }
      return sess;
    }));
  };

  const addProject = (projectData: Omit<Project, 'id' | 'totalHours'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      totalHours: 0,
    };
    setProjects([...projects, newProject]);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'projects', newProject.id), cleanProjectToFirestore(user.uid, newProject))
        .catch(err => console.error("Cloud project add error", err));
    }
  };

  const addJob = (jobData: Omit<Job, 'id'>) => {
    const newJob = { ...jobData, id: Date.now().toString() };
    setJobs([...jobs, newJob]);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'jobs', newJob.id), cleanJobToFirestore(user.uid, newJob))
        .catch(err => console.error("Cloud job add error", err));
    }
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(current => current.map(job => {
      if (job.id === id) {
        const updated = { ...job, ...updates };
        if (user) {
          setDoc(doc(firestoreDb, 'users', user.uid, 'jobs', id), cleanJobToFirestore(user.uid, updated))
            .catch(err => console.error("Cloud job update error", err));
        }
        return updated;
      }
      return job;
    }));
  };

  const addShift = (shiftData: Omit<ScheduledShift, 'id'>) => {
    const newShift = { ...shiftData, id: Date.now().toString() };
    setShifts([...shifts, newShift]);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'shifts', newShift.id), cleanShiftToFirestore(user.uid, newShift))
        .catch(err => console.error("Cloud shift add error", err));
    }
  };

  const updateShift = (id: string, updates: Partial<ScheduledShift>) => {
    setShifts(current => current.map(shift => {
      if (shift.id === id) {
        const updated = { ...shift, ...updates };
        if (user) {
          setDoc(doc(firestoreDb, 'users', user.uid, 'shifts', id), cleanShiftToFirestore(user.uid, updated))
            .catch(err => console.error("Cloud shift update error", err));
        }
        return updated;
      }
      return shift;
    }));
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter(j => j.id !== id));
    if (user) {
      deleteDoc(doc(firestoreDb, 'users', user.uid, 'jobs', id))
        .catch(err => console.error("Cloud job delete error", err));
    }
  };

  const removeShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
    if (user) {
      deleteDoc(doc(firestoreDb, 'users', user.uid, 'shifts', id))
        .catch(err => console.error("Cloud shift delete error", err));
    }
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

  const getBalances = (targetDate?: Date) => {
    const refDate = targetDate || new Date();
    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth();
    
    // Annual leaves
    const usedAnnualLeaves = sessions
      .filter(s => (s.dayStatus === "annual_leave" || s.dayStatus === "half_day_leave") && new Date(s.startTime).getFullYear() === currentYear && !s.isArchived)
      .filter(s => {
        const d = new Date(s.startTime);
        const isRest = isRestDayForDate(d, settings);
        return !isRest;
      })
      .reduce((acc, s) => acc + (s.dayStatus === "half_day_leave" ? 0.5 : 1), 0);
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
      if (s.isRestDayWork || s.dayStatus === 'rest_day_work') {
        const compType = s.restDayCompensation || '1_day';
        if (compType === '1_day' || compType === '1_day_plus_overtime') compensationDaysAccrued += 1;
        else if (compType === '2_days') compensationDaysAccrued += 2;
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

    const sDate = new Date(newSession.startTime);
    const isActuallyHoliday = isRestDayForDate(sDate, settings);

    if (isActuallyHoliday && ['annual_leave', 'half_day_leave', 'casual_leave'].includes(type) && (!data || !data.force)) {
      if (window.confirm('🚨 تنبيه ذكي: هذا اليوم الذي تحاول تسجيله يُعتبر بالفعل عطلة رسمية أو يوم راحة في نظامك! هل تود تسجيله كـ "عطلة رسمية/يوم راحة" (لا يخصم من رصيدك) بدلاً من إجازة عادية؟')) {
        newSession.dayStatus = 'public_holiday';
        newSession.notes = 'عطلة رسمية / يوم راحة (معدل تلقائياً بتوجيه ذكي)';
      }
    }

    setSessions([...sessions, newSession]);
    if (user) {
      setDoc(doc(firestoreDb, 'users', user.uid, 'sessions', newSession.id), cleanSessionToFirestore(user.uid, newSession))
        .catch(err => console.error("Cloud special session add error", err));
    }
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
      toggleBreak, getBalances, calculateOvertimeAndFraction, logSpecialSession, deleteAllData,
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
