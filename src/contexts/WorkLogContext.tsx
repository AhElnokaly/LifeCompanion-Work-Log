import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkSession, Project, WorkSettings, Job, ScheduledShift } from '../types';
import { db } from '../lib/db';
import { sendAppNotification } from '../lib/notifications';

interface WorkLogContextType {
  sessions: WorkSession[];
  archivedSessions: WorkSession[];
  projects: Project[];
  jobs: Job[];
  shifts: ScheduledShift[];
  activeSession: WorkSession | null;
  settings: WorkSettings;
  updateSettings: (settings: WorkSettings) => void;
  startSession: (type: WorkSession['type'], projectId?: string, overrideData?: Partial<WorkSession>) => void;
  endSession: (notes: string, manualData?: Partial<WorkSession>) => void;
  addSession: (session: WorkSession) => void;
  updateSession: (id: string, updates: Partial<WorkSession>) => void;
  deleteSession: (id: string, hardDelete?: boolean) => void;
  restoreSession: (id: string) => void;
  addProject: (project: Omit<Project, 'id' | 'totalHours'>) => void;
  addJob: (job: Omit<Job, 'id'>) => void;
  addShift: (shift: Omit<ScheduledShift, 'id'>) => void;
  toggleBreak: () => void;
  getBalances: () => {
    remainingAnnualLeaves: number;
    remainingPermissionsHours: number;
    availableCompensations: WorkSession[];
  };
  logSpecialSession: (type: 'annual_leave' | 'half_day_leave' | 'permission' | 'compensation', data?: any) => void;
  deleteAllData: () => Promise<void>;
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
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [settings, setSettings] = useState<WorkSettings>({ ...defaultSettings, onboardingCompleted: false });

  // Load from local storage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('worklog_sessions');
    const savedProjects = localStorage.getItem('worklog_projects');
    const savedJobs = localStorage.getItem('worklog_jobs');
    const savedShifts = localStorage.getItem('worklog_shifts');
    const savedActive = localStorage.getItem('worklog_active');
    const savedSettings = localStorage.getItem('worklog_settings');

    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedShifts) setShifts(JSON.parse(savedShifts));
    if (savedActive) setActiveSession(JSON.parse(savedActive));
    if (savedSettings) setSettings(JSON.parse(savedSettings));

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
    localStorage.setItem('worklog_active', JSON.stringify(activeSession));
    localStorage.setItem('worklog_settings', JSON.stringify(settings));
  }, [sessions, projects, jobs, shifts, activeSession, settings]);

  const updateSettings = (newSettings: WorkSettings) => {
    setSettings(newSettings);
  };

  const startSession = (type: WorkSession['type'], entityId?: string, overrideData?: Partial<WorkSession>) => {
    if (activeSession) return;
    
    const startTime = new Date();
    // Check if rest day
    const dayOfWeek = startTime.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const isRestDayWork = settings.restDays.includes(dayOfWeek);

    const newSession: WorkSession = {
      id: Date.now().toString(),
      type,
      jobId: type !== 'freelance' ? entityId : undefined,
      projectId: type === 'freelance' ? entityId : undefined,
      startTime: startTime.toISOString(),
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
  };

  const calculateOvertime = (durationMins: number, isRestDay: boolean, compType?: '1_day' | '2_days' | '1_day_plus_overtime') => {
    if (isRestDay) {
      if (compType === '1_day_plus_overtime') {
         // Work on rest day is 1 day leave + the actual hours worked count strictly as overtime.
         return durationMins;
      } else if (compType === '2_days') {
         // Paid with 2 alternative rest days, no overtime hours generated
         return 0;
      } else {
         // '1_day' - Paid with 1 alternative rest day. No direct overtime minutes generated (depending on HR policy, but usually 0 overtime minutes if replaced 1:1, or 1:1 overtime)
         // Defaulting it to count as full overtime (durationMins) for basic tracking, unless specific compensation is chosen.
         return compType === '1_day' ? 0 : durationMins; 
      }
    }
    const expectedMins = settings.dailyHours * 60;
    return durationMins > expectedMins ? durationMins - expectedMins : 0;
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
    const duration = session.duration || 0;
    const overtimeMinutes = session.overtimeMinutes !== undefined ? session.overtimeMinutes : calculateOvertime(duration, isRestDay, session.restDayCompensation);
    
    setSessions([...sessions, { ...session, overtimeMinutes }]);
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

  const addShift = (shiftData: Omit<ScheduledShift, 'id'>) => {
    setShifts([...shifts, { ...shiftData, id: Date.now().toString() }]);
  };

  const getBalances = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Annual leaves
    const usedAnnualLeaves = sessions
      .filter(s => s.isAnnualLeave && new Date(s.startTime).getFullYear() === currentYear)
      .reduce((acc, s) => acc + (s.duration === (settings.dailyHours * 60) / 2 ? 0.5 : 1), 0);
    const remainingAnnualLeaves = settings.annualLeaves - usedAnnualLeaves;

    // Permissions (hours)
    const usedPermissionsHours = sessions
      .filter(s => s.isPermission && new Date(s.startTime).getMonth() === currentMonth && new Date(s.startTime).getFullYear() === currentYear)
      .reduce((acc, s) => acc + (s.permissionHours || ((s.duration || 0) / 60)), 0);
    const remainingPermissionsHours = settings.monthlyPermissions - usedPermissionsHours;

    // Compensations (Find rest day work sessions that don't have a linked compensation leave)
    const availableCompensations = sessions.filter(s => 
      s.isRestDayWork && 
      !sessions.some(other => other.isCompensationLeave && other.linkedCompensationSessionId === s.id)
    );

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
      newSession.dayStatus = 'half_day';
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
      sessions: activeSessions, archivedSessions, projects, jobs, shifts, activeSession, settings, 
      updateSettings, startSession, endSession, addSession, updateSession, deleteSession, restoreSession, addProject, addJob, addShift,
      toggleBreak, getBalances, logSpecialSession, deleteAllData 
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
