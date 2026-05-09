import React, { useState } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Button } from '../ui/button';
import { Settings, Users, LogIn, ChevronLeft } from 'lucide-react';
import AppLogo from '../ui/AppLogo';
import { useLanguage } from "@/contexts/LanguageContext";

export default function OnboardingView() {
    const { t, lang } = useLanguage();
  const { updateSettings, settings } = useWorkLog();
  const [step, setStep] = useState(1);
  const [system, setSystem] = useState(settings.system);
  const [hours, setHours] = useState(settings.dailyHours);

  const completeOnboarding = () => {
    updateSettings({
      ...settings,
      system,
      dailyHours: hours,
      onboardingCompleted: true,
      usageComplexity: system === 'freelance' ? 'advanced' : 'basic',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in zoom-in-95 duration-500" dir="rtl">
      <div className="max-w-md w-full bg-card rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-tr from-primary/20 to-emerald-500/20 shadow-sm border border-primary/20 rounded-full flex items-center justify-center p-4">
              <AppLogo className="w-full h-full text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold mb-1">Life Companion</h1>
              <p className="text-sm font-bold text-primary mb-4 uppercase tracking-widest text-[10px]">Work Log</p>
              <p className="text-muted-foreground text-sm">{t('t_auto_424')}</p>
            </div>
            <Button onClick={() => setStep(2)} className="w-full h-14 rounded-xl text-lg font-bold">
               {t('t_auto_425')} <ChevronLeft className="mr-2" />
            </Button>
          </div>
        )}

        {/* Step 2: System Type */}
        {step === 2 && (
          <div className="flex flex-col p-8 space-y-6">
            <h2 className="text-2xl font-bold">{t('t_auto_426')}</h2>
            <div className="space-y-4">
              <SelectCard 
                active={system === 'fixed'} 
                onClick={() => setSystem('fixed')}
                icon={<LogIn className="w-6 h-6" />}
                title={t('t_auto_427')} 
                desc={t('t_auto_428')} 
              />
              <SelectCard 
                active={system === 'shifts'} 
                onClick={() => setSystem('shifts')}
                icon={<Users className="w-6 h-6" />}
                title={t('t_auto_429')} 
                desc={t('t_auto_430')} 
              />
              <SelectCard 
                active={system === 'freelance'} 
                onClick={() => setSystem('freelance')}
                icon={<Settings className="w-6 h-6" />}
                title={t('t_auto_431')} 
                desc={t('t_auto_432')} 
              />
            </div>
            <Button onClick={() => setStep(3)} className="w-full h-14 rounded-xl text-lg font-bold">{t('t_auto_433')}</Button>
          </div>
        )}

        {/* Step 3: Base Hours & Finish */}
        {step === 3 && (
          <div className="flex flex-col p-8 space-y-6">
            <h2 className="text-2xl font-bold">{t('t_auto_434')}</h2>
            <p className="text-muted-foreground text-sm">{t('t_auto_435')}</p>
            
            <div className="flex items-center justify-center gap-6 py-6">
               <button onClick={() => setHours(Math.max(1, hours - 1))} className="w-12 h-12 rounded-full bg-secondary text-xl font-bold border border-white/5">-</button>
               <span className="text-4xl font-extrabold">{hours}</span>
               <button onClick={() => setHours(hours + 1)} className="w-12 h-12 rounded-full bg-secondary text-xl font-bold border border-white/5">+</button>
            </div>

            <p className="text-xs text-center text-muted-foreground mb-4">{t('t_auto_436')}</p>

            <Button onClick={completeOnboarding} className="w-full h-14 rounded-xl text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-black">
               {t('t_auto_437')}
                                      </Button>
          </div>
        )}

      </div>
    </div>
  );
}

function SelectCard({ active, onClick, icon, title, desc }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all border ${active ? 'border-primary bg-primary/10' : 'border-white/5 bg-secondary/50 hover:bg-secondary'}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-bold ${active ? 'text-primary' : ''}`}>{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}
