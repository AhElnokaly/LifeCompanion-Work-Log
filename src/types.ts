export type WorkSystemType = 'fixed' | 'shifts' | 'freelance';
export type WorkType = 'salary' | 'freelance' | 'shift' | 'hybrid' | 'multi' | 'mission' | 'part_time' | 'project';

export interface WorkSettings {
  system: WorkSystemType;
  dailyHours: number;
  weeklyHoursTarget?: number;
  monthlyHoursTarget?: number;
  monthlyPermissions: number; 
  annualLeaves: number; 
  restDays: number[];
  expectedStartTime?: string;
  expectedEndTime?: string;
  notificationsEnabled?: boolean;
  monthlyFinancialTarget?: number;
  customAIApiKey?: string;
  customHolidays?: { date: string; name: string }[]; // YYYY-MM-DD
  notificationPreferences?: {
    endOfDay: boolean;
    pomodoro: boolean;
    overtimeWarning: boolean;
    pomodoroMinutes?: number;
    overtimeWarningMinutes?: number;
    endOfDayReminderTime?: string;
  };
  autoCheckIn?: boolean;
  onboardingCompleted?: boolean;
  usageComplexity?: 'basic' | 'advanced';
  modules?: {
    analytics: boolean;
    aiSuggestions: boolean;
    shifts: boolean;
    healthMood: boolean;
    finances: boolean;
  };
  
  // Advanced Overtime & Lateness Settings
  advancedRules?: {
    gracePeriodMinutes: number;         // e.g. 15 minutes
    latenessAction: 'ask' | 'count_full' | 'use_permission' | 'ignore_and_overtime'; 
    overtimeRoundingStrategy: 'exact' | 'round_down_hour' | 'round_down_half' | 'dynamic_ask'; // Dynamic Ask if e.g. 55m -> ask to count as 1h
    overtimeMinThresholdMinutes: number; // e.g. 35m -> won't count unless it passes this threshold. (If user works 35m overtime, counts as 0, else rounds down etc)
    maxOvertimeHours: number;             // Maximum allowed overtime hours
    overtimeCalculationType: 'fixed_rate' | 'multiplier_formula'; // whether it's a fixed amount per hour or multiplier
  };
  savedCharts?: any[];
}

export interface WorkSession {
  id: string;
  jobId?: string; // Links to Job
  projectId?: string;
  startTime: Date | string; // Use string for DB storage
  endTime?: Date | string;
  duration?: number;
  breaks: number;
  activeBreakStartTime?: string;
  location: 'office' | 'home' | 'client' | 'mission' | 'out_of_office';
  notes: string;
  type: WorkType;
  hourlyRate?: number;
  // Enhanced Tracking
  dayStatus: 'work' | 'annual_leave' | 'sick_leave' | 'casual_leave' | 'half_day' | 'late' | 'absent' | 'mission' | 'rest_day_work' | 'permission' | 'compensation';
  isRestDayWork?: boolean;
  restDayCompensation?: '1_day' | '2_days' | '1_day_plus_overtime';
  overtimeMinutes?: number;
  permissionHours?: number; 
  linkedCompensationSessionId?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface Job {
  id: string;
  name: string;
  color: string;
  type: WorkType;
  hourlyRate?: number;
  monthlyTargetHours?: number;
  isDefault?: boolean;
}

export interface ScheduledShift {
  id: string;
  jobId?: string;
  name: string; 
  startTime: string; 
  endTime: string;
  color?: string;
  frequency?: 'daily' | 'weekly' | 'custom';
}

export interface MoodLog {
  id: string;
  sessionId: string;
  date: string;
  startMood?: number; // 1 to 5 emoji rating
  endMood?: number; 
  selfSatisfaction?: number; // 1 to 10
  clientSatisfaction?: number; // 1 to 10
  stressLevel?: number;
  notes?: string;
}

export interface AlarmConfig {
  id: string;
  jobId?: string;
  timing: 'before' | 'after';
  anchor: 'start' | 'end' | 'overtime';
  minutes: number;
  ringtone: string;
  enabled: boolean;
}

export interface PaymentLog {
  id: string;
  jobId: string;
  amount: number;
  expectedDate: string; // ISO string
  actualDate?: string; // ISO string 
  status: 'pending' | 'paid' | 'late';
  notes?: string;
}

export type ThemeMode = 'light' | 'dark';
export type SmartMode = 'focus';

export interface AppState {
  theme: ThemeMode;
  smartMode: SmartMode | null;
}

