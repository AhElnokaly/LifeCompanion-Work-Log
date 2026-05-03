import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SmartTimePicker } from '../ui/smart-time-picker';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Settings as SettingsIcon, Save, Calendar, Clock, Briefcase, FileText, Bell, MapPin, CheckCircle, Trash2, Plus, Database, Cpu, LogOut } from 'lucide-react';
import { sendAppNotification } from '../../lib/notifications';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsView() {
  const { settings, updateSettings, deleteAllData } = useWorkLog();
  const { logOut, user, isOfflineMode } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success('تم حفظ الإعدادات بنجاح');
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
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' },
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
          <h2 className="text-2xl font-bold">إعدادات العمل</h2>
          <p className="text-muted-foreground text-sm">تخصيص نظام العمل والإجازات والتطبيقات الذكية</p>
        </div>
      </header>

      <Tabs defaultValue="general" className="w-full flex flex-col" dir="rtl">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="flex min-w-max w-full h-auto bg-secondary/30 p-1.5 rounded-2xl mb-2 gap-1 items-center">
            <TabsTrigger value="general" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Briefcase className="w-4 h-4 ml-2 inline-block"/>عام وأساسي</TabsTrigger>
            
            {localSettings.system !== 'freelance' && (
              <TabsTrigger value="schedule" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Calendar className="w-4 h-4 ml-2 inline-block"/>وقت وإجازات</TabsTrigger>
            )}

            {localSettings.usageComplexity === 'advanced' && (
               <TabsTrigger value="advanced" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Bell className="w-4 h-4 ml-2 inline-block"/>متقدم</TabsTrigger>
            )}
            
            <TabsTrigger value="system" className="rounded-xl flex-1 text-xs sm:text-sm py-2.5 px-4 border border-transparent data-[state=active]:border-white/5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-bold transition-all whitespace-nowrap"><Database className="w-4 h-4 ml-2 inline-block"/>نظام وبيانات</TabsTrigger>
          </TabsList>
        </div>

        <Card className="p-5 sm:p-6 bg-card border-white/5 rounded-3xl shadow-sm mt-2 relative min-h-[500px]">
          
          {/* TAB: GENERAL */}
          <TabsContent value="general" className="space-y-8 mt-0 animate-in fade-in zoom-in-95 duration-300">
            {/* Work System */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Briefcase className="w-4 h-4 text-emerald-500" />
                نظام العمل
              </Label>
              <Select 
                value={localSettings.system} 
                onValueChange={(v: 'fixed' | 'shifts' | 'freelance') => setLocalSettings({...localSettings, system: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" >
                  <SelectValue placeholder="اختر النظام" />
                </SelectTrigger>
                <SelectContent sideOffset={5} className="min-w-[150px]">
                  <SelectItem value="fixed">ثابت (موظف)</SelectItem>
                  <SelectItem value="shifts">ورديات (شيفات)</SelectItem>
                  <SelectItem value="freelance">عمل حر (مستقل)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usage Complexity */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <SettingsIcon className="w-4 h-4 text-emerald-500" />
                أسلوب الاستخدام العام
              </Label>
              <Select 
                value={localSettings.usageComplexity || 'basic'} 
                onValueChange={(v: 'basic' | 'advanced') => setLocalSettings({...localSettings, usageComplexity: v})}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" >
                  <SelectValue placeholder="اختر أسلوب الاستخدام" />
                </SelectTrigger>
                <SelectContent sideOffset={5} className="min-w-[200px]">
                  <SelectItem value="basic" className="py-3 items-start"><span className="text-right block w-full">بسيط (تسجيل سريع وأساسي)</span></SelectItem>
                  <SelectItem value="advanced" className="py-3 items-start"><span className="text-right block w-full whitespace-normal leading-tight">متقدم (ذكاء وتقارير وتتبع شامل)</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Modules Management */}
            {localSettings.usageComplexity === 'advanced' && (
              <div className="bg-secondary/10 p-5 rounded-2xl border border-white/5 space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 text-base font-bold text-primary">الميزات الإضافية (Modules)</Label>
                    <p className="text-xs text-muted-foreground mt-1">قم بتفعيل ماتريده لتجنب الفوضى (Zero Clutter)</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <SubToggle 
                      label="المحرك الذكي وتحليل الإرهاق" 
                      desc="تفعيل المساعد الذكي، والمطالبات بنصائح الإرهاق"
                      active={localSettings.modules?.aiSuggestions ?? true} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, aiSuggestions: !localSettings.modules?.aiSuggestions}})}
                    />
                    <SubToggle 
                      label="الرسوم البيانية والتقارير" 
                      desc="توفير نظرة أعمق للبيانات عبر الرسوم البيانية وصفحات الرصد"
                      active={localSettings.modules?.analytics ?? true} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, analytics: !localSettings.modules?.analytics}})}
                    />
                    <SubToggle 
                      label="إدارة الورديات (Shifts)" 
                      desc="جدولة وترتيب ومتابعة الورديات المتغيرة أو الثابتة"
                      active={localSettings.modules?.shifts ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, shifts: !localSettings.modules?.shifts}})} 
                    />
                    <SubToggle 
                      label="المقاييس المالية (Finances)" 
                      desc="تفعيل صفحة المحفظة لتتبع الأرباح وقيمة العمل المالية"
                      active={localSettings.modules?.finances ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, finances: !localSettings.modules?.finances}})} 
                    />
                    <SubToggle 
                      label="الحالة النفسية (Health & Mood)" 
                      desc="يطلب التقييم النفسي والجهد بعد كل جلسة لتحليل الاحتراق الوظيفي"
                      active={localSettings.modules?.healthMood ?? false} 
                      onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, healthMood: !localSettings.modules?.healthMood}})} 
                    />
                  </div>
              </div>
            )}

            {/* Target Hours */}
            <div className="bg-secondary/10 p-5 rounded-2xl border border-white/5 space-y-4">
               <div>
                  <Label className="flex items-center gap-2 text-base font-bold text-primary">الخطة الزمنية المستهدفة (Target Hours)</Label>
                  <p className="text-xs text-muted-foreground mt-1">لقياس معدل الإنجاز وتوزيع الجهد</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                   <Label className="text-xs text-muted-foreground">الساعات الأسبوعية المطلوبة</Label>
                   <Input 
                     type="number" 
                     placeholder="مثال: 40"
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.weeklyHoursTarget || ''}
                     onChange={(e) => setLocalSettings({...localSettings, weeklyHoursTarget: Number(e.target.value) || undefined})}
                   />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-xs text-muted-foreground">الساعات الشهرية المطلوبة</Label>
                   <Input 
                     type="number" 
                     placeholder="مثال: 160"
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.monthlyHoursTarget || ''}
                     onChange={(e) => setLocalSettings({...localSettings, monthlyHoursTarget: Number(e.target.value) || undefined})}
                   />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mt-2">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">صلاحية البديلة (أيام)</Label>
                   <Input 
                     type="number" 
                     placeholder="مثال: 30"
                     className="h-12 rounded-xl bg-secondary/30 border-none"
                     value={localSettings.compensationValidityDays || ''}
                     onChange={(e) => setLocalSettings({...localSettings, compensationValidityDays: Number(e.target.value) || undefined})}
                   />
                 </div>
               </div>

               {localSettings.system === 'freelance' && (
                 <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
                   <Label className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-3 h-3 text-emerald-500" />الهدف اليومي المبدئي (للمستقلين)</Label>
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
                  <p className="font-bold">تسجيل الحضور الجغرافي</p>
                  <p className="text-xs text-muted-foreground mt-1">Check-in تلقائي عند الوصول بناءً على الـ GPS</p>
                </div>
              </div>
              <Button 
                className={`rounded-full shadow-lg transition-colors ${localSettings.autoCheckIn ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                onClick={localSettings.autoCheckIn ? () => setLocalSettings({...localSettings, autoCheckIn: false}) : requestLocationPermission}
              >
                {localSettings.autoCheckIn ? "مفعل" : "تفعيل"}
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
                      عدد ساعات العمل اليومية الرسمية
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
                        <Label className="text-xs text-muted-foreground">موعد الدخول المتوقع</Label>
                        <SmartTimePicker 
                          className="h-12 rounded-2xl bg-secondary/30 border-none w-full"
                          value={localSettings.expectedStartTime || '09:00'}
                          onChange={(val) => setLocalSettings({...localSettings, expectedStartTime: val})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">موعد الخروج المتوقع</Label>
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
                      التصاريح
                    </Label>
                    <p className="text-[10px] text-muted-foreground">(إجمالي الساعات بالشهر)</p>
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
                      الإجازات السنوية
                    </Label>
                    <p className="text-[10px] text-muted-foreground">(في السنة)</p>
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
                      أيام الراحة الأسبوعية
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
                      الإجازات والعطلات الرسمية
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      أضف تواريخ العطل الرسمية ليتم احتسابها كأيام راحة في النظام.
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
                         placeholder="اسم العطلة..."
                         value={newHolidayName}
                         onChange={(e) => setNewHolidayName(e.target.value)}
                         className="flex-[2] rounded-xl bg-background border-border text-xs pr-3"
                       />
                       <Button onClick={addHoliday} variant="default" className="rounded-xl px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shrink-0">
                         إضافة
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
                               placeholder="اسم العطلة"
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
                            <span>لا توجد عطلات رسمية مضافة</span>
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
                        <p className="font-bold">تفعيل الإشعارات والتنبيهات</p>
                        <p className="text-xs text-muted-foreground mt-0.5">التحكم الكلي بالتنبيهات المنبثقة والصوتية</p>
                      </div>
                    </div>
                    <Button 
                        className={`rounded-full shadow-lg transition-colors px-6 ${localSettings.notificationsEnabled ? 'bg-indigo-500 hover:bg-indigo-600 text-white font-bold' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                        onClick={localSettings.notificationsEnabled ? () => setLocalSettings({...localSettings, notificationsEnabled: false}) : requestNotificationPermission}
                      >
                      {localSettings.notificationsEnabled ? "مفعل" : "تفعيل"}
                    </Button>
                  </div>

                  {localSettings.notificationsEnabled && (
                    <div className="flex flex-col gap-4 mt-2 pl-4 border-r-2 border-indigo-500/20 rtl:pr-4 rtl:pl-0 rtl:border-r-0 rtl:border-l-2 relative z-10">
                      <SubToggle 
                        label="تنبيه نهاية الدوام" 
                        active={localSettings.notificationPreferences?.endOfDay ?? false} 
                        onClick={() => toggleSubNotification('endOfDay')}
                      />
                      {localSettings.notificationPreferences?.endOfDay && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">موعد تنبيه نهاية اليوم</Label>
                            <SmartTimePicker
                              value={localSettings.notificationPreferences.endOfDayReminderTime || '17:00'}
                              onChange={(val) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, endOfDayReminderTime: val}})}
                              className="h-10 text-sm rounded-lg bg-secondary/30 border-none w-full"
                            />
                          </div>
                      )}

                      <SubToggle 
                        label="جلسات التركيز (Pomodoro)" 
                        active={localSettings.notificationPreferences?.pomodoro ?? false} 
                        onClick={() => toggleSubNotification('pomodoro')} 
                      />
                      {localSettings.notificationPreferences?.pomodoro && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">مدة جلسة التركيز (Pomodoro) بالدقائق</Label>
                            <Input 
                              type="number" 
                              value={localSettings.notificationPreferences.pomodoroMinutes || 25}
                              onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, pomodoroMinutes: Number(e.target.value)}})}
                              className="h-10 rounded-lg bg-secondary/30 border-none"
                            />
                          </div>
                      )}

                      <SubToggle 
                        label="تحذير العمل الإضافي" 
                        active={localSettings.notificationPreferences?.overtimeWarning ?? false} 
                        onClick={() => toggleSubNotification('overtimeWarning')} 
                      />
                      {localSettings.notificationPreferences?.overtimeWarning && (
                          <div className="flex flex-col gap-2 bg-background p-3 rounded-xl border border-border/50">
                            <Label className="text-xs text-muted-foreground">التنبيه قبل تجاوز الإضافي (بالدقائق)</Label>
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
                            <Bell className="w-4 h-4 text-indigo-400" /> اختيارات الصوت
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
                                    {snd === 'digital' ? 'رقمي' : snd === 'analog' ? 'محاكي' : snd === 'gentle' ? 'هادئ' : 'اهتزاز'}
                                  </Button>
                              ))}
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="mt-3 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/10 rounded-xl border-dashed h-10 w-fit"
                            onClick={() => sendAppNotification('إشعار تجريبي 🎉', { body: 'نظام الإشعارات يعمل بنجاح في تطبيق LifeCompanion!' })}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            تجربة الإشعارات الآن
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
                          <h3 className="font-bold text-lg">منطق الإضافي والتأخيرات</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">تحديد دقيق لآليات التعويض والمساءلة</p>
                        </div>
                    </div>
                    
                    <div className="grid gap-5 sm:grid-cols-2 pt-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">وقت السماح للتأخير (Grace Limit)</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.gracePeriodMinutes || 0}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), gracePeriodMinutes: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">بضع دقائق سماح (مثال: 15). بعد هذا الوقت سيُسجَّل كتأخير فعلي ويطرح سؤال التبرير.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">أقصى رصيد إضافي شهرياً</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.maxOvertimeHours || 0}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), maxOvertimeHours: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">تعيين حد أقصى تنظيمي لا يتم تجاوزه لساعات العمل الإضافية في الشهر.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">عتبة البدء في حساب الإضافي</Label>
                          <Input 
                            type="number" 
                            className="h-12 bg-secondary/30 rounded-xl border-none"
                            value={localSettings.advancedRules?.overtimeMinThresholdMinutes || 60}
                            onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeMinThresholdMinutes: Number(e.target.value) || 0}})}
                          />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">أقل مدة يتم احتسابها (مثال: الشغل 35 دقيقة إضافية يُهمل، 60 دقيقة فأكثر يُحسب).</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-foreground">طريقة التقريب الرياضية</Label>
                          <Select 
                              value={localSettings.advancedRules?.overtimeRoundingStrategy || 'exact'} 
                              onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeRoundingStrategy: val}})}
                          >
                            <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full min-w-0" >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[250px]">
                              <SelectItem value="exact">حساب دقيق (حتى الدقائق الفردية)</SelectItem>
                              <SelectItem value="round_down_hour">تقريب الأدنى للساعات الكاملة</SelectItem>
                              <SelectItem value="round_down_half">تقريب الأدنى لأقرب نصف ساعة</SelectItem>
                              <SelectItem value="dynamic_ask">تفاعلي (السؤال والإقرار اليدوي)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border/30">
                          <Label className="text-sm font-bold text-foreground">مضاعف قيمة الساعة الإضافية</Label>
                          <Select 
                              value={localSettings.advancedRules?.overtimeCalculationType || 'fixed_rate'} 
                              onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeCalculationType: val}})}
                          >
                            <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full" >
                              <SelectValue placeholder="اختر المعامل الحسابي" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed_rate">مستوي (1x) - كالساعة المعتادة</SelectItem>
                              <SelectItem value="multiplier_formula">مضاعف (1.25 نهاراً / 1.5 ليلاً وراحة)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">كيفية تقويم العمل الإضافي ضمن الحسابات المالية وتقارير التقييم.</p>
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
                        <p className="font-bold text-lg text-emerald-500">المحرك الذكي (Google Gemini AI)</p>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                            ضع مفتاح API الخاص بك لفتح قدرات التحليل الذكية والنصائح وتوليد الأفكار بناءً على بياناتك.
                        </p>
                    </div>
                </div>
                
                <div className="space-y-3 pt-4">
                  <Label className="font-bold">مفتاح API الخاص بك (AIzaSy...)</Label>
                  <Input 
                    type="password" 
                    placeholder="ضع المفتاح هنا"
                    className="h-14 rounded-xl bg-black/40 border-white/10 focus:border-emerald-500/50 font-mono"
                    value={localSettings.customAIApiKey || ''}
                    onChange={(e) => setLocalSettings({...localSettings, customAIApiKey: e.target.value})}
                  />
                  <div className="flex flex-col gap-2 p-3 bg-emerald-500/10 rounded-xl mt-2 border border-emerald-500/10">
                      <p className="text-xs text-foreground font-medium flex items-start gap-2">
                         <span className="text-emerald-500 text-lg leading-none">🔒</span> نحن نضمن الحفاظ على خصوصيتك تماماً. المفتاح والبيانات لا تخزن على خوادمنا بل بجهازك فقط.
                      </p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-500 hover:text-emerald-400 font-bold w-fit mt-1 mr-6 underline underline-offset-4">
                          اضغط هنا للحصول على مفتاح مجاني
                      </a>
                  </div>
                </div>
             </div>

             {/* Data Management (Database Improvements Suggestion) */}
             <div className="bg-secondary/10 p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                   <Database className="w-6 h-6 text-indigo-400" />
                   <div>
                     <p className="font-bold text-lg">النسخ الاحتياطي وإدارة البيانات</p>
                     <p className="text-xs text-muted-foreground mt-0.5">
                        بياناتك محفوظة محلياً في المتصفح (IndexedDB)، ننصح بالتصدير دورياً لتفادي الضياع.
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
                          alert("حدث خطأ أثناء التصدير");
                       }
                   }}>
                      📦 تصدير وحفظ نسخة بيانات 
                   </Button>
                   <Button variant="outline" className="h-14 rounded-xl border-dashed border-white/20 hover:bg-secondary/30 text-muted-foreground" onClick={() => alert("سيتم إضافة ميزة الاستيراد قريباً لتجنب تعارض البيانات خطأً")}>
                      📥 استيراد نسخة محفوظة (قريباً)
                   </Button>
                </div>
             </div>

             {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 border-t border-border/40 pt-6 mt-6">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 font-bold"
                  onClick={() => window.open('https://wa.me/201009969653?text=مرحباً، لدي شكوى/اقتراح بخصوص تطبيق LifeCompanion:', '_blank')}
                >
                   💬 الدعم الفني بالمراسلة
                </Button>

                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 font-bold"
                  onClick={async () => {
                    if (window.confirm('🚨 هل أنت متأكد تماماً من مسح جميع بيانات وتاريخ التطبيق؟ لن يمكنك التراجع عن هذه الخطوة.')) {
                      await deleteAllData();
                    }
                  }}
                >
                  ⚠️ فرمتة جميع البيانات نهائياً
                </Button>
              </div>

              {(user || isOfflineMode) && (
                <div className="pt-4 mt-2 border-t border-border/10">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl text-orange-500 border-orange-500/30 hover:bg-orange-500/10 font-bold"
                    onClick={async () => {
                      if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                        await logOut();
                        toast.success('تم تسجيل الخروج بنجاح');
                      }
                    }}
                  >
                    <LogOut className="w-5 h-5 ml-2" />
                    {user ? 'تسجيل الخروج من الحساب' : 'العودة لشاشة الدخول'}
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
          حفظ التغييرات
        </Button>
      </div>

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
