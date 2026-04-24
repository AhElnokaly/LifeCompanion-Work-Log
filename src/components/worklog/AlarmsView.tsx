import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Bell, Clock, Timer, GripVertical, Check, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

export default function AlarmsView() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'pomodoro' | 'classic'>('shifts');

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" dir="rtl">
      <header className="flex items-center justify-between mb-4 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">المنبهات والتركيز</h2>
            <p className="text-muted-foreground text-sm">إدارة التنبيهات، والتذكيرات، والتركيز</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-secondary/30 p-1 rounded-xl w-full flex-wrap gap-1">
        <Button 
          variant={activeTab === 'shifts' ? 'secondary' : 'ghost'} 
          className={`flex-1 min-w-[30%] h-10 text-xs sm:text-sm rounded-lg ${activeTab === 'shifts' ? 'font-bold bg-card shadow-sm' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          <Clock className="w-4 h-4 ml-1.5" /> تذكيرات الدوام
        </Button>
        <Button 
          variant={activeTab === 'pomodoro' ? 'secondary' : 'ghost'} 
          className={`flex-1 min-w-[30%] h-10 text-xs sm:text-sm rounded-lg ${activeTab === 'pomodoro' ? 'font-bold bg-card shadow-sm' : ''}`}
          onClick={() => setActiveTab('pomodoro')}
        >
          <Timer className="w-4 h-4 ml-1.5" /> مؤقت التركيز
        </Button>
        <Button 
          variant={activeTab === 'classic' ? 'secondary' : 'ghost'} 
          className={`flex-1 min-w-[30%] h-10 text-xs sm:text-sm rounded-lg ${activeTab === 'classic' ? 'font-bold bg-card shadow-sm' : ''}`}
          onClick={() => setActiveTab('classic')}
        >
          <Bell className="w-4 h-4 ml-1.5" /> الكلاسيكي
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'shifts' && <ShiftAlarms />}
        {activeTab === 'pomodoro' && <PomodoroTimer />}
        {activeTab === 'classic' && <ClassicAlarms />}
      </div>
    </div>
  );
}

function ShiftAlarms() {
  const [reminders, setReminders] = useState({
    early: true,
    leave: false,
    overtime: true,
    burnout: false,
    dailyLog: true
  });

  const toggle = (key: keyof typeof reminders) => {
    setReminders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-white/5 rounded-3xl relative overflow-hidden shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Clock className="text-emerald-500 w-5 h-5"/> التذكيرات الذكية
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          اقتراحات إشعارات ذكية مخصصة لبيئة عملك لمساعدتك على الالتزام وتقليل الخصومات.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('early')}>تذكير لتفادي التأخير</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('early')}>تنبيه قبل بداية وقت السماح بدقائق، لتُسجل دخولك فوراً.</p>
            </div>
            <Switch checked={reminders.early} onCheckedChange={() => toggle('early')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('leave')}>تنبيه الاستعداد للانصراف</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('leave')}>قبل نهاية الدوام بـ 15 دقيقة لبدء غلق المهام.</p>
            </div>
            <Switch checked={reminders.leave} onCheckedChange={() => toggle('leave')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('overtime')}>تحذير الإضافي المجاني</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('overtime')}>تنبيه فور تجاوزك وقت الوردية لعدم العمل كمتطوع.</p>
            </div>
            <Switch checked={reminders.overtime} onCheckedChange={() => toggle('overtime')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('burnout')}>تنبيه الإرهاق (Burnout Guard)</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('burnout')}>يقترح عليك أخذ استراحة مياه إذا عملت ساعتين متواصلتين.</p>
            </div>
            <Switch checked={reminders.burnout} onCheckedChange={() => toggle('burnout')} />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('dailyLog')}>تذكير تسجيل المذكرات</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('dailyLog')}>تذكير لكتابة ملخص اليوم قبل نهايته.</p>
            </div>
            <Switch checked={reminders.dailyLog} onCheckedChange={() => toggle('dailyLog')} />
          </div>
        </div>
      </Card>
      
      <p className="text-xs text-muted-foreground font-medium text-center animate-pulse">سيتم تفعيل هذه الإشعارات في النظام للعمل في الخلفية في النسخ القادمة.</p>
    </div>
  );
}

function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Logic when time ends 
      if (mode === 'work') {
         setMode('break');
         setTimeLeft(5 * 60);
      } else {
         setMode('work');
         setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetToBreak = () => {
    setMode('break');
    setTimeLeft(5 * 60);
    setIsActive(false);
  };
  
  const resetToWork = () => {
    setMode('work');
    setTimeLeft(25 * 60);
    setIsActive(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-4 flex flex-col items-center">
      <Card className="p-8 w-full max-w-sm bg-card border-white/5 rounded-[3rem] relative overflow-hidden flex flex-col items-center shadow-lg">
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${mode === 'work' ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-teal-500'}`}></div>
        <Timer className={`w-8 h-8 ${mode === 'work' ? 'text-red-500' : 'text-emerald-500'} mb-4 opacity-80`} />
        <h3 className="font-bold text-xl mb-4">{mode === 'work' ? 'تقنية بومودورو - تركيز' : 'وقت الراحة'}</h3>
        
        <div className="text-6xl font-black font-mono tracking-tighter text-foreground mb-8">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex gap-4">
          <Button 
            className={`w-28 rounded-2xl font-bold ${isActive ? 'bg-secondary hover:bg-secondary/80 text-foreground' : (mode === 'work' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600')}`}
            onClick={toggleTimer}
          >
            {isActive ? 'إيقاف مؤقت' : (mode === 'work' ? 'ابدأ التركيز' : 'ابدأ الراحة')}
          </Button>
          <Button variant="outline" className={`w-24 rounded-2xl font-bold ${mode === 'break' ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`} onClick={mode === 'break' ? resetToWork : resetToBreak}>
            {mode === 'break' ? 'تخطي للعمل' : 'راحة 5د'}
          </Button>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground text-center">
        تساعدك هذه التقنية على تقسيم العمل لفترات تركيز مدتها 25 دقيقة تليها 5 دقائق راحة لزيادة الإنتاجية.
      </p>
    </div>
  );
}

function ClassicAlarms() {
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-white/5 rounded-3xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Bell className="text-blue-500 w-5 h-5"/> المنبهات الثابتة
          </h3>
          <Button size="sm" variant="outline" className="rounded-xl h-8 border-blue-500/20 text-blue-500">
            <Plus className="w-4 h-4 ml-1" /> إضافة 
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black font-mono">07:00<span className="text-sm text-muted-foreground ml-1">ص</span></span>
              <div>
                <p className="font-bold text-sm">استيقاظ الصباح</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">يومياً عدا الجمعة والسبت</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-6 bg-blue-500 rounded-full flex items-center p-1 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full translate-x-[-16px] shadow-sm"></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-white/5 opacity-50">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black font-mono">14:30<span className="text-sm text-muted-foreground ml-1">م</span></span>
              <div>
                <p className="font-bold text-sm">اجتماع الفريق</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">الاثنين والأربعاء</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-6 bg-secondary rounded-full flex items-center p-1 cursor-pointer justify-end">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
