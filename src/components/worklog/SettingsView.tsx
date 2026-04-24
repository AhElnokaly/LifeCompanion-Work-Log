import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Settings as SettingsIcon, Save, Calendar, Clock, Briefcase, FileText, Bell, MapPin, CheckCircle, Trash2, Plus } from 'lucide-react';
import { sendAppNotification } from '../../lib/notifications';
import { db } from '../../lib/db';

export default function SettingsView() {
  const { settings, updateSettings, deleteAllData } = useWorkLog();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    updateSettings(localSettings);
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">إعدادات العمل</h2>
          <p className="text-muted-foreground text-sm">تخصيص نظام العمل والإجازات</p>
        </div>
      </header>

      <Card className="p-6 bg-card border-white/5 rounded-3xl space-y-6">
        
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
            <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" dir="rtl">
              <SelectValue placeholder="اختر النظام" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} dir="rtl" className="min-w-[150px]">
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
            أسلوب استخدام التطبيق
          </Label>
          <Select 
            value={localSettings.usageComplexity || 'basic'} 
            onValueChange={(v: 'basic' | 'advanced') => setLocalSettings({...localSettings, usageComplexity: v})}
          >
            <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none w-full min-w-0" dir="rtl">
              <SelectValue placeholder="اختر أسلوب الاستخدام" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} dir="rtl" className="min-w-[200px]">
              <SelectItem value="basic" className="py-3 items-start"><span className="text-right block w-full">بسيط (تسجيل سريع)</span></SelectItem>
              <SelectItem value="advanced" className="py-3 items-start"><span className="text-right block w-full whitespace-normal leading-tight">متقدم (ذكاء وتقارير)</span></SelectItem>
            </SelectContent>
          </Select>
        </div>

        {localSettings.usageComplexity === 'advanced' && (
          <div className="space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <Label className="flex items-center gap-2 text-base font-bold text-primary">
               الميزات الإضافية المتقدمة (Modules)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">قم بتفعيل الميزات التي تحتاجها فقط للحفاظ على بساطة التطبيق.</p>
            
            <div className="flex flex-col gap-2">
               <SubToggle 
                 label="المحرك الذكي وتحليل الإرهاق" 
                 desc="تفعيل المساعد الذكي، والمطالبات بنصائح الإرهاق"
                 active={localSettings.modules?.aiSuggestions ?? true} 
                 onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules, aiSuggestions: !(localSettings.modules?.aiSuggestions ?? true), analytics: localSettings.modules?.analytics ?? true, shifts: localSettings.modules?.shifts ?? false}})}
               />
               <SubToggle 
                 label="الرسوم البيانية والتقارير المتقدمة" 
                 desc="توفير نظرة أعمق للبيانات عبر الرسوم البيانية وصفحات الرصد"
                 active={localSettings.modules?.analytics ?? true} 
                 onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules, aiSuggestions: localSettings.modules?.aiSuggestions ?? true, analytics: !(localSettings.modules?.analytics ?? true), shifts: localSettings.modules?.shifts ?? false}})}
               />
               <SubToggle 
                 label="إدارة الورديات المعقدة (Shifts)" 
                 desc="جدولة وترتيب ومتابعة الورديات المتغيرة أو الثابتة"
                 active={localSettings.modules?.shifts ?? false} 
                 onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules, aiSuggestions: localSettings.modules?.aiSuggestions ?? true, analytics: localSettings.modules?.analytics ?? true, shifts: !(localSettings.modules?.shifts ?? false)}})}
               />
            </div>
          </div>
        )}

        {/* Daily Hours & Schedule */}
        {localSettings.system !== 'freelance' ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-emerald-500" />
                عدد ساعات العمل اليومية
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
                  <Input 
                    type="time" 
                    className="h-12 rounded-2xl bg-secondary/30 border-none"
                    value={localSettings.expectedStartTime || '09:00'}
                    onChange={(e) => setLocalSettings({...localSettings, expectedStartTime: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">موعد الخروج المتوقع</Label>
                  <Input 
                    type="time" 
                    className="h-12 rounded-2xl bg-secondary/30 border-none"
                    value={localSettings.expectedEndTime || '17:00'}
                    onChange={(e) => setLocalSettings({...localSettings, expectedEndTime: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
           <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-emerald-500" />
              الهدف اليومي لساعات العمل
            </Label>
            <Input 
              type="number" 
              className="h-12 rounded-2xl bg-secondary/30 border-none"
              value={localSettings.dailyHours}
              onChange={(e) => setLocalSettings({...localSettings, dailyHours: Number(e.target.value) || 0})}
            />
          </div>
        )}

        {/* Permissions & Leaves */}
        {localSettings.system !== 'freelance' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-yellow-500" />
                التصاريح (ساعات/شهرياً)
              </Label>
              <Input 
                type="number" 
                className="h-12 rounded-2xl bg-secondary/30 border-none"
                value={localSettings.monthlyPermissions}
                onChange={(e) => setLocalSettings({...localSettings, monthlyPermissions: Number(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-yellow-500" />
                الإجازات (أيام/سنوياً)
              </Label>
              <Input 
                type="number" 
                className="h-12 rounded-2xl bg-secondary/30 border-none"
                value={localSettings.annualLeaves}
                onChange={(e) => setLocalSettings({...localSettings, annualLeaves: Number(e.target.value) || 0})}
              />
            </div>
          </div>
        )}

        {/* Rest Days */}
        {localSettings.system !== 'freelance' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
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
                      className={`rounded-xl ${isSelected ? 'bg-indigo-500 hover:bg-indigo-600 border-none text-white' : 'border-white/10 hover:bg-secondary/40'}`}
                      onClick={() => toggleRestDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
               <Label className="flex items-center gap-2 text-base">
                 <Calendar className="w-4 h-4 text-emerald-500" />
                 الإجازات الرسمية المخصصة
               </Label>
               <div className="flex flex-col gap-2">
                 {(localSettings.customHolidays || []).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                       <div className="flex flex-col">
                         <span className="font-bold text-sm">{h.name}</span>
                         <span className="text-xs text-muted-foreground">{h.date}</span>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => {
                          const newH = [...(localSettings.customHolidays || [])];
                          newH.splice(i, 1);
                          setLocalSettings({ ...localSettings, customHolidays: newH });
                       }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                       </Button>
                    </div>
                 ))}
                 
                 <div className="flex gap-2 items-center bg-secondary/10 p-3 rounded-xl border border-border/50">
                    <Input 
                       type="date" 
                       className="flex-shrink border-none bg-background rounded-lg text-sm h-10 w-fit custom-holiday-date" 
                    />
                    <Input 
                       placeholder="اسم الإجازة" 
                       className="flex-1 border-none bg-background rounded-lg text-sm h-10 custom-holiday-name" 
                    />
                    <Button 
                       variant="default" 
                       className="h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0"
                       onClick={(e) => {
                          const parent = (e.target as HTMLElement).closest('.flex');
                          const dateInput = parent?.querySelector('.custom-holiday-date') as HTMLInputElement;
                          const nameInput = parent?.querySelector('.custom-holiday-name') as HTMLInputElement;
                          if (dateInput?.value && nameInput?.value) {
                             const newH = [...(localSettings.customHolidays || []), { date: dateInput.value, name: nameInput.value }];
                             setLocalSettings({ ...localSettings, customHolidays: newH });
                             dateInput.value = '';
                             nameInput.value = '';
                          }
                       }}
                    >
                       <Plus className="w-4 h-4" />
                    </Button>
                 </div>
                 <p className="text-[10px] text-muted-foreground">أضف الإجازات الرسمية (كالأعياد الوطنية) ليتم احتسابها كيوم راحة تلقائياً.</p>
               </div>
            </div>
          </div>
        )}

        {/* Advanced Overtime & Lateness Settings */}
        {localSettings.system !== 'freelance' && localSettings.usageComplexity === 'advanced' && (
           <div className="space-y-4 p-5 bg-card/50 border border-border/50 rounded-2xl">
             <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold">إعدادات الإضافي والتأخير (المتقدمة)</h3>
             </div>
             
             <div className="grid gap-4 sm:grid-cols-2">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground break-words overflow-visible block whitespace-normal" style={{wordBreak: "break-word"}}>وقت السماح للتأخير (دقائق)</Label>
                   <Input 
                     type="number" 
                     className="h-12 bg-secondary/30"
                     value={localSettings.advancedRules?.gracePeriodMinutes || 0}
                     onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), gracePeriodMinutes: Number(e.target.value) || 0}})}
                   />
                   <p className="text-[10px] text-muted-foreground whitespace-normal">لو الدخول بعد هذا الوقت، سيسأل التطبيق عن المتبقي.</p>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">أقصى عدد ساعات إضافية (شهرياً)</Label>
                   <Input 
                     type="number" 
                     className="h-12 bg-secondary/30"
                     value={localSettings.advancedRules?.maxOvertimeHours || 0}
                     onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), maxOvertimeHours: Number(e.target.value) || 0}})}
                   />
                   <p className="text-[10px] text-muted-foreground whitespace-normal">لإرسال تنبيه قبل تجاوز الحد المسموح.</p>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">أقل مدة لاحتساب الإضافي (دقائق)</Label>
                   <Input 
                     type="number" 
                     className="h-12 bg-secondary/30"
                     value={localSettings.advancedRules?.overtimeMinThresholdMinutes || 60}
                     onChange={(e) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeMinThresholdMinutes: Number(e.target.value) || 0}})}
                   />
                   <p className="text-[10px] text-muted-foreground whitespace-normal">مثال: 35 دقيقة إضافي لا تحسب إلا لو تعدت 60.</p>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">طريقة التقريب للإضافي</Label>
                   <Select 
                      value={localSettings.advancedRules?.overtimeRoundingStrategy || 'exact'} 
                      onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeRoundingStrategy: val}})}
                   >
                     <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full min-w-0" dir="rtl">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent dir="rtl" className="min-w-[250px]">
                       <SelectItem value="exact">بالدقيقة (Exact)</SelectItem>
                       <SelectItem value="round_down_hour">تقريب لأقرب ساعة</SelectItem>
                       <SelectItem value="round_down_half">تقريب لأقرب نصف ساعة</SelectItem>
                       <SelectItem value="dynamic_ask">تفاعلي (يسأل عند الدقائق)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2 sm:col-span-2">
                   <Label className="text-xs text-muted-foreground">نوع حساب المقابل المالي للإضافي</Label>
                   <Select 
                      value={localSettings.advancedRules?.overtimeCalculationType || 'fixed_rate'} 
                      onValueChange={(val: any) => setLocalSettings({...localSettings, advancedRules: {...(localSettings.advancedRules || {} as any), overtimeCalculationType: val}})}
                   >
                     <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl w-full min-w-0" dir="rtl">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent dir="rtl" className="min-w-[200px]">
                       <SelectItem value="fixed_rate">مبلغ ثابت لكل ساعة</SelectItem>
                       <SelectItem value="multiplier_formula">معادلة ذكية (1.25 / 1.35)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
             </div>
           </div>
        )}

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 gap-4 border-t border-border/10 pt-4">
           <div className="flex flex-col bg-secondary/20 p-4 rounded-xl border border-white/5">
             <div className="flex justify-between items-center mb-4">
               <div className="flex gap-3">
                 <Bell className="w-5 h-5 text-indigo-400 mt-1" />
                 <div>
                   <p className="font-bold">تفعيل الإشعارات</p>
                   <p className="text-xs text-muted-foreground mt-1">إعدادات التنبيهات المنبثقة</p>
                 </div>
               </div>
               <Button 
                  className={`rounded-full shadow-lg transition-colors ${localSettings.notificationsEnabled ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                  onClick={localSettings.notificationsEnabled ? () => setLocalSettings({...localSettings, notificationsEnabled: false}) : requestNotificationPermission}
                >
                 {localSettings.notificationsEnabled ? "مفعل" : "تفعيل"}
               </Button>
             </div>

             {localSettings.notificationsEnabled && (
               <div className="flex flex-col gap-3 mt-2 pl-8 border-r-2 border-primary/20 rtl:pr-8 rtl:pl-0 rtl:border-r-0 rtl:border-l-2">
                 <SubToggle 
                   label="تنبيه نهاية الدوام" 
                   active={localSettings.notificationPreferences?.endOfDay ?? false} 
                   onClick={() => toggleSubNotification('endOfDay')}
                 />
                 <SubToggle 
                   label="جلسات التركيز (Pomodoro)" 
                   active={localSettings.notificationPreferences?.pomodoro ?? false} 
                   onClick={() => toggleSubNotification('pomodoro')} 
                 />
                 <SubToggle 
                   label="تحذير العمل الإضافي" 
                   active={localSettings.notificationPreferences?.overtimeWarning ?? false} 
                   onClick={() => toggleSubNotification('overtimeWarning')} 
                 />

                 {localSettings.notificationPreferences?.pomodoro && (
                    <div className="flex flex-col gap-2 mt-2">
                      <Label className="text-xs text-muted-foreground">مدة جلسة التركيز (Pomodoro) بالدقائق</Label>
                      <Input 
                        type="number" 
                        value={localSettings.notificationPreferences.pomodoroMinutes || 25}
                        onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, pomodoroMinutes: Number(e.target.value)}})}
                        className="h-10 rounded-xl"
                      />
                    </div>
                 )}
                 {localSettings.notificationPreferences?.overtimeWarning && (
                    <div className="flex flex-col gap-2 mt-2">
                      <Label className="text-xs text-muted-foreground">التنبيه قبل تجاوز الإضافي (بالدقائق)</Label>
                      <Input 
                        type="number" 
                        value={localSettings.notificationPreferences.overtimeWarningMinutes || 15}
                        onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, overtimeWarningMinutes: Number(e.target.value)}})}
                        className="h-10 rounded-xl"
                      />
                    </div>
                 )}
                 {localSettings.notificationPreferences?.endOfDay && (
                    <div className="flex flex-col gap-2 mt-2 mb-2">
                      <Label className="text-xs text-muted-foreground">موعد تنبيه نهاية اليوم</Label>
                      <Input 
                        type="time" 
                        value={localSettings.notificationPreferences.endOfDayReminderTime || '17:00'}
                        onChange={(e) => setLocalSettings({...localSettings, notificationPreferences: {...localSettings.notificationPreferences!, endOfDayReminderTime: e.target.value}})}
                        className="h-10 rounded-xl"
                      />
                    </div>
                 )}

                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="mt-2 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/10"
                   onClick={() => sendAppNotification('إشعار تجريبي 🎉', { body: 'نظام الإشعارات يعمل بنجاح في تطبيق LifeCompanion!' })}
                 >
                   <CheckCircle className="w-4 h-4 mr-2" />
                   تجربة الإشعارات
                 </Button>
               </div>
             )}
           </div>
           
           <div className="flex justify-between items-center bg-secondary/20 p-4 rounded-xl border border-white/5">
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

           {/* Modules Management */}
           <div className="bg-secondary/20 p-4 rounded-xl border border-white/5 space-y-4">
              <div>
                <p className="font-bold mb-1">وحدات التطبيق الإضافية</p>
                <p className="text-xs text-muted-foreground">قم بتفعيل ما تحتاجه لإخفاء الفوضى (Zero Clutter)</p>
              </div>
              <div className="space-y-2">
                 <SubToggle 
                   label="إدارة الورديات (Shift Management)" 
                   desc="جدولة وترتيب ومتابعة الورديات المتغيرة أو الثابتة الخاصة بك"
                   active={localSettings.modules?.shifts ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, shifts: !localSettings.modules?.shifts}})} 
                 />
                 <SubToggle 
                   label="التقارير والمقاييس المالية (Finances)" 
                   desc="تفعيل صفحة (المحفظة) لتتبع الأرباح وقيمة العمل المالية"
                   active={localSettings.modules?.finances ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, finances: !localSettings.modules?.finances}})} 
                 />
                 <SubToggle 
                   label="تتبع الحالة النفسية والمزاج (Health & Mood)" 
                   desc="يطلب التقييم النفسي والجهد بعد كل جلسة لتحليل الاحتراق الوظيفي"
                   active={localSettings.modules?.healthMood ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, healthMood: !localSettings.modules?.healthMood}})} 
                 />
                 <SubToggle 
                   label="المحرك الذكي (AI Core Dashboard)" 
                   desc="تفعيل المساعد الذكي ونصائح الأداء المبنية على بياناتك وإرهاقك"
                   active={localSettings.modules?.analytics ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, analytics: !localSettings.modules?.analytics}})} 
                 />
              </div>
           </div>

           {/* Hours Targets */}
           <div className="bg-secondary/20 p-4 rounded-xl border border-white/5 space-y-4">
              <p className="font-bold">الخطة الزمنية المستهدفة (Target Hours)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>الساعات الأسبوعية المطلوبة</Label>
                  <Input 
                    type="number" 
                    placeholder="مثال: 40"
                    className="h-12 rounded-xl"
                    value={localSettings.weeklyHoursTarget || ''}
                    onChange={(e) => setLocalSettings({...localSettings, weeklyHoursTarget: Number(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-3">
                  <Label>الساعات الشهرية المطلوبة</Label>
                  <Input 
                    type="number" 
                    placeholder="مثال: 160"
                    className="h-12 rounded-xl"
                    value={localSettings.monthlyHoursTarget || ''}
                    onChange={(e) => setLocalSettings({...localSettings, monthlyHoursTarget: Number(e.target.value) || undefined})}
                  />
                </div>
              </div>
           </div>
           {/* AI Core Settings */}
           <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="font-bold flex items-center gap-2 text-emerald-400">
                          <SettingsIcon className="w-5 h-5"/> إعدادات المحرك الذكي (Google Gemini)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">يجب إدخال مفتاح API الخاص بك لتفعيل المستشار الذكي.</p>
                  </div>
              </div>
              <div className="space-y-3 pt-2">
                <Label>مفتاح API الخاص بك</Label>
                <Input 
                  type="password" 
                  placeholder="AIzaSy..."
                  className="h-12 rounded-xl bg-black/40 border-white/10 focus:border-emerald-500/50"
                  value={localSettings.customAIApiKey || ''}
                  onChange={(e) => setLocalSettings({...localSettings, customAIApiKey: e.target.value})}
                />
                <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      نحن نضمن الحفاظ على خصوصيتك تماماً. مفتاحك يُخزن محلياً فقط في المتصفح لديك ولا يتم إرساله لأي خوادم خارجية سوى خوادم Google لطلب خدمة الذكاء الاصطناعي.
                    </p>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 w-fit">
                        اضغط هنا للحصول على مفتاح مجاني
                    </a>
                </div>
              </div>
           </div>

           {/* Data Management (Database Improvements Suggestion) */}
           <div className="bg-secondary/20 p-5 rounded-2xl border border-white/5 space-y-4">
              <p className="font-bold">إدارة البيانات وقاعدة البيانات</p>
              <p className="text-xs text-muted-foreground mb-4">
                 لضمان عدم ضياع بياناتك، ننصحك بأخد نسخة احتياطية بشكل دوري. بياناتك محفوظة حالياً في متصفحك (Local IndexedDB & Storage).
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <Button variant="outline" className="h-12 rounded-xl bg-card border-white/10 hover:bg-secondary/50" onClick={async () => {
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
                    تصدير نسخة احتياطية
                 </Button>
                 <Button variant="outline" className="h-12 rounded-xl bg-card border-white/10 hover:bg-secondary/50" onClick={() => alert("سيتم إضافة ميزة الاستيراد قريباً لتجنب تعارض البيانات خطأً")}>
                    استيراد نسخة
                 </Button>
              </div>
           </div>
        </div>

        <Button 
          className="w-full h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90 mt-4 gap-2"
          onClick={handleSave}
        >
          <Save className="w-5 h-5" />
          حفظ الإعدادات
        </Button>

        {/* Footer Actions */}
        <div className="flex flex-col gap-3 border-t border-border pt-6 mt-6">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
            onClick={() => window.open('https://wa.me/201009969653?text=مرحباً، لدي شكوى/اقتراح بخصوص تطبيق LifeCompanion:', '_blank')}
          >
             واتساب الدعم الفني
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={async () => {
              if (window.confirm('هل أنت متأكد من مسح جميع بيانات التطبيق؟ لا يمكن استرجاعها.')) {
                await deleteAllData();
              }
            }}
          >
            مسح جميع بيانات التطبيق وإعادة الضبط
          </Button>
        </div>

      </Card>
    </div>
  );
}

function SubToggle({ label, desc, active, onClick }: { label: string, desc?: string, active: boolean, onClick: () => void }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/10 last:border-0">
      <div className="flex flex-col pe-4">
        <span className="text-sm font-medium">{label}</span>
        {desc && <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</span>}
      </div>
      <button 
        onClick={onClick}
        className={`w-10 h-6 shrink-0 rounded-full transition-colors relative ${active ? 'bg-emerald-500' : 'bg-secondary/50'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${active ? 'right-5 rtl:translate-x-4' : 'right-1 rtl:translate-x-0'}`} />
      </button>
    </div>
  );
}
