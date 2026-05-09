import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Bell, Clock, Timer, GripVertical, Check, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from "@/contexts/LanguageContext";

export default function AlarmsView() {
    const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'shifts' | 'pomodoro' | 'classic'>('shifts');

  return (
    <div className="flex flex-col gap-6 h-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20" dir="rtl">
      <header className="flex items-center justify-between mb-4 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('t_auto_139')}</h2>
            <p className="text-muted-foreground text-sm">{t('t_auto_140')}</p>
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
          <Clock className="w-4 h-4 ml-1.5" /> {t('t_auto_141')}
                          </Button>
        <Button 
          variant={activeTab === 'pomodoro' ? 'secondary' : 'ghost'} 
          className={`flex-1 min-w-[30%] h-10 text-xs sm:text-sm rounded-lg ${activeTab === 'pomodoro' ? 'font-bold bg-card shadow-sm' : ''}`}
          onClick={() => setActiveTab('pomodoro')}
        >
          <Timer className="w-4 h-4 ml-1.5" /> {t('t_auto_142')}
                          </Button>
        <Button 
          variant={activeTab === 'classic' ? 'secondary' : 'ghost'} 
          className={`flex-1 min-w-[30%] h-10 text-xs sm:text-sm rounded-lg ${activeTab === 'classic' ? 'font-bold bg-card shadow-sm' : ''}`}
          onClick={() => setActiveTab('classic')}
        >
          <Bell className="w-4 h-4 ml-1.5" /> {t('t_auto_143')}
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
    const { t, lang } = useLanguage();
  const { settings, updateSettings } = useWorkLog();
  const reminders = {
    early: settings.notificationPreferences?.endOfDay ?? true,
    leave: settings.notificationPreferences?.pomodoro ?? true,
    overtime: settings.notificationPreferences?.overtimeWarning ?? true,
    burnout: settings.notificationPreferences?.endOfDayReminderTime === 'burnout',
    dailyLog: settings.notificationPreferences?.alarmSound === 'gentle'
  };

  const toggle = (key: keyof typeof reminders) => {
    // Just map these to some abstract settings for now or create specific ones in settings
    let newPrefs = { ...(settings.notificationPreferences || {
      endOfDay: false,
      pomodoro: false,
      overtimeWarning: false
    }) };
    
    if (key === 'early') newPrefs.endOfDay = !reminders.early;
    if (key === 'leave') newPrefs.pomodoro = !reminders.leave;
    if (key === 'overtime') newPrefs.overtimeWarning = !reminders.overtime;
    if (key === 'burnout') newPrefs.endOfDayReminderTime = Object.assign(newPrefs.endOfDayReminderTime || '', reminders.burnout ? '' : 'burnout');
    if (key === 'dailyLog') newPrefs.alarmSound = Object.assign(newPrefs.alarmSound || 'digital', reminders.dailyLog ? 'digital' : 'gentle');

    updateSettings({
      ...settings,
      notificationPreferences: newPrefs
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-white/5 rounded-3xl relative overflow-hidden shadow-sm">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
          <Clock className="text-emerald-500 w-5 h-5"/> {t('t_auto_144')}
                          </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('t_auto_145')}
                          </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('early')}>{t('t_auto_146')}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('early')}>{t('t_auto_147')}</p>
            </div>
            <Switch checked={reminders.early} onCheckedChange={() => toggle('early')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('leave')}>{t('t_auto_148')}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('leave')}>{t('t_auto_149')}</p>
            </div>
            <Switch checked={reminders.leave} onCheckedChange={() => toggle('leave')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('overtime')}>{t('t_auto_150')}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('overtime')}>{t('t_auto_151')}</p>
            </div>
            <Switch checked={reminders.overtime} onCheckedChange={() => toggle('overtime')} />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('burnout')}>{t('t_auto_152')}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('burnout')}>{t('t_auto_153')}</p>
            </div>
            <Switch checked={reminders.burnout} onCheckedChange={() => toggle('burnout')} />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-secondary/20 hover:bg-secondary/30 transition-colors rounded-2xl border border-border/50">
            <div>
              <p className="font-bold cursor-pointer" onClick={() => toggle('dailyLog')}>{t('t_auto_154')}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 cursor-pointer" onClick={() => toggle('dailyLog')}>{t('t_auto_155')}</p>
            </div>
            <Switch checked={reminders.dailyLog} onCheckedChange={() => toggle('dailyLog')} />
          </div>
        </div>
      </Card>
      
      <p className="text-xs text-muted-foreground font-medium text-center mt-2">{t('t_auto_156')}</p>
    </div>
  );
}

