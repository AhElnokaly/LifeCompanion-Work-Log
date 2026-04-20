import Dexie, { type EntityTable } from 'dexie';
import type { WorkSession, Job, ScheduledShift, MoodLog, AlarmConfig, PaymentLog } from '../types';

export class WorkLogDB extends Dexie {
  sessions!: EntityTable<WorkSession, 'id'>;
  jobs!: EntityTable<Job, 'id'>;
  shifts!: EntityTable<ScheduledShift, 'id'>;
  moods!: EntityTable<MoodLog, 'id'>;
  alarms!: EntityTable<AlarmConfig, 'id'>;
  payments!: EntityTable<PaymentLog, 'id'>;

  constructor() {
    super('WorkLogCompanionDatabase');
    
    // Define tables and indexes
    this.version(1).stores({
      sessions: 'id, jobId, startTime, dayStatus', // Primary key and indexed props
      jobs: 'id, type',
      shifts: 'id, jobId',
      moods: 'id, sessionId, date',
      alarms: 'id, jobId, timing, anchor',
      payments: 'id, jobId, status, expectedDate'
    });
  }
}

export const db = new WorkLogDB();
