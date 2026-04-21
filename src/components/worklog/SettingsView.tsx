import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Settings as SettingsIcon, Save, Calendar, Clock, Briefcase, FileText, Bell, MapPin, CheckCircle } from 'lucide-react';
import { sendAppNotification } from '../../lib/notifications';

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
            <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none">
              <SelectValue placeholder="اختر النظام" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} dir="rtl">
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
            <SelectTrigger className="h-12 rounded-2xl bg-secondary/30 border-none">
              <SelectValue placeholder="اختر أسلوب الاستخدام" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} dir="rtl" className="w-[--radix-select-trigger-width] max-w-full min-w-0">
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
                 active={localSettings.modules?.aiSuggestions ?? true} 
                 onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules, aiSuggestions: !(localSettings.modules?.aiSuggestions ?? true), analytics: localSettings.modules?.analytics ?? true, shifts: localSettings.modules?.shifts ?? false}})}
               />
               <SubToggle 
                 label="الرسوم البيانية والتقارير المتقدمة" 
                 active={localSettings.modules?.analytics ?? true} 
                 onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules, aiSuggestions: localSettings.modules?.aiSuggestions ?? true, analytics: !(localSettings.modules?.analytics ?? true), shifts: localSettings.modules?.shifts ?? false}})}
               />
               <SubToggle 
                 label="إدارة الورديات المعقدة (Shifts)" 
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
                  variant={localSettings.notificationsEnabled ? "default" : "outline"} 
                  className="rounded-full"
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
                variant={localSettings.autoCheckIn ? "default" : "outline"} 
                className="rounded-full"
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
                   active={localSettings.modules?.shifts ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, shifts: !localSettings.modules?.shifts}})} 
                 />
                 <SubToggle 
                   label="التقارير والمقاييس المالية (Finances)" 
                   active={localSettings.modules?.finances ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, finances: !localSettings.modules?.finances}})} 
                 />
                 <SubToggle 
                   label="تتبع الحالة النفسية والمزاج (Health & Mood)" 
                   active={localSettings.modules?.healthMood ?? false} 
                   onClick={() => setLocalSettings({...localSettings, modules: {...localSettings.modules!, healthMood: !localSettings.modules?.healthMood}})} 
                 />
                 <SubToggle 
                   label="المحرك الذكي (AI Core Dashboard)" 
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
           <div className="bg-secondary/20 p-4 rounded-xl border border-white/5 space-y-4">
              <p className="font-bold flex items-center gap-2"><SettingsIcon className="w-4 h-4 text-primary"/> إعدادات المحرك الذكي (AI)</p>
              <div className="space-y-3">
                <Label>مفتاح API الخاص بك (Gemini)</Label>
                <Input 
                  type="password" 
                  placeholder="اتركه فارغاً لاستخدام المفتاح الافتراضي، أو أدخل مفتاحك"
                  className="h-12 rounded-xl"
                  value={localSettings.customAIApiKey || ''}
                  onChange={(e) => setLocalSettings({...localSettings, customAIApiKey: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  نحن نضمن الحفاظ على خصوصيتك. مفتاحك يُخزن محلياً فقط في متصفحك.
                </p>
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

function SubToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm font-medium">{label}</span>
      <button 
        onClick={onClick}
        className={`w-10 h-6 rounded-full transition-colors relative ${active ? 'bg-emerald-500' : 'bg-secondary/50'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${active ? 'right-5 rtl:translate-x-4' : 'right-1 rtl:translate-x-0'}`} />
      </button>
    </div>
  );
}
