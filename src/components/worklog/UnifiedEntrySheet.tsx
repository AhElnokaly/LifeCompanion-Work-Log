import React, { useState, useEffect } from 'react';
import { format, addDays, differenceInMinutes, isSameDay } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Clock, Calendar as CalendarIcon, Briefcase, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkLog, isPublicHoliday, isRestDayForDate } from '../../contexts/WorkLogContext';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { detectPermissionType } from '../../lib/smartAttendance';
import { toast } from 'sonner';
import { ar, enUS } from 'date-fns/locale';

import { WorkSession } from '../../types';

interface UnifiedEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  allowDateChange?: boolean;
  sessionToEdit?: WorkSession | null;
}

export function UnifiedEntrySheet({ open, onOpenChange, initialDate, allowDateChange = false, sessionToEdit }: UnifiedEntrySheetProps) {
  const { t, lang } = useLanguage();
  const { sessions, jobs, shifts, shiftAssignments, settings, addSession, deleteSession, updateSession, getBalances, calculateOvertimeAndFraction } = useWorkLog();

  const [selectedDateStr, setSelectedDateStr] = useState(format(sessionToEdit ? new Date(sessionToEdit.startTime) : (initialDate || new Date()), 'yyyy-MM-dd'));
  const [selectedDay, setSelectedDay] = useState(sessionToEdit ? new Date(sessionToEdit.startTime) : (initialDate || new Date()));

  useEffect(() => {
    if (open) {
      if (sessionToEdit) {
        const d = new Date(sessionToEdit.startTime);
        setSelectedDateStr(format(d, 'yyyy-MM-dd'));
        setSelectedDay(d);
      } else if (initialDate) {
        setSelectedDateStr(format(initialDate, 'yyyy-MM-dd'));
        setSelectedDay(initialDate);
      } else {
        setSelectedDateStr(format(new Date(), 'yyyy-MM-dd'));
        setSelectedDay(new Date());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setSelectedDay(new Date(selectedDateStr));
  }, [selectedDateStr]);

  const [entryData, setEntryData] = useState({
    type: 'salary' as 'salary' | 'project' | 'annual_leave' | 'sick_leave' | 'casual_leave' | 'compensation' | 'permission' | 'permission_1h' | 'permission_2h' | 'half_day_leave',
    startTime: '09:00',
    endTime: '17:00',
    jobId: 'none',
    restDayCompensation: '1_day' as '1_day' | '2_days' | '1_day_plus_overtime',
    linkedCompensationSessionId: '',
    notes: '',
  });

  // Reset state on open
  useEffect(() => {
    if (open) {
      if (sessionToEdit) {
        let type = sessionToEdit.dayStatus || 'salary';
        if (sessionToEdit.type === 'project') type = 'project';
        if (sessionToEdit.dayStatus === 'work' || sessionToEdit.dayStatus === 'rest_day_work') type = sessionToEdit.type === 'project' ? 'project' : 'salary';
        
        setEntryData({
          type: type as any,
          startTime: format(new Date(sessionToEdit.startTime), 'HH:mm'),
          endTime: sessionToEdit.endTime ? format(new Date(sessionToEdit.endTime), 'HH:mm') : settings.expectedEndTime || '17:00',
          jobId: sessionToEdit.jobId || 'none',
          restDayCompensation: sessionToEdit.restDayCompensation || '1_day',
          linkedCompensationSessionId: sessionToEdit.linkedCompensationSessionId || '',
          notes: sessionToEdit.notes || '',
        });
      } else {
        setEntryData({
          type: 'salary',
          startTime: settings.expectedStartTime || '09:00',
          endTime: settings.expectedEndTime || '17:00',
          jobId: 'none',
          restDayCompensation: '1_day',
          linkedCompensationSessionId: '',
          notes: '',
        });
      }
    }
  }, [open, settings, sessionToEdit]);

  const isRestDay = isRestDayForDate(selectedDay, settings);

  const getAvailableCompensations = () => {
    return sessions.filter(s => (s.isRestDayWork || s.dayStatus === 'rest_day_work') && !s.isArchived).map(s => {
      let accrued = 0;
      const compType = s.restDayCompensation || '1_day';
      if (compType === '1_day' || compType === '1_day_plus_overtime') accrued = 1;
      else if (compType === '2_days') accrued = 2;

      const validityDays = settings.compensationValidityDays || 30;
      const daysSinceEarned = (selectedDay.getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24);
      const isExpired = daysSinceEarned > validityDays && !s.compensationException;

      const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
      return { ...s, availableDays: accrued - taken, isExpired, daysUntilExpiry: Math.floor(validityDays - daysSinceEarned) };
    }).filter(s => s.availableDays > 0);
  };

  const handleSave = () => {
    const startStr = `${selectedDateStr}T${entryData.startTime}`;
    let endStr = `${selectedDateStr}T${entryData.endTime}`;
    if (entryData.endTime < entryData.startTime) {
       endStr = `${format(addDays(selectedDay, 1), 'yyyy-MM-dd')}T${entryData.endTime}`;
    }

    const isLeave = ['annual_leave', 'sick_leave', 'casual_leave', 'half_day_leave', 'permission', 'permission_1h', 'permission_2h', 'compensation'].includes(entryData.type);
    
    if (isLeave) {
       let duration = settings.dailyHours * 60;
       let hasTime = false;
       let finalType = entryData.type;
       let additionalNotes = entryData.notes;

       if (entryData.type.startsWith('permission_')) {
           const hours = entryData.type === 'permission_2h' ? 2 : 1;
           const pType = detectPermissionType(selectedDay, settings, shifts, shiftAssignments);
           duration = hours * 60;
           finalType = 'permission';
           const prefix = `إذن ذكي ${pType === 'entry' ? t('cal.late_entry') : t('cal.early_exit')} (${hours} ساعة/ساعات)`;
           additionalNotes = additionalNotes ? `${prefix} - ${additionalNotes}` : prefix;
           hasTime = false;
       } else if (entryData.type === 'half_day_leave' || entryData.type === 'permission') {
           duration = differenceInMinutes(new Date(endStr), new Date(startStr));
           hasTime = true;
       }

       const sessionPayload = {
         type: 'salary' as any,
         startTime: new Date(startStr).toISOString(),
         ...(hasTime && { endTime: new Date(endStr).toISOString() }),
         dayStatus: finalType as any,
         breaks: 0,
         duration: duration,
         location: 'office' as any,
         notes: additionalNotes,
         linkedCompensationSessionId: finalType === 'compensation' && entryData.linkedCompensationSessionId ? entryData.linkedCompensationSessionId : undefined,
       };

       if (sessionToEdit) {
         updateSession(sessionToEdit.id, sessionPayload);
       } else {
         addSession({ ...sessionPayload, id: Date.now().toString() });
       }
    } else {
       const duration = differenceInMinutes(new Date(endStr), new Date(startStr));
       
       let compType = isRestDay ? entryData.restDayCompensation : undefined;
       const calcResult = calculateOvertimeAndFraction(duration, isRestDay || false, compType);

       const sessionPayload = {
         type: entryData.type === 'project' && entryData.jobId !== 'none' ? 'project' as any : 'salary' as any,
         startTime: new Date(startStr).toISOString(),
         endTime: new Date(endStr).toISOString(),
         jobId: entryData.type === 'project' && entryData.jobId !== 'none' ? entryData.jobId : undefined,
         dayStatus: isRestDay ? 'rest_day_work' as any : 'work' as any,
         isRestDayWork: isRestDay,
         restDayCompensation: compType as any,
         breaks: 0,
         duration: duration,
         overtimeMinutes: calcResult.overtimeMinutes,
         fractionMinutes: calcResult.fractionMinutes,
         location: 'office' as any,
         notes: isRestDay ? (entryData.notes ? `${t('t_auto_198')} - ${entryData.notes}` : t('t_auto_198')) : entryData.notes
       };

       if (sessionToEdit) {
         updateSession(sessionToEdit.id, sessionPayload);
       } else {
         addSession({ ...sessionPayload, id: Date.now().toString() });
       }
    }
    onOpenChange(false);
    toast.success(t('cal.logged_successfully') || 'تم التسجيل بنجاح');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[95vh] overflow-y-auto z-[100] p-4 pb-20 max-w-md mx-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-black text-right mb-1">
             {t('cal.edit_log') || 'تسجيل المواعيد'}
          </SheetTitle>
          <div className="text-xs text-muted-foreground font-bold text-right flex gap-1 items-center justify-end">
             <span>{new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDay)}</span>
             <span className="w-1 h-1 rounded-full bg-border inline-block" />
             <span>{format(selectedDay, t('t_auto_222') || 'EEEE, dd MMMM', { locale: lang === 'ar' ? ar : enUS })}</span>
             <CalendarIcon className="w-3 h-3 text-primary ml-1" />
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-6">
          {allowDateChange && (
            <div className="space-y-2">
               <Label className="text-muted-foreground font-bold">{t('home.date') || 'التاريخ'}</Label>
               <Input 
                 type="date" 
                 value={selectedDateStr} 
                 onChange={e => setSelectedDateStr(e.target.value)} 
                 max={format(new Date(), 'yyyy-MM-dd')}
                 className="h-14 font-bold rounded-2xl bg-secondary/30"
               />
            </div>
          )}

          {/* Type Selection Tabs */}
          <div className="bg-secondary/40 p-1 rounded-2xl flex relative overflow-hidden shrink-0">
             <button 
               onClick={() => setEntryData(d => ({...d, type: 'salary'}))}
               className={`flex-1 py-3 px-1 text-sm font-bold transition-all rounded-xl z-10 ${entryData.type === 'salary' || entryData.type === 'project' ? 'bg-emerald-700 text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
             >
               {t('cal.work_day')}
             </button>
             <button 
               onClick={() => setEntryData(d => ({...d, type: 'annual_leave'}))}
               className={`flex-1 py-3 px-1 text-sm font-bold transition-all rounded-xl z-10 ${['annual_leave', 'sick_leave', 'casual_leave', 'compensation'].includes(entryData.type) ? 'bg-amber-600 text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
             >
               {t('cal.on_leave') || 'إجازة'}
             </button>
             <button 
               onClick={() => setEntryData(d => ({...d, type: 'permission_1h'}))}
               className={`flex-1 py-3 px-1 text-sm font-bold transition-all rounded-xl z-10 ${['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(entryData.type) ? 'bg-purple-600 text-white shadow-md' : 'text-foreground/70 hover:text-foreground'}`}
             >
               <Clock className="inline w-4 h-4 mr-1" />
               {t('t_auto_207') || 'إذن / مغادرة'}
             </button>
          </div>

          {/* Sub-type Selection */}
          {(entryData.type === 'salary' || entryData.type === 'project') && jobs.length > 0 && (
             <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
               <Label className="text-muted-foreground font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {t('t_auto_246') || 'نوع العمل'}
               </Label>
               <select 
                 className="w-full h-12 rounded-xl border border-border bg-background px-3 font-bold text-sm"
                 value={entryData.type === 'project' ? entryData.jobId : 'none'}
                 onChange={e => {
                   if (e.target.value === 'none') {
                     setEntryData(d => ({...d, type: 'salary', jobId: 'none'}));
                   } else {
                     setEntryData(d => ({...d, type: 'project', jobId: e.target.value}));
                   }
                 }}
               >
                 <option value="none">{t('t_auto_340') || 'عمل أساسي (راتب)'}</option>
                 {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
               </select>
             </div>
          )}

          {['annual_leave', 'sick_leave', 'casual_leave', 'compensation'].includes(entryData.type) && (
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-muted-foreground font-bold">{t('cal.leave_type') || 'نوع الإجازة'}</Label>
                 <div className="flex flex-col sm:flex-row gap-2">
                   <div className="flex gap-2 flex-1">
                     <Button 
                       variant={entryData.type === 'annual_leave' ? 'default' : 'secondary'}
                       className={`h-12 flex-1 font-bold rounded-xl ${entryData.type === 'annual_leave' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                       onClick={() => setEntryData(d => ({...d, type: 'annual_leave'}))}
                     >
                       {t('cal.annual') || 'اعتيادي'}
                     </Button>
                     <Button 
                       variant={entryData.type === 'sick_leave' ? 'default' : 'secondary'}
                       className={`h-12 flex-1 font-bold rounded-xl ${entryData.type === 'sick_leave' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                       onClick={() => setEntryData(d => ({...d, type: 'sick_leave'}))}
                     >
                       {t('t_auto_208') || 'مرضي'}
                     </Button>
                   </div>
                   <div className="flex gap-2 flex-1">
                     <Button 
                       variant={entryData.type === 'casual_leave' ? 'default' : 'secondary'}
                       className={`h-12 flex-1 font-bold rounded-xl ${entryData.type === 'casual_leave' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                       onClick={() => setEntryData(d => ({...d, type: 'casual_leave'}))}
                     >
                       {t('cal.unpaid') || 'عارضة'}
                     </Button>
                     <Button 
                       variant={entryData.type === 'compensation' ? 'default' : 'secondary'}
                       className={`h-12 flex-1 font-bold rounded-xl ${entryData.type === 'compensation' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                       onClick={() => setEntryData(d => ({...d, type: 'compensation'}))}
                     >
                       {t('cal.alternative_leave') || 'بدل'}
                     </Button>
                   </div>
                 </div>
               </div>
               
               {entryData.type === 'compensation' && (
                  <div className="space-y-2">
                     <Label className="text-muted-foreground font-bold text-emerald-600 dark:text-emerald-500">{t('home.day') || 'اختر البدل من الأيام السابقة'}</Label>
                     <select 
                       className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-600 font-bold"
                       value={entryData.linkedCompensationSessionId}
                       onChange={e => setEntryData(d => ({...d, linkedCompensationSessionId: e.target.value}))}
                     >
                       <option value="">-- {t('home.day') || 'يوم'} --</option>
                       {getAvailableCompensations().map(comp => (
                         <option key={comp.id} value={comp.id} disabled={comp.isExpired}>
                           {format(new Date(comp.startTime), t('t_auto_300') || 'EEEE, dd MMM', {locale: lang === 'ar' ? ar : enUS})} 
                           {' | '} {comp.availableDays} {t('rep.day')} {comp.isExpired ? ' - ' + t('home.expired') : ''}
                         </option>
                       ))}
                     </select>
                  </div>
               )}
             </div>
          )}

          {['half_day_leave', 'permission', 'permission_1h', 'permission_2h'].includes(entryData.type) && (
             (() => {
                let currentPermissionOffset = 0;
                if (sessionToEdit && sessionToEdit.dayStatus === 'permission') {
                  const editMonth = new Date(sessionToEdit.startTime).getMonth();
                  const editYear = new Date(sessionToEdit.startTime).getFullYear();
                  const selMonth = selectedDay.getMonth();
                  const selYear = selectedDay.getFullYear();
                  if (editMonth === selMonth && editYear === selYear) {
                    currentPermissionOffset = sessionToEdit.permissionHours || ((sessionToEdit.duration || 0) / 60);
                  }
                }
                const balances = getBalances(selectedDay);
                const curPermissionsRemaining = balances.remainingPermissionsHours + currentPermissionOffset;
                const isOneHourOffline = curPermissionsRemaining < 1;
                const isTwoHoursOffline = curPermissionsRemaining < 2;
                return (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-bold">{t('cal.permission_type') || 'نوع الإذن'}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={entryData.type === 'permission_1h' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${entryData.type === 'permission_1h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${isOneHourOffline ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                        disabled={isOneHourOffline}
                        onClick={() => setEntryData(d => ({...d, type: 'permission_1h'}))}
                      >
                        {isOneHourOffline ? (lang === 'ar' ? 'إذن 1 س (Offline)' : 'Perm 1h (Offline)') : (t('t_auto_209') || 'إذن (1 ساعة)')}
                      </Button>
                      <Button 
                        variant={entryData.type === 'permission_2h' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${entryData.type === 'permission_2h' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${isTwoHoursOffline ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                        disabled={isTwoHoursOffline}
                        onClick={() => setEntryData(d => ({...d, type: 'permission_2h'}))}
                      >
                        {isTwoHoursOffline ? (lang === 'ar' ? 'إذن 2 س (Offline)' : 'Perm 2h (Offline)') : (t('t_auto_210') || 'إذن (2 ساعة)')}
                      </Button>
                      <Button 
                        variant={entryData.type === 'half_day_leave' ? 'default' : 'secondary'}
                        className={`rounded-xl h-10 flex-1 font-bold ${entryData.type === 'half_day_leave' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                        onClick={() => setEntryData(d => ({...d, type: 'half_day_leave'}))}
                      >
                        {t('t_auto_229') || 'نصف يوم'}
                      </Button>
                    </div>
                  </div>
                );
             })()
          )}


          {/* Time Picker and Notes Section */}
          {(!['annual_leave', 'sick_leave', 'casual_leave', 'permission_1h', 'permission_2h', 'compensation'].includes(entryData.type)) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>{t('cal.login') || 'حضور'}</Label>
                  <SmartTimePicker 
                    value={entryData.startTime} 
                    onChange={val => setEntryData(d => ({...d, startTime: val}))}
                    className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold flex items-center gap-1"><Clock className="w-4 h-4"/>{t('cal.logout') || 'انصراف'}</Label>
                  <SmartTimePicker 
                    value={entryData.endTime} 
                    onChange={val => setEntryData(d => ({...d, endTime: val}))}
                    className="h-14 rounded-2xl bg-secondary/30 border-none font-bold text-lg w-full"
                  />
                </div>
              </div>

               {isRestDay && (
                    <div className="space-y-2 bg-orange-500/10 p-3 rounded-2xl border border-orange-500/20">
                       <Label className="text-orange-600 font-bold">{t('t_auto_352') || 'طبيعة التعويض'}</Label>
                       <select 
                         className="w-full h-12 rounded-xl border-none bg-background px-3 font-bold text-sm"
                         value={entryData.restDayCompensation}
                         onChange={e => setEntryData(d => ({...d, restDayCompensation: e.target.value as any}))}
                       >
                         <option value="1_day">{t('t_auto_353') || 'بدل راحة'}</option>
                         <option value="1_day_plus_overtime">{t('t_auto_354') || 'إضافي + يوم بديل'}</option>
                         <option value="2_days">{t('t_auto_355') || 'احتساب بـيومين'}</option>
                       </select>
                    </div>
               )}
            </>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground font-bold">{t('home.notes_optional') || 'ملاحظات (اختياري)'}</Label>
            <Input 
              value={entryData.notes}
              onChange={e => setEntryData(d => ({...d, notes: e.target.value}))}
              placeholder={t('t_auto_356') || 'اكتب أي ملاحظة عن هذا اليوم'}
              className="h-12 rounded-xl bg-secondary/30 border-none px-4"
            />
          </div>

          <Button 
             className="w-full h-14 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-lg mt-2 shadow-sm"
             disabled={entryData.type === 'compensation' && (!entryData.linkedCompensationSessionId || getAvailableCompensations().length === 0)}
             onClick={handleSave}
           >
              {t('cal.log') || 'تسجيل'}
           </Button>

           {/* Separator / existing sessions */}
           {(() => {
              const daySessions = sessions
                .filter(s => isSameDay(new Date(s.startTime), selectedDay))
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
              if (daySessions.length === 0) return null;
              
              const totalMinutes = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
              const totalHours = Math.floor(totalMinutes / 60);
              const totalOvertime = daySessions.reduce((acc, s) => acc + (s.overtimeMinutes || 0), 0);
              const overtimeHours = Math.floor(totalOvertime / 60);

              return (
                 <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold text-muted-foreground">
                       <span>{t('cal.records_today') || 'سجلات اليوم'}</span>
                       <div className="flex gap-4">
                         <span>{t('t_auto_213') || 'العمل:'} <span className="text-emerald-500">{totalHours} {t('t_auto_9') || 'س'}</span></span>
                         <span>{t('t_auto_214') || 'إضافي:'} <span className="text-orange-500">{overtimeHours} {t('t_auto_9') || 'س'}</span></span>
                       </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                       {daySessions.map(sess => {
                          let typeLabel = t('cal.work_day') || 'يوم عمل';
                          if (sess.dayStatus === 'annual_leave') typeLabel = t('cal.annual') || 'رصيد اعتيادي';
                          if (sess.dayStatus === 'sick_leave') typeLabel = t('cal.sick') || 'مرضي';
                          if (sess.dayStatus === 'casual_leave') typeLabel = t('cal.casual') || 'عارضة';
                          if (sess.dayStatus === 'compensation') typeLabel = t('cal.alternative_leave') || 'مأخوذ كبدل';
                          if (sess.dayStatus === 'half_day_leave') typeLabel = t('cal.half_day') || 'نصف يوم';
                          if (sess.dayStatus === 'permission') typeLabel = t('cal.permission') || 'إذن شخصي';
                          if (sess.type === 'project') typeLabel = t('t_auto_215') || 'مهمة عمل';

                          return (
                             <div key={sess.id} className="flex justify-between items-center bg-card border border-border/50 p-3 rounded-xl shadow-sm">
                                <div>
                                   <span className="font-bold text-sm block">{typeLabel}</span>
                                   {sess.endTime ? (
                                     <span className="text-xs text-muted-foreground font-mono">{format(new Date(sess.startTime), 'HH:mm')} - {format(new Date(sess.endTime), 'HH:mm')}</span>
                                   ) : (
                                     <span className="text-xs text-muted-foreground">{t('cal.all_day') || 'طوال اليوم'}</span>
                                   )}
                                </div>
                                <div className="flex gap-2">
                                   <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 h-8 w-8" onClick={() => deleteSession(sess.id, true)}>
                                      <Trash2 className="w-4 h-4" />
                                   </Button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              );
           })()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
