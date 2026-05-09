import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Briefcase, Clock, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "@/contexts/LanguageContext";

export default function JobsShiftsView() {
    const { t, lang } = useLanguage();
  const { jobs, shifts, addJob, addShift, updateJob, updateShift, removeJob, removeShift } = useWorkLog();

  // Editing state
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  // Job Form
  const [jobName, setJobName] = useState('');
  const [jobType, setJobType] = useState('salary');
  const [jobColor, setJobColor] = useState('#2563eb');

  // Shift Form
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftFrequency, setShiftFrequency] = useState('daily');
  const [shiftColor, setShiftColor] = useState('#10b981'); // default emerald

  const submitJob = () => {
    if (!jobName) return;
    if (editingJobId) {
       updateJob(editingJobId, {
         name: jobName,
         type: jobType as any,
         color: jobColor
       });
       setEditingJobId(null);
       toast.success(t('t_auto_391'));
    } else {
       addJob({
         name: jobName,
         type: jobType as any,
         color: jobColor
       });
       toast.success(t('t_auto_392'));
    }
    setJobName('');
    setJobType('salary');
    setJobColor('#2563eb');
  };

  const submitShift = () => {
    if (!shiftName || !shiftStart || !shiftEnd) return;
    if (editingShiftId) {
       updateShift(editingShiftId, {
         name: shiftName,
         startTime: shiftStart,
         endTime: shiftEnd,
         frequency: shiftFrequency as any,
         color: shiftColor
       });
       setEditingShiftId(null);
       toast.success(t('t_auto_393'));
    } else {
       addShift({
         name: shiftName,
         startTime: shiftStart,
         endTime: shiftEnd,
         frequency: shiftFrequency as any,
         color: shiftColor
       });
       toast.success(t('t_auto_394'));
    }
    setShiftName('');
    setShiftStart('');
    setShiftEnd('');
    setShiftFrequency('daily');
    setShiftColor('#10b981');
  };

  const handleEditShift = (shift: any) => {
    setEditingShiftId(shift.id);
    setShiftName(shift.name);
    setShiftStart(shift.startTime);
    setShiftEnd(shift.endTime);
    setShiftFrequency(shift.frequency);
    setShiftColor(shift.color);
  };

  const handleEditJob = (job: any) => {
    setEditingJobId(job.id);
    setJobName(job.name);
    setJobType(job.type);
    setJobColor(job.color || '#2563eb');
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 pb-20" dir="rtl">
      {/* Shifts Section */}
      <Card className="p-5 rounded-3xl bg-card border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-lg">{t('t_auto_395')}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t('t_auto_396')}</p>

        {shifts.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {shifts.map(shift => (
              <div key={shift.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color || '#10b981' }}></div>
                  <div>
                    <p className="font-bold">{shift.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{shift.startTime} - {shift.endTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md">{t('t_auto_397')}</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-indigo-500/10" onClick={() => handleEditShift(shift)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeShift(shift.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 bg-secondary/10 p-5 rounded-3xl border border-white/5">
          <h4 className="text-sm font-bold flex items-center gap-2">
            {editingShiftId ? <Edit2 className="w-4 h-4 text-emerald-500" /> : <Plus className="w-4 h-4 text-emerald-500" />}
            {editingShiftId ? t('t_auto_398') : t('t_auto_399')}
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_400')}</Label>
              <Input className="h-12 rounded-xl bg-background/50 border-white/10" placeholder={t('t_auto_401')} value={shiftName} onChange={(e) => setShiftName(e.target.value)} />
            </div>
            
            <div className="space-y-1.5">
               <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_402')}</Label>
               <div className="flex gap-2 flex-wrap pb-1">
                 {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'].map(color => (
                   <button 
                     key={color}
                     onClick={() => setShiftColor(color)}
                     className={`w-8 h-8 rounded-full transition-transform ${shiftColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'hover:scale-105'}`}
                     style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_403')}</Label>
              <SmartTimePicker className="h-12 rounded-xl bg-background/50 border-white/10 w-full" value={shiftStart} onChange={setShiftStart} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_404')}</Label>
              <SmartTimePicker className="h-12 rounded-xl bg-background/50 border-white/10 w-full" value={shiftEnd} onChange={setShiftEnd} />
            </div>
          </div>

          <div className="space-y-1.5">
             <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_405')}</Label>
             <Select value={shiftFrequency} onValueChange={setShiftFrequency}>
               <SelectTrigger className="min-w-0 w-full h-12 rounded-xl bg-background/50 border-white/10" dir="rtl">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent dir="rtl" className="min-w-[150px] rounded-xl z-[150]">
                 <SelectItem value="daily">{t('t_auto_406')}</SelectItem>
                 <SelectItem value="weekly">{t('t_auto_407')}</SelectItem>
                 <SelectItem value="custom">{t('t_auto_408')}</SelectItem>
               </SelectContent>
             </Select>
          </div>
          <Button className="w-full mt-2 h-12 rounded-xl font-bold shadow-lg" onClick={submitShift}>
             {editingShiftId ? <><Check className="w-4 h-4 mr-2" /> {t('t_auto_409')}</> : <><Plus className="w-4 h-4 mr-2" /> {t('t_auto_410')}</>}
          </Button>
        </div>
      </Card>

      {/* Jobs Section */}
      <Card className="p-5 rounded-3xl bg-card border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
          <Briefcase className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-lg">{t('t_auto_411')}</h3>
        </div>

        {jobs.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {jobs.map(job => (
              <div key={job.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: job.color}}></div>
                  <div>
                    <p className="font-bold">{job.name}</p>
                    <p className="text-xs text-muted-foreground">{job.type === 'freelance' ? t('t_auto_412') : t('t_auto_413')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-md">{t('t_auto_414')}</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-indigo-500/10" onClick={() => handleEditJob(job)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeJob(job.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 bg-secondary/10 p-4 rounded-2xl">
          <h4 className="text-sm font-bold text-muted-foreground">{editingJobId ? t('t_auto_415') : t('t_auto_416')}</h4>
          <div className="space-y-2">
            <Label>{t('t_auto_417')}</Label>
            <Input placeholder={t('t_auto_418')} value={jobName} onChange={(e) => setJobName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label>{t('t_auto_419')}</Label>
               <Select value={jobType} onValueChange={setJobType}>
                 <SelectTrigger className="min-w-0" dir="rtl">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent dir="rtl" className="min-w-[150px]">
                   <SelectItem value="salary">{t('t_auto_420')}</SelectItem>
                   <SelectItem value="freelance">{t('t_auto_421')}</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label>{t('t_auto_422')}</Label>
               <div className="flex gap-2">
                 <Input type="color" className="w-12 h-10 p-1" value={jobColor} onChange={(e) => setJobColor(e.target.value)} />
                 <Input className="flex-1" value={jobColor} readOnly />
               </div>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={submitJob}>
             {editingJobId ? <><Edit2 className="w-4 h-4 mr-2" /> {t('t_auto_409')}</> : <><Plus className="w-4 h-4 mr-2" /> {t('t_auto_423')}</>}
          </Button>
        </div>
      </Card>

    </div>
  );
}
