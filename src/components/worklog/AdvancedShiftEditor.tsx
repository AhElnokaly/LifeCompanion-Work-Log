import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Clock, Plus, Trash2, Edit2, Check, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from "../../contexts/LanguageContext";

export default function AdvancedShiftEditor() {
  const { t, lang } = useLanguage();
  const { shifts, addShift, updateShift, removeShift } = useWorkLog();

  const [expanded, setExpanded] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [shiftFrequency, setShiftFrequency] = useState('daily');
  const [shiftColor, setShiftColor] = useState('#10b981');

  const submitShift = () => {
    if (!shiftName || !shiftStart || !shiftEnd) {
      toast.error('أدخل كافة البيانات');
      return;
    }
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
    setExpanded(true);
  };

  if (!expanded) {
    return (
      <Button variant="outline" className="w-full mt-4 h-12 rounded-xl text-primary font-bold border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={() => setExpanded(true)}>
        <Settings className="w-4 h-4 mr-2" />
        {t('t_auto_395') || 'إعدادات الورادي (متقدم)'}
        <ChevronDown className="w-4 h-4 ml-auto" />
      </Button>
    );
  }

  return (
    <div className="w-full mt-4 rounded-[1.5rem] bg-secondary/10 border border-border/50 p-4 animate-in slide-in-from-top-2 duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          {editingShiftId ? <Edit2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-emerald-500" />}
          {editingShiftId ? t('t_auto_398') : (t('t_auto_395') || 'إعدادات الورادي المتقدمة')}
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)} className="h-8 w-8 rounded-full p-0">
          <ChevronUp className="w-4 h-4" />
        </Button>
      </div>

      {shifts.length > 0 && !editingShiftId && (
        <div className="flex flex-col gap-2 mb-4 max-h-[150px] overflow-y-auto">
          {shifts.map(shift => (
            <div key={shift.id} className="flex justify-between items-center p-2 bg-background rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color || '#10b981' }}></div>
                <div>
                  <p className="font-bold text-sm">{shift.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{shift.startTime} - {shift.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:bg-indigo-500/10" onClick={() => handleEditShift(shift)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeShift(shift.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 p-4 bg-background rounded-2xl border border-white/5 shadow-sm">
        <div className="space-y-1.5 w-full">
          <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_400')}</Label>
          <Input className="h-10 rounded-xl bg-secondary/30" placeholder={t('t_auto_401')} value={shiftName} onChange={(e) => setShiftName(e.target.value)} />
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_403')}</Label>
            <SmartTimePicker className="h-10 rounded-xl bg-secondary/30 w-full" value={shiftStart} onChange={setShiftStart} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_404')}</Label>
            <SmartTimePicker className="h-10 rounded-xl bg-secondary/30 w-full" value={shiftEnd} onChange={setShiftEnd} />
          </div>
        </div>

        <div className="space-y-1.5 w-full">
           <Label className="text-xs text-muted-foreground font-bold">{t('t_auto_402')}</Label>
           <div className="flex gap-2 flex-wrap pb-1 justify-between sm:justify-start">
             {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'].map(color => (
               <button 
                 key={color}
                 onClick={() => setShiftColor(color)}
                 className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-transform ${shiftColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'hover:scale-105'}`}
                 style={{ backgroundColor: color }}
               />
             ))}
           </div>
        </div>

        <Button className="w-full mt-2 h-10 rounded-xl font-bold shadow-md" onClick={submitShift}>
           {editingShiftId ? <><Check className="w-4 h-4 mr-2" /> {t('t_auto_409')}</> : <><Plus className="w-4 h-4 mr-2" /> {t('t_auto_410') || 'إضافة وردية'}</>}
        </Button>
        {editingShiftId && (
           <Button variant="ghost" className="w-full h-10 rounded-xl mt-1 text-muted-foreground" onClick={() => {
              setEditingShiftId(null);
              setShiftName(''); setShiftStart(''); setShiftEnd(''); setShiftColor('#10b981');
           }}>إلغاء التعديل</Button>
        )}
      </div>
    </div>
  );
}
