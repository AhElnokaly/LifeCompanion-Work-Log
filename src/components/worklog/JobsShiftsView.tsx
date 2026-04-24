import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Briefcase, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export default function JobsShiftsView() {
  const { jobs, shifts, addJob, addShift, removeJob, removeShift } = useWorkLog();

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
    addJob({
      name: jobName,
      type: jobType as any,
      color: jobColor
    });
    setJobName('');
  };

  const submitShift = () => {
    if (!shiftName || !shiftStart || !shiftEnd) return;
    addShift({
      name: shiftName,
      startTime: shiftStart,
      endTime: shiftEnd,
      frequency: shiftFrequency as any,
      color: shiftColor
    });
    setShiftName('');
    setShiftStart('');
    setShiftEnd('');
    setShiftFrequency('daily');
    setShiftColor('#10b981');
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 pb-20" dir="rtl">
      {/* Shifts Section */}
      <Card className="p-5 rounded-3xl bg-card border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-lg">إدارة الورديات (Shifts)</h3>
        </div>
        <p className="text-sm text-muted-foreground">بعد إضافة الورديات هنا، ستظهر لك تلقائياً في الشاشة الرئيسية (شاشة الحضور) عندما يقترب موعدها، أو من القائمة الجانبية.</p>

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
                  <div className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md">مُسجلة</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeShift(shift.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 bg-secondary/10 p-4 rounded-2xl">
          <h4 className="text-sm font-bold text-muted-foreground">إضافة وردية جديدة</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مسمى الوردية</Label>
              <Input placeholder="مثال: نهارية" value={shiftName} onChange={(e) => setShiftName(e.target.value)} />
            </div>
            <div className="space-y-2">
               <Label>اللون المميز</Label>
               <Input type="color" value={shiftColor} onChange={(e) => setShiftColor(e.target.value)} className="p-1 h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>وقت البدء</Label>
              <Input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>وقت الانتهاء</Label>
              <Input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
             <Label>التكرار</Label>
             <Select value={shiftFrequency} onValueChange={setShiftFrequency}>
               <SelectTrigger className="min-w-0 w-full" dir="rtl">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent dir="rtl" className="min-w-[150px]">
                 <SelectItem value="daily">يومياً</SelectItem>
                 <SelectItem value="weekly">أسبوعياً (أيام العمل)</SelectItem>
                 <SelectItem value="custom">حسب الطلب</SelectItem>
               </SelectContent>
             </Select>
          </div>
          <Button className="w-full mt-2" onClick={submitShift}><Plus className="w-4 h-4 mr-2" /> إضافة الوردية</Button>
        </div>
      </Card>

      {/* Jobs Section */}
      <Card className="p-5 rounded-3xl bg-card border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
          <Briefcase className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-lg">الوظائف ومشاريع العمل المستقل</h3>
        </div>

        {jobs.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {jobs.map(job => (
              <div key={job.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: job.color}}></div>
                  <div>
                    <p className="font-bold">{job.name}</p>
                    <p className="text-xs text-muted-foreground">{job.type === 'freelance' ? 'عمل حر / مستقل' : 'دوام منتظم'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-md">جاهز</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeJob(job.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 bg-secondary/10 p-4 rounded-2xl">
          <h4 className="text-sm font-bold text-muted-foreground">إضافة وظيفة/عمل جديد</h4>
          <div className="space-y-2">
            <Label>مسمى الوظيفة/الجهة</Label>
            <Input placeholder="مثال: شركة س، أو عميل ص" value={jobName} onChange={(e) => setJobName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label>نوع العمل</Label>
               <Select value={jobType} onValueChange={setJobType}>
                 <SelectTrigger className="min-w-0" dir="rtl">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent dir="rtl" className="min-w-[150px]">
                   <SelectItem value="salary">راتب ثابت</SelectItem>
                   <SelectItem value="freelance">عمل حر (مستقل)</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label>اللون التعريفي</Label>
               <div className="flex gap-2">
                 <Input type="color" className="w-12 h-10 p-1" value={jobColor} onChange={(e) => setJobColor(e.target.value)} />
                 <Input className="flex-1" value={jobColor} readOnly />
               </div>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={submitJob}><Plus className="w-4 h-4 mr-2" /> إضافة العمل</Button>
        </div>
      </Card>

    </div>
  );
}