function PomodoroTimer() {
    const { t, lang } = useLanguage();
  const { pomodoroTimeLeft: timeLeft, pomodoroIsActive: isActive, pomodoroMode: mode, togglePomodoro: toggleTimer, resetPomodoro } = useWorkLog();

  const resetToBreak = () => resetPomodoro('break');
  const resetToWork = () => resetPomodoro('work');

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-4 flex flex-col items-center">
      <Card className="p-8 w-full max-w-sm bg-card border-white/5 rounded-[3rem] relative overflow-hidden flex flex-col items-center shadow-lg">
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${mode === 'work' ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-teal-500'}`}></div>
        <Timer className={`w-8 h-8 ${mode === 'work' ? 'text-red-500' : 'text-emerald-500'} mb-4 opacity-80`} />
        <h3 className="font-bold text-xl mb-4">{mode === 'work' ? t('t_auto_157') : t('t_auto_158')}</h3>
        
        <div className="text-6xl font-black font-mono tracking-tighter text-foreground mb-8">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="flex gap-4">
          <Button 
            className={`w-28 rounded-2xl font-bold ${isActive ? 'bg-secondary hover:bg-secondary/80 text-foreground' : (mode === 'work' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600')}`}
            onClick={toggleTimer}
          >
            {isActive ? t('t_auto_159') : (mode === 'work' ? t('t_auto_160') : t('t_auto_161'))}
          </Button>
          <Button variant="outline" className={`w-24 rounded-2xl font-bold ${mode === 'break' ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`} onClick={mode === 'break' ? resetToWork : resetToBreak}>
            {mode === 'break' ? t('t_auto_162') : t('t_auto_163')}
          </Button>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground text-center">
        {t('t_auto_164')}
                    </p>
    </div>
  );
}

function ClassicAlarms() {
    const { t, lang } = useLanguage();
  const { alarms, addAlarm, toggleAlarm, deleteAlarm } = useWorkLog();
  
  const handleAddAlarm = () => {
    addAlarm({
      timing: 'before',
      anchor: 'start',
      minutes: 15,
      ringtone: 'default',
      enabled: true
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-card border-white/5 rounded-3xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Bell className="text-blue-500 w-5 h-5"/> {t('t_auto_165')}
                                </h3>
          <Button size="sm" variant="outline" className="rounded-xl h-8 border-blue-500/20 text-blue-500" onClick={handleAddAlarm}>
            <Plus className="w-4 h-4 ml-1" /> {t('t_auto_166')} 
                                </Button>
        </div>

        <div className="space-y-3">
          {alarms.length === 0 && (
             <div className="p-6 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
               {t('t_auto_167')}
                                       </div>
          )}
          {alarms.map(alarm => (
            <div key={alarm.id} className={`flex items-center justify-between p-4 bg-secondary/10 rounded-2xl border border-white/5 ${!alarm.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-4">
                <span className="text-xl font-black font-mono">
                   {alarm.anchor === 'start' ? t('t_auto_168') : alarm.anchor === 'end' ? t('t_auto_169') : t('t_auto_170')} 
                </span>
                <div>
                  <p className="font-bold text-sm">{alarm.minutes} {t('t_auto_171')}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="flex items-center gap-2">
                   <Switch checked={alarm.enabled} onCheckedChange={(checked) => toggleAlarm(alarm.id, checked)} />
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteAlarm(alarm.id)}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
