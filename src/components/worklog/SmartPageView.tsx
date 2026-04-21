import React from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import FreelanceCRMView from './FreelanceCRMView';
import ShiftRosterView from './ShiftRosterView';
import AppraisalView from './AppraisalView';

export default function SmartPageView() {
  const { settings } = useWorkLog();
  
  if (settings.system === 'freelance') {
    return <FreelanceCRMView />;
  }
  
  if (settings.system === 'shifts') {
    return <ShiftRosterView />;
  }
  
  return <AppraisalView />;
}
