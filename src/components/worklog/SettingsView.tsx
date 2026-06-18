import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Settings as SettingsIcon, Save, Calendar, Clock, Briefcase, FileText, Bell, MapPin, CheckCircle, Trash2, Plus, Database, Cpu, LogOut } from 'lucide-react';
import { sendAppNotification } from '../../lib/notifications';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsView() {
  const { settings, updateSettings, deleteAllData, jobs, addJob, removeJob, updateJob } = useWorkLog();
  const { lang, setLang, t } = useLanguage();
  const { logOut, user, isOfflineMode } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [restDayChangeDialog, setRestDayChangeDialog] = useState(false);
  const [restDayChangeDate, setRestDayChangeDate] = useState('');

  const handleSave = () => {
    const originalRestDays = [...settings.restDays].sort().join(',');
    const newRestDays = [...localSettings.restDays].sort().join(',');
    if (originalRestDays !== newRestDays) {
       setRestDayChangeDialog(true);
    } else {
       updateSettings(localSettings);
       toast.success(t('settings.auto.1'));
    }
  };

  const applyRestDayChange = (mode: 'always' | 'from_date') => {
     let newSettings = { ...localSettings };
     if (mode === 'from_date') {
        if (!restDayChangeDate) { toast.error('يرجى اختيار التاريخ'); return; }
        const currentSchedule = newSettings.restDaysSchedule || [];
        newSettings.restDaysSchedule = [
          ...currentSchedule,
          { fromDate: restDayChangeDate, restDays: localSettings.restDays, originalRestDays: settings.restDays }
        ];
     } else {
        // Always -> reset schedule
        newSettings.restDaysSchedule = [];
     }
     
     updateSettings(newSettings);
     toast.success(t('settings.auto.1'));
     setRestDayChangeDialog(false);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setLocalSettings({
          ...localSettings, 
          notificationsEnabled: true,
          notificationPreferences: {
            endOfDay: true,
            pomodoro: true,
            overtimeWarning: true
          }
        });
      }
    }
  };

  const toggleSubNotification = (key: keyof NonNullable<typeof localSettings.notificationPreferences>) => {
    setLocalSettings({
      ...localSettings,
      notificationPreferences: {
        ...localSettings.notificationPreferences!,
        [key]: !localSettings.notificationPreferences?.[key]
      }
    });
  };

  const requestLocationPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {
        setLocalSettings({...localSettings, autoCheckIn: true});
      }, (err) => {
        console.error(err);
      });
    }
  };

  const daysOfWeek = [
    { value: 0, label: t('settings.auto.2') },
    { value: 1, label: t('settings.auto.3') },
    { value: 2, label: t('settings.auto.4') },
    { value: 3, label: t('settings.auto.5') },
    { value: 4, label: t('settings.auto.6') },
    { value: 5, label: t('settings.auto.7') },
    { value: 6, label: t('settings.auto.8') },
  ];

  const toggleRestDay = (day: number) => {
    setLocalSettings(curr => {
      const isSelected = curr.restDays.includes(day);
      if (isSelected) {
        return { ...curr, restDays: curr.restDays.filter(d => d !== day) };
      } else {
        return { ...curr, restDays: [...curr.restDays, day] };
      }
    });
  };

  const addHoliday = () => {
    if (newHolidayDate && newHolidayName) {
      setLocalSettings(curr => ({
        ...curr,
        customHolidays: [...(curr.customHolidays || []), { date: newHolidayDate, name: newHolidayName }]
      }));
      setNewHolidayDate('');
      setNewHolidayName('');
    }
  };

  const removeHoliday = (index: number) => {
    setLocalSettings(curr => ({
      ...curr,
      customHolidays: (curr.customHolidays || []).filter((_, i) => i !== index)
    }));
  };

  const updateHoliday = (index: number, field: 'date' | 'name', value: string) => {
    setLocalSettings(curr => {
      const newHolidays = [...(curr.customHolidays || [])];
      newHolidays[index] = { ...newHolidays[index], [field]: value };
      return { ...curr, customHolidays: newHolidays };
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" >
      <header className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('settings.auto.9')}</h2>
          <p className="text-muted-foreground text-sm">{t('settings.auto.10')}</p>
        </div>
      </header>

      <Tabs defaultValue="general" className="w-full flex flex-col" dir="rtl">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="flex min-w-max w-full h-auto bg-secondary/30 p-1.5 rounded-2xl mb-2 gap-1 items-center">
            <TabsTrigger value="general" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Briefcase className="w-4 h-4 ml-2 inline-block"/>{t('settings.auto.11')}</TabsTrigger>
            
            {localSettings.system !== 'freelance' && (
              <TabsTrigger value="schedule" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Calendar className="w-4 h-4 ml-2 inline-block"/>{t('settings.auto.12')}</TabsTrigger>
            )}

            {localSettings.usageComplexity === 'advanced' && (
               <TabsTrigger value="advanced" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Bell className="w-4 h-4 ml-2 inline-block"/>{t('settings.auto.13')}</TabsTrigger>
            )}
            
            <TabsTrigger value="system" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Database className="w-4 h-4 ml-2 inline-block"/>{t('settings.auto.14')}</TabsTrigger>
          </TabsList>
        </div>

        <Card className="p-5 sm:p-6 bg-card border-white/5 rounded-3xl shadow-sm mt-2 relative min-h-[500px]">
          
          {/* TAB: GENERAL */}
          <TabsContent value="general" className="space-y-8 mt-0 animate-in fade-in zoom-in-95 duration-300">
            {/* Work System / Jobs Manager */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  {t('settings.auto.15')} 
                                                  </Label>
              </div>

              <div className="bg-secondary/10 p-4 rounded-2xl border border-white/5 space-y-3">
                 <Label className="text-xs text-muted-foreground font-medium mb-1 block">{t('settings.auto.16')}</Label>
                 <Select 
                   value={localSettings.system} 
                   onValueChange={(v: 'fixed' | 'shifts' | 'freelance') => setLocalSettings({...localSettings, system: v})}
                 >
                   <SelectTrigger className="h-10 rounded-xl bg-secondary/30 border-none w-full min-w-0" >
                     <SelectValue placeholder={t('settings.auto.17')} />
                   </SelectTrigger>
                   <SelectContent sideOffset={5} className="min-w-[150px]">
                     <SelectItem value="fixed">{t('settings.auto.18')}</SelectItem>
                     <SelectItem value="shifts">{t('settings.auto.19')}</SelectItem>
                     <SelectItem value="freelance">{t('settings.auto.20')}</SelectItem>
                   </SelectContent>
                 </Select>
                 <p className="text-[10px] text-muted-foreground mt-2">
                   {t('settings.auto.21')}
                                                   </p>
                 
                 <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                       <Label className="text-sm font-bold block">{t('settings.auto.22')}</Label>
                       <Button size="sm" variant="default" className="h-9 rounded-xl shadow-md gap-1" onClick={() => addJob({name: t('settings.auto.23'), type: 'freelance', color: '#6366f1', monthlyTargetHours: 40, hourlyRate: 0})}>
                         <Plus className="w-4 h-4" /> {t('settings.auto.24')}
                                                                 </Button>
                    </div>
                    
                    {jobs.length === 0 && (
                      <div className="text-center p-6 border-2 border-dashed border-white/10 rounded-2xl opacity-60">
                         <Briefcase className="w-8 h-8 opacity-50 mx-auto mb-2" />
                         <p className="text-xs">{t('settings.auto.25')}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {jobs.map(job => (
                        <div key={job.id} className="relative flex flex-col gap-4 p-4 bg-card/60 backdrop-blur-md rounded-[1.5rem] border border-white/5 shadow-sm group hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 w-full">
                               <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0" style={{backgroundColor: `${job.color}20`, border: `1px solid ${job.color}40`}}>
                                 <Briefcase className="w-5 h-5" style={{color: job.color}} />
                               </div>
                               <Input 
                                 value={job.name} 
                                 onChange={(e) => updateJob(job.id, {name: e.target.value})} 
                                 className="h-9 rounded-lg border-transparent hover:border-border bg-transparent hover:bg-secondary/30 focus:bg-secondary/30 font-bold text-base px-2 shadow-none" 
                                 placeholder={t('settings.auto.26')} 
                               />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 right-2 top-2 absolute opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeJob(job.id)}>
                               <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className="space-y-1">
                               <Label className="text-[10px] text-muted-foreground">{t('settings.auto.27')}</Label>
                               <Select value={job.type} onValueChange={(v: any) => updateJob(job.id, {type: v})}>
                                  <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                     <SelectItem value="fixed">{t('settings.auto.28')}</SelectItem>
                                     <SelectItem value="shifts">{t('settings.auto.29')}</SelectItem>
                                     <SelectItem value="freelance">{t('settings.auto.30')}</SelectItem>
                                     <SelectItem value="project">{t('settings.auto.31')}</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] text-muted-foreground">{t('settings.auto.32')}</Label>
                               <div className="flex items-center gap-2">
                                  <Input type="color" value={job.color || '#6366f1'} onChange={(e) => updateJob(job.id, {color: e.target.value})} className="h-9 w-full p-1 rounded-xl cursor-pointer" />
                               </div>
                            </div>
                            {settings.modules?.finances && (
                              <div className="space-y-1">
                                 <Label className="text-[10px] text-muted-foreground flex items-center gap-1">{t('settings.auto.33')} <span className="opacity-50">{t('settings.auto.34')}</span></Label>
                                 <Input type="number" min="0" value={job.hourlyRate || ''} onChange={(e) => updateJob(job.id, {hourlyRate: parseFloat(e.target.value) || 0})} className="h-9 rounded-xl text-xs" placeholder="0.00" />
                              </div>
                            )}
                            <div className="space-y-1">
                               <Label className="text-[10px] text-muted-foreground flex items-center gap-1">{t('settings.auto.35')} <span className="opacity-50">{t('settings.auto.36')}</span></Label>
                               <Input type="number" min="0" value={job.monthlyTargetHours || ''} onChange={(e) => updateJob(job.id, {monthlyTargetHours: parseInt(e.target.value) || 0})} className="h-9 rounded-xl text-xs" placeholder={t('settings.auto.37')} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <SettingsIcon className="w-4 h-4 text-emerald-500" />
                {t('settings.language')}
              </Label>
              <Select 
                value={lang} 
                onValueChange={(v: 'ar' | 'en') => setLang(v)}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" >
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent sideOffset={5} className="min-w-[200px]">
                  <SelectItem value="ar" className="py-3 items-start"><span className="text-right block w-full">{t('settings.lang.ar')}</span></SelectItem>
                  <SelectItem value="en" className="py-3 items-start"><span className="text-right block w-full">{t('settings.lang.en')}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usage Complexity */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <SettingsIcon className="w-4 h-4 text-emerald-500" />
                {t('settings.auto.38')}
                                            </Label>
              <Select 
                value={localSettings.usageComplexity || 'basic'} 
                onValueChange={(v: 'basic' | 'advanced') => setLocalSettings({...localSettings, usageComplexity: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" >
                  <SelectValue placeholder={t('settings.auto.39')} />
                </SelectTrigger>
                <SelectContent sideOffset={5} className="min-w-[200px]">
                  <SelectItem value="basic" className="py-3 items-start"><span className="text-right block w-full">{t('settings.auto.40')}</span></SelectItem>
                  <SelectItem value="advanced" className="py-3 items-start"><span className="text-right block w-full whitespace-normal leading-tight">{t('settings.auto.41')}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modules Management */}
            {localSettings.usageComplexity === 'advanced' && (
              <div className="bg-secondary/10 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 text-base font-bold text-primary">{t('settings.auto.42')}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{t('settings.auto.43')}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <SubToggle 
                      label={t('settings.auto.44')} 
                      desc={t('settings.auto.45')}
                      active={localSettings.modules?.aiSuggestions ?? true} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, aiSuggestions: !localSettings.modules?.aiSuggestions}})}
                    />
                    <SubToggle 
                      label={t('settings.auto.46')} 
                      desc={t('settings.auto.47')}
                      active={localSettings.modules?.analytics ?? true} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, analytics: !localSettings.modules?.analytics}})}
                    />
                    <SubToggle 
                      label={t('settings.auto.48')} 
                      desc={t('settings.auto.49')}
                      active={localSettings.modules?.shifts ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, shifts: !localSettings.modules?.shifts}})} 
                    />
                    <SubToggle 
                      label={t('settings.auto.50')} 
                      desc={t('settings.auto.51')}
                      active={localSettings.modules?.finances ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, finances: !localSettings.modules?.finances}})} 
                    />
                    <SubToggle 
                      label={t('settings.auto.52')} 
                      desc={t('settings.auto.53')}
                      active={localSettings.modules?.healthMood ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, healthMood: !localSettings.modules?.healthMood}})} 
                    />
                  </div>
              </div>
            )}

            {/* Target Hours */}
            <div className="bg-secondary/10 p-5 rounded-2xl border border-white/5 space-y-4">
               <div>
                  <Label className="flex items-center gap-2 text-base font-bold text-primary">{t('settings.auto.54')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.auto.55')}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                   <Label className="text-xs text-muted-foreground">{t('settings.auto.56')}</Label>
                   <Input 
                     type="number" 
                     placeholder={t('settings.auto.57')}
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.weeklyHoursTarget || ''}
                     onChange={(e) => setLocalSettings({...localSettings, weeklyHoursTarget: Number(e.target.value) || undefined})}
                   />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-xs text-muted-foreground">{t('settings.auto.58')}</Label>
                   <Input 
                     type="number" 
                     placeholder={t('settings.auto.59')}
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.monthlyHoursTarget || ''}
                     onChange={(e) => setLocalSettings({...localSettings, monthlyHoursTarget: Number(e.target.value) || undefined})}
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-2">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">{t('settings.auto.60')}</Label>
                   <Input 
                     type="number" 
                     placeholder={t('settings.auto.61')}
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.compensationValidityDays || ''}
                     onChange={(e) => setLocalSettings({...localSettings, compensationValidityDays: Number(e.target.value) || undefined})}
                   />
                 </div>
               </div>

               {localSettings.system === 'freelance' && (
                 <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
                   <Label className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-3 h-3 text-emerald-500" />{t('settings.auto.62')}</Label>
                   <Input 
                     type="number" 
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.dailyHours}
                     onChange={(e) => setLocalSettings({...localSettings, dailyHours: Number(e.target.value) || 0})}
                   />
                 </div>
               )}
            </div>

            <div className="flex justify-between items-center bg-secondary/20 p-5 rounded-2xl border border-white/5">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 mt-1" />
                <div>
                  <p className="font-bold">{t('settings.auto.63')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('settings.auto.64')}</p>
                </div>
              </div>
              <Button 
                className={`rounded-full shadow-lg transition-colors ${localSettings.autoCheckIn ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                onClick={localSettings.autoCheckIn ? () => setLocalSettings({...localSettings, autoCheckIn: false}) : requestLocationPermission}
              >
                {localSettings.autoCheckIn ? t('settings.auto.65') : t('settings.auto.66')}
              </Button>
            </div>
          </TabsContent>

          {/* TAB: SCHEDULE & LEAVES */}
          {localSettings.system !== 'freelance' && (
            <TabsContent value="schedule" className="space-y-8 mt-0 animate-in fade-in zoom-in-95 duration-300">
               {/* Daily Hours & Schedule */}
               <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base">
                      <Clock className="w-4 h-4 text-emerald-500" />
                      {t('settings.auto.67')}
                                                          </Label>
                    <Input 
                      type="number" 
                      className="h-12 rounded-2xl bg-secondary/30 border-none"
                      value={localSettings.dailyHours}
                      onChange={(e) => setLocalSettings({...localSettings, dailyHours: Number(e.target.value) || 0})}
                    />
                  </div>
                  {localSettings.system === 'fixed' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('settings.auto.68')}</Label>
                        <SmartTimePicker 
                          className="h-12 rounded-2xl bg-secondary/30 border-none w-full"
                          value={localSettings.expectedStartTime || '09:00'}
                          onChange={(val) => setLocalSettings({...localSettings, expectedStartTime: val})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{t('settings.auto.69')}</Label>
                        <SmartTimePicker
                          className="h-12 rounded-2xl bg-secondary/30 border-none w-full"
                          value={localSettings.expectedEndTime || '17:00'}
                          onChange={(val) => setLocalSettings({...localSettings, expectedEndTime: val})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Permissions & Leaves */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-white/5">
                    <Label className="flex items-center gap-2 text-sm font-bold">
                      <FileText className="w-4 h-4 text-yellow-500" />
                      {t('settings.auto.70')}
                                                          </Label>
                    <p className="text-[10px] text-muted-foreground">{t('settings.auto.71')}</p>
                    <Input 
                      type="number" 
                      className="h-12 rounded-xl bg-secondary/30 border-none"
                      value={localSettings.monthlyPermissions}
                      onChange={(e) => setLocalSettings({...localSettings, monthlyPermissions: Number(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-white/5">
                    <Label className="flex items-center gap-2 text-sm font-bold">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      {t('settings.auto.72')}
                                                          </Label>
                    <p className="text-[10px] text-muted-foreground">{t('settings.auto.73')}</p>
                    <Input 
                      type="number" 
                      className="h-12 rounded-xl bg-secondary/30 border-none"
                      value={localSettings.annualLeaves}
                      onChange={(e) => setLocalSettings({...localSettings, annualLeaves: Number(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {/* Rest Days */}
                <div className="space-y-6 pt-4 border-t border-border/20">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-bold">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {t('settings.auto.74')}
                                                          </Label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => {
                        const isSelected = localSettings.restDays.includes(day.value);
                        return (
                            <Button
                            key={day.value}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`rounded-xl ${isSelected ? 'bg-indigo-500 hover:bg-indigo-600 border-none text-white font-bold' : 'border-white/10 hover:bg-secondary/40 text-muted-foreground'}`}
                            onClick={() => toggleRestDay(day.value)}
                          >
                            {day.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Custom Public Holidays */}
                  <div className="space-y-4 pt-6 border-t border-border/20">
                    <Label className="flex items-center gap-2 text-base font-bold">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      {t('settings.auto.75')}
                                                          </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settings.auto.76')}
                                                          </p>
                    
                    <div className="flex gap-2">
                       <Input 
                         type="date" 
                         value={newHolidayDate}
                         onChange={(e) => setNewHolidayDate(e.target.value)}
                         className="flex-1 rounded-xl bg-background border-border text-xs"
                       />
                       <Input 
                         type="text" 
                         placeholder={t('settings.auto.77')}
                         value={newHolidayName}
                         onChange={(e) => setNewHolidayName(e.target.value)}
                         className="flex-[2] rounded-xl bg-background border-border text-xs pr-3"
                       />
                       <Button onClick={addHoliday} variant="default" className="rounded-xl px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shrink-0">
                         {t('t_auto_166')}
                                                                 </Button>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                      {(localSettings.customHolidays || []).map((holiday, i) => (
                        <div key={i} className="flex flex-col gap-2 bg-secondary/30 rounded-xl p-3 rtl:pl-2 px-4 shadow-sm border border-border/40">
                           <div className="flex justify-between items-center gap-2">
                             <Input 
                               type="text" 
                               value={holiday.name}
                               onChange={(e) => updateHoliday(i, 'name', e.target.value)}
                               className="flex-[2] h-8 text-sm font-bold bg-background/50 border-border/50"
                               placeholder={t('settings.auto.78')}
                             />
                             <Button variant="ghost" size="sm" onClick={() => removeHoliday(i)} className="text-red-500 hover:bg-red-500/10 hover:text-red-600 h-8 w-8 p-0 rounded-full shrink-0">
                                <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                           <Input 
                             type="date" 
                             value={holiday.date}
                             onChange={(e) => updateHoliday(i, 'date', e.target.value)}
                             className="h-8 text-xs text-emerald-600 font-bold bg-background/50 border-border/50"
                           />
                        </div>
                      ))}
                      {(localSettings.customHolidays || []).length === 0 && (
                         <div className="text-center p-4 border border-dashed border-border rounded-xl text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground/50" />
                            <span>{t('settings.auto.79')}</span>
                         </div>
                      )}
                    </div>
                  </div>

                </div>
            </TabsContent>
          )}

          {/* TAB: ADVANCED (NOTIFICATIONS & RULES) */}
          {localSettings.usageComplexity === 'advanced' && (
             <TabsContent value="advanced" className="space-y-8 mt-0 animate-in fade-in zoom-in-95 duration-300">
               {/* Advanced Settings */}
                <div className="flex flex-col bg-secondary/10 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                         <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="font-bold">{t('settings.auto.80')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t('settings.auto.81')}</p>
                      </div>
                    </div>
                    <Button 
                        className={`rounded-full shadow-lg transition-colors px-6 ${localSettings.notificationsEnabled ? 'bg-indigo-500 hover:bg-indigo-600 text-white font-bold' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                        onClick={localSettings.notificationsEnabled ? () => setLocalSettings({...localSettings, notificationsEnabled: false}) : requestNotificationPermission}
                      >
                      {localSettings.notificationsEnabled ? t('settings.auto.82') : t('settings.auto.83')}
                    </Button>
                  </div>

                  {localSettings.notificationsEnabled && (
                    <div className="flex flex-col gap-4 mt-2 pl-4 border-r-2 border-indigo-500/20 rtl:pr-4 rtl:pl-0 rtl:border-r-0 rtl:border-l-2 relative z-10">
                      <SubToggle 
                        label={t('settings.auto.84')} 
                        active={localSettings.notificationPreferences?.endOfDay ?? false} 
                        onClick={() => toggleSubNotification('endOfDay')}
                      />
                      {localSettings.notificationPreferences?.endOfDay && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">{t('settings.auto.85')}</Label>
                            <SmartTimePicker
                              value={localSettings.notificationPreferences.endOfDayReminderTime || '17:00'}
                              onChange={(val) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, endOfDayReminderTime: val}})}
                              className="h-10 text-sm rounded-lg bg-secondary/30 border-none w-full"
                            />
                          </div>
                      )}

                      <SubToggle 
                        label={t('settings.auto.86')} 
                        active={localSettings.notificationPreferences?.pomodoro ?? false} 
                        onClick={() => toggleSubNotification('pomodoro')} 
                      />
                      {localSettings.notificationPreferences?.pomodoro && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">{t('settings.auto.87')}</Label>
                            <Input 
                              type="number" 
                              value={localSettings.notificationPreferences.pomodoroMinutes || 25}
                              onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, pomodoroMinutes: Number(e.target.value)}})}
                              className="h-10 rounded-lg bg-secondary/30 border-none"
                            />
                          </div>
                      )}

                      <SubToggle 
                        label={t('settings.auto.88')} 
                        active={localSettings.notificationPreferences?.overtimeWarning ?? false} 
                        onClick={() => toggleSubNotification('overtimeWarning')} 
                      />
                      {localSettings.notificationPreferences?.overtimeWarning && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">{t('settings.auto.89')}</Label>
                            <Input 
                              type="number" 
                              value={localSettings.notificationPreferences.overtimeWarningMinutes || 15}
                              onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, overtimeWarningMinutes: Number(e.target.value)}})}
                              className="h-10 rounded-lg bg-secondary/30 border-none"
                            />
                          </div>
                      )}

                      <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/50">
                          <Label className="text-sm font-bold flex items-center gap-2">
                            <Bell className="w-4 h-4 text-indigo-400" /> {t('settings.auto.90')}
                                                                        </Label>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                              {['digital', 'analog', 'gentle', 'vibrate_only'].map(snd => (
                                  <Button 
                                    key={snd} 
                                    variant={localSettings.notificationPreferences?.alarmSound === snd ? 'default' : 'outline'}
                                    className={`rounded-xl text-xs h-10 transition-all ${localSettings.notificationPreferences?.alarmSound === snd ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md' : 'text-muted-foreground border-white/5 hover:bg-secondary/50 hover:text-foreground'}`}
                                    onClick={() => {
                                      setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, alarmSound: snd as any}});
                                      import('../../lib/notifications').then(({playAlarm}) => playAlarm(snd as any));
                                    }}
                                  >
                                    {snd === 'digital' ? t('settings.auto.91') : snd === 'analog' ? t('settings.auto.92') : snd === 'gentle' ? t('settings.auto.93') : t('settings.auto.94')}
                                  </Button>
                              ))}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="mt-3 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/10 rounded-xl border-dashed h-10 w-fit"
                            onClick={() => sendAppNotification(t('settings.auto.95'), { body: t('settings.auto.96') })}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            {t('settings.auto.97')}
                                                                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Overtime & Lateness Settings */}
                {localSettings.system !== 'freelance' && (
                  <div className="space-y-5 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-orange-500/50 rounded-r-3xl"></div>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-6 h-6 text-orange-500" />
                        <div>
                          <h3 className="font-bold text-lg">{t('settings.auto.98')}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{t('settings.auto.99')}</p>
                        </div>
                    </div>
                    
                    <div className="grid gap-5 sm:grid-cols-2 pt-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">{t('settings.auto.100')}</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.gracePeriodMinutes || 0}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), gracePeriodMinutes: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('settings.auto.101')}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">{t('settings.auto.102')}</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.maxOvertimeHours || 0}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), maxOvertimeHours: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('settings.auto.103')}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">{t('settings.auto.104')}</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.overtimeMinThresholdMinutes || 60}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeMinThresholdMinutes: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{t('settings.auto.105')}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">{t('settings.auto.106')}</Label>
                          <Select 
                              value={localSettings.advancedRules?.overtimeRoundingStrategy || 'exact'} 
                              onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeRoundingStrategy: val}})}
                          >
                            <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full min-w-0" >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[250px]">
                              <SelectItem value="exact">{t('settings.auto.107')}</SelectItem>
                              <SelectItem value="round_down_hour">{t('settings.auto.108')}</SelectItem>
                              <SelectItem value="round_down_half">{t('settings.auto.109')}</SelectItem>
                              <SelectItem value="dynamic_ask">{t('settings.auto.110')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border/30">
                          <Label className="text-sm font-bold text-foreground">{t('settings.auto.111')}</Label>
                          <Select 
                              value={localSettings.advancedRules?.overtimeCalculationType || 'fixed_rate'} 
                              onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeCalculationType: val}})}
                          >
                            <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full" >
                              <SelectValue placeholder={t('settings.auto.112')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed_rate">{t('settings.auto.113')}</SelectItem>
                              <SelectItem value="multiplier_formula">{t('settings.auto.114')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">{t('settings.auto.115')}</p>
                        </div>
                    </div>
                  </div>
                )}
             </TabsContent>
          )}

          {/* TAB: SYSTEM & DATA */}
          <TabsContent value="system" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
             {/* AI Core Settings */}
             <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 space-y-4 shadow-sm">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-500">
                        <Cpu className="w-6 h-6"/>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-emerald-500">{t('settings.auto.116')}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            {t('settings.auto.117')}
                                                              </p>
                    </div>
                </div>
                
                <div className="space-y-3 pt-4">
                  <Label className="font-bold">{t('settings.auto.118')}</Label>
                  <Input 
                    type="password" 
                    placeholder={t('settings.auto.119')}
                    className="h-14 rounded-xl bg-black/40 border-white/10 focus:border-emerald-500/50 font-mono"
                    value={localSettings.customAIApiKey || ''}
                    onChange={(e) => setLocalSettings({...localSettings, customAIApiKey: e.target.value})}
                  />
                  <div className="flex flex-col gap-2 p-3 bg-emerald-500/10 rounded-xl mt-2 border border-emerald-500/10">
                      <p className="text-xs text-foreground font-medium flex items-start gap-2">
                         <span className="text-emerald-500 text-lg leading-none">🔒</span> {t('settings.auto.120')}
                                                            </p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:text-emerald-400 font-bold w-fit mt-1 mr-6 underline underline-offset-4">
                          {t('settings.auto.121')}
                                                            </a>
                  </div>
                </div>
             </div>

             {/* Data Management (Database Improvements Suggestion) */}
             <div className="bg-secondary/10 p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                   <Database className="w-6 h-6 text-indigo-400" />
                   <div>
                     <p className="font-bold text-lg">{t('settings.auto.122')}</p>
                     <p className="text-xs text-muted-foreground mt-0.5">
                        {t('settings.auto.123')}
                                                           </p>
                   </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-3 pt-4">
                   <Button variant="secondary" className="h-14 rounded-xl hover:bg-secondary/80 font-bold" onClick={async () => {
                       try {
                          const allSessions = await db.sessions.toArray();
                          const allJobs = await db.jobs.toArray();
                          const allShifts = await db.shifts.toArray();
                          const allMoods = await db.moods.toArray();
                          const allAlarms = await db.alarms.toArray();
                          const allPayments = await db.payments.toArray();
                          
                          const projects = JSON.parse(localStorage.getItem('worklog_projects') || '[]');
                          
                          const data = {
                              version: 1,
                              settings: localSettings,
                              projects,
                              db: {
                                 sessions: allSessions,
                                 jobs: allJobs,
                                 shifts: allShifts,
                                 moods: allMoods,
                                 alarms: allAlarms,
                                 payments: allPayments
                              }
                          };
                          const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `lifecompanion_backup_${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                       } catch(err) {
                          alert(t('settings.auto.124'));
                       }
                   }}>
                      {t('settings.auto.125')} 
                                                     </Button>
                   <Button variant="outline" className="h-14 rounded-xl border-dashed border-white/20 hover:bg-secondary/30 text-muted-foreground" onClick={() => alert(t('settings.auto.126'))}>
                      {t('settings.auto.127')}
                                                     </Button>
                </div>
             </div>

             {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 border-t border-border/40 pt-6 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
                  onClick={() => window.open(t('settings.auto.128'), '_blank')}
                >
                   {t('settings.auto.129')}
                                              </Button>

                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 font-bold"
                  onClick={async () => {
                    if (window.confirm(t('settings.auto.130'))) {
                      await deleteAllData();
                    }
                  }}
                >
                  {t('settings.auto.131')}
                                              </Button>
              </div>

              {(user || isOfflineMode) && (
                <div className="pt-4 mt-2 border-t border-border/10">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl text-orange-500 border-orange-500/30 hover:bg-orange-500/10 font-bold"
                    onClick={async () => {
                      if (window.confirm(t('settings.auto.132'))) {
                        await logOut();
                        toast.success(t('settings.auto.133'));
                      }
                    }}
                  >
                    <LogOut className="w-5 h-5 ml-2" />
                    {user ? t('settings.auto.134') : t('settings.auto.135')}
                  </Button>
                </div>
              )}
          </TabsContent>

        </Card>
      </Tabs>

      <div className="sticky bottom-4 z-50">
        <Button 
          className="w-full h-16 rounded-3xl font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 gap-3 text-lg transition-transform hover:scale-[1.02] active:scale-95"
          onClick={handleSave}
        >
          <Save className="w-6 h-6" />
          {t('settings.auto.136')}
        </Button>
      </div>

      {restDayChangeDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
          <div className="bg-card border border-border/80 max-w-md w-full rounded-[2rem] p-6 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-right">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                تعديل أيام الراحة الأسبوعية
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                لقد قمت بتعديل أيام الراحة الأسبوعية المعتادة. هل ترغب في تطبيق هذا التغيير بأثر رجعي لجميع الجلسات السابقة (دائماً)، أم ترغب في تطبيقه بدءاً من تاريخ محدد فقط للحفاظ على سجلاتك القديمة؟
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-secondary/10 p-4 rounded-2xl border border-white/5 space-y-3">
                 <Label className="text-xs text-muted-foreground font-medium block">خيارات التطبيق:</Label>
                 <div className="flex flex-col gap-2">
                   <Button 
                     variant="default" 
                     className="w-full text-right justify-start rounded-xl py-3 h-auto leading-normal bg-indigo-500 hover:bg-indigo-600 font-bold"
                     onClick={() => applyRestDayChange('always')}
                   >
                     <div className="text-right">
                       <span className="block text-sm text-white">تطبيق دائماً (أثر رجعي كامل)</span>
                       <span className="block text-[10px] text-indigo-200 font-normal mt-0.5">سيتم تحديث كافة السجلات والجلسات السابقة بناءً على أيام الراحة الجديدة.</span>
                     </div>
                   </Button>

                   <Button 
                     variant="outline" 
                     className="w-full text-right justify-start rounded-xl py-3 h-auto leading-normal border-indigo-500/20 hover:bg-indigo-500/10 font-bold"
                     onClick={() => {
                       const today = new Date().toISOString().split('T')[0];
                       setRestDayChangeDate(today);
                     }}
                   >
                     <div className="text-right">
                       <span className="block text-sm">تطبيق من تاريخ محدد</span>
                       <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">سيتم الحفاظ على التوزيع القديم لأيام الراحة قبل التاريخ المحدد.</span>
                     </div>
                   </Button>
                 </div>
              </div>

              {restDayChangeDate !== '' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-xs text-muted-foreground block">تاريخ بدء تطبيق أيام الراحة الجديدة:</Label>
                  <Input 
                    type="date" 
                    value={restDayChangeDate}
                    onChange={(e) => setRestDayChangeDate(e.target.value)}
                    className="h-10 rounded-xl bg-background border-border"
                  />
                  <div className="flex gap-2 justify-end mt-4">
                    <Button 
                      variant="ghost" 
                      className="rounded-xl"
                      onClick={() => setRestDayChangeDate('')}
                    >
                      تراجع
                    </Button>
                    <Button 
                      variant="default"
                      className="rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                      onClick={() => applyRestDayChange('from_date')}
                    >
                      تأكيد وحفظ بالتاريخ
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border/10 pt-4 gap-2">
              <Button 
                variant="ghost" 
                className="rounded-xl border border-border" 
                onClick={() => {
                  setLocalSettings({ ...localSettings, restDays: settings.restDays });
                  setRestDayChangeDialog(false);
                }}
              >
                إلغاء التعديل
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SubToggle({ label, desc, active, onClick }: { label: string, desc?: string, active: boolean, onClick: () => void }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-border/10 last:border-0 hover:bg-secondary/10 px-3 rounded-lg transition-colors cursor-pointer group" onClick={onClick}>
      <div className="flex flex-col pe-4 pointer-events-none">
        <span className="text-sm font-bold group-hover:text-primary transition-colors">{label}</span>
        {desc && <span className="text-[11px] text-muted-foreground mt-1 leading-tight">{desc}</span>}
      </div>
      <button 
        className={`w-12 h-7 shrink-0 rounded-full transition-colors relative shadow-inner ${active ? 'bg-emerald-500' : 'bg-secondary/60 border border-white/5'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 shadow-sm transition-transform ${active ? 'right-6 rtl:translate-x-5' : 'right-1 rtl:translate-x-0'}`} />
      </button>
    </div>
  );
}
