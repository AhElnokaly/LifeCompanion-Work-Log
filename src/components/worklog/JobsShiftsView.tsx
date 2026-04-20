import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Briefcase, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export default function JobsShiftsView() {
  const { jobs, shifts, addJob, addShift } = useWorkLog();

  // Job Form
  const [jobName, setJobName] = useState('');
  const [jobType, setJobType] = useState('salary');
  const [jobColor, setJobColor] = useState('#2563eb');

  // Shift Form
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

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
      endTime: shiftEnd
    });
    setShiftName('');
    setShiftStart('');
    setShiftEnd('');
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-20 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">هندسة الورادي</h2>
            <p className="text-muted-foreground text-sm">الورديات المعقدة والوظائف المتعددة</p>
          </div>
        </div>
      </header>

      {/* Shifts Section */}
      <Card className="p-5 rounded-3xl bg-card border-white/5 space-y-4">
        <div className="flex items-center gap-2 mb-2 border-b border-border/40 pb-3">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-lg">جدولة الورديات (Shifts)</h3>
        </div>

        {shifts.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {shifts.map(shift => (
              <div key={shift.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-white/5">
                <div>
                  <p className="font-bold">{shift.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{shift.startTime} - {shift.endTime}</p>
                </div>
                {/* Delete/Edit placeholders. Could implement full array update in context later */}
                <div className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md">جاهز</div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 bg-secondary/10 p-4 rounded-2xl">
          <h4 className="text-sm font-bold text-muted-foreground">إضافة وردية جديدة</h4>
          <div className="space-y-2">
            <Label>مسمى الوردية</Label>
            <Input placeholder="مثال: الوردية الليلية، الوردية الأولى..." value={shiftName} onChange={(e) => setShiftName(e.target.value)} />
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
                <div className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-md">جاهز</div>
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
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent dir="rtl">
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
