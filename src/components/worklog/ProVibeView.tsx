import React, { useState, useEffect } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CloudRain, Sun, Cloud, Snowflake, BatteryCharging, Coffee, CupSoda, Droplets, MapPin, Navigation, Zap, Activity, Edit3, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

export default function ProVibeView() {
  const { settings, updateSettings, activeSession, updateSession } = useWorkLog();
  const { t, lang } = useLanguage();
  const [weather, setWeather] = useState<{ temp: number, max: number, min: number, condition: string } | null>(null);
  const [steps, setSteps] = useState(0);
  const [customSteps, setCustomSteps] = useState('');
  const [localHealth, setLocalHealth] = useState<any>({});
  const [showStepInput, setShowStepInput] = useState(false);

  // Automatic Steps Logic
  useEffect(() => {
    // Simulated background reading or Pedometer API
    let interval: any;
    if (activeSession && settings.isPro) {
      interval = setInterval(() => {
        // Automatically add steps based on location if not home
        if (activeSession.location !== 'home') {
          const simulatedWalking = Math.floor(Math.random() * 20); // 0-20 steps per 10s
          if (simulatedWalking > 0) {
             setSteps(s => {
               const ns = s + simulatedWalking;
               localStorage.setItem('pro_steps', ns.toString());
               return ns;
             });
          }
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [activeSession, settings.isPro]);

  // Inactivity Reminder
  useEffect(() => {
    let inactivityTimer: any;
    if (activeSession && settings.isPro) {
      inactivityTimer = setTimeout(() => {
        toast('انتبه! لم تقم بالحركة منذ فترة، ما رأيك والمشي قليلاً لتجديد نشاطك؟', {
           icon: '🚶‍♂️'
        });
      }, 30 * 60 * 1000); // 30 minutes of no steps increment (if component mounts and stays)
      // Since this is a simple simulation, it resets when `steps` change
    }
    return () => clearTimeout(inactivityTimer);
  }, [steps, activeSession, settings.isPro]);

  // Initial Data
  useEffect(() => {
    // Simulated Weather Fetching
    setWeather({
      temp: 24,
      max: 27,
      min: 16,
      condition: 'Sunny' // or Rainy, Cold, Cloudy
    });
    
    // Simulate reading steps from pseudo-API or local storage
    const storedSteps = parseInt(localStorage.getItem('pro_steps') || '0', 10);
    setSteps(storedSteps);

    const today = new Date().toISOString().split('T')[0];
    const key = `health_${today}`;
    setLocalHealth(JSON.parse(localStorage.getItem(key) || '{}'));
  }, []);

  // Activate Pro feature
  if (!settings.isPro) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[70vh] text-center p-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-500/20 mb-8 animate-bounce">
          <Zap className="w-12 h-12 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-black mb-4">النسخة الاحترافية (Pro Vibe)</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          تفاعل أذكى مع يومك! شخصية (Avatar) تتأثر بالطقس، متتبع ذكي للخطوات، تنبيهات لشرب الماء، وتسجيل دقيق لتفاصيل رحلتك للعمل وحالتك المزاجية.
        </p>
        <Button 
          onClick={() => updateSettings({ ...settings, isPro: true } as any)}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full h-14 px-8 text-lg font-bold shadow-lg shadow-orange-500/30"
        >
          تفعيل النسخة الـ Pro مجاناً
        </Button>
      </div>
    );
  }

  const incrementSteps = (amount: number) => {
    const newSteps = steps + amount;
    setSteps(newSteps);
    localStorage.setItem('pro_steps', newSteps.toString());
  };

  const submitCustomSteps = () => {
    const val = parseInt(customSteps, 10);
    if (!isNaN(val) && val > 0) {
      incrementSteps(val);
      setCustomSteps('');
      setShowStepInput(false);
      toast.success(`تم إضافة ${val} خطوة بنجاح!`);
    } else {
      toast.error('يرجى إدخال رقم صحيح');
    }
  };

  const handleHealthUpdate = (field: string, increment: any) => {
     let currentVal = undefined;
     if (activeSession) {
        const currentMetrics = activeSession.healthMetrics || {
           waterCups: 0, coffeeCups: 0, teaCups: 0, steps: 0, moodBefore: 0, moodDuring: 0, moodAfter: 0, energyLevel: 0, ateLunch: false
        };
        const newVal = typeof increment === 'number' ? ((currentMetrics as any)[field] || 0) + increment : increment;
        currentVal = newVal;
        updateSession(activeSession.id, {
           healthMetrics: {
              ...currentMetrics,
              [field]: newVal
           }
        });
        toast.success("تم التسجيل خلال الجلسة");
     } else {
        const newVal = typeof increment === 'number' ? (localHealth[field] || 0) + increment : increment;
        currentVal = newVal;
        const updated = { ...localHealth, [field]: newVal };
        setLocalHealth(updated);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`health_${today}`, JSON.stringify(updated));
        toast.success("تم التسجيل لليوم (لم تبدأ جلسة عمل)");
     }
  };

  const setMood = (level: number) => {
     if (activeSession) {
        const currentMetrics = activeSession.healthMetrics || {};
        updateSession(activeSession.id, {
           healthMetrics: {
              ...currentMetrics,
              moodDuring: level,
              energyLevel: level * 2 // simplified sync
           }
        });
        toast.success("تم تحديث الحالة");
     } else {
        const updated = { ...localHealth, moodDuring: level, energyLevel: level * 2 };
        setLocalHealth(updated);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`health_${today}`, JSON.stringify(updated));
        toast.success("تم تحديث الحالة لليوم");
     }
  };

  // Avatar determination
  const getCharacterState = () => {
     let clothes = '👕';
     let face = '😎';
     let accessory = '💼';
     
     if (steps > 5000 && (!weather || weather.temp < 30)) { face = '🥵'; clothes = '🎽'; accessory = '👟'; }
     else if (weather) {
        if (weather.temp > 30) { face = '🥵'; clothes = '👕'; accessory = '🕶️'; }
        else if (weather.condition === 'Rainy') { face = '🥶'; clothes = '🧥'; accessory = '☔'; }
        else if (weather.temp < 15) { face = '🥶'; clothes = '🧥'; accessory = '🧣'; }
     }
     
     const hasEaten = activeSession?.healthMetrics?.ateLunch || localHealth?.ateLunch;
     if (hasEaten) face = '😋';

     return { face, clothes, accessory };
  };

  const health = activeSession ? (activeSession.healthMetrics || {}) : (localHealth || {});
  const char = getCharacterState();

  const getBackgroundGradient = () => {
    if (!weather) return 'from-sky-300 to-sky-100';
    if (weather.condition === 'Rainy') return 'from-slate-500 to-slate-400';
    if (weather.temp > 30) return 'from-orange-400 to-amber-200';
    if (weather.temp < 15) return 'from-blue-300 to-cyan-100';
    return 'from-sky-400 to-sky-200';
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 pb-20 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Immersive Weather & Avatar Header */}
      <div className={`relative w-full h-[45vh] rounded-b-[3rem] overflow-hidden bg-gradient-to-b ${getBackgroundGradient()} shadow-lg`}>
        {/* Decorative elements */}
        {weather?.condition === 'Sunny' && (
           <div className="absolute top-10 right-10 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
        )}
        
        {/* Weather Info */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start text-sky-950">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 opacity-70" />
              <span className="font-bold text-lg opacity-90">سان ستيفانو</span>
            </div>
            <div className="text-6xl font-black tracking-tighter drop-shadow-sm">
              {weather?.temp}°
            </div>
            <p className="text-lg font-medium opacity-80 backdrop-blur-sm bg-white/20 px-3 py-1 rounded-full mt-2 inline-block">
              {weather?.condition === 'Sunny' ? 'مشمس وحيوي' : weather?.condition === 'Rainy' ? 'ممطر وغائم' : 'غائم جزئياً'}
            </p>
          </div>
          
          <div className="text-right">
             <div className="text-sm font-bold opacity-80 backdrop-blur-sm bg-white/20 px-3 py-2 rounded-2xl shadow-sm">
               <div className="mb-1 text-sky-950">الصغرى {weather?.min}°</div>
               <div className="text-sky-950">الكبرى {weather?.max}°</div>
             </div>
          </div>
        </div>

        {/* Character Avatar (The "Main Character") */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end z-10 w-full h-full pb-6">
           <div className="relative animate-in slide-in-from-bottom flex flex-col items-center duration-1000">
             {/* Character made of Emojis */}
             <div className="text-7xl mb-[-15px] z-20 drop-shadow-md">{char.face}</div>
             <div className="text-[7rem] z-10 drop-shadow-lg leading-none">{char.clothes}</div>
             {/* Accessory/Item */}
             <div className="absolute top-1/2 -right-6 text-5xl z-30 drop-shadow-md origin-bottom-left animate-pulse">
                {char.accessory}
             </div>
             
             {/* Character Ground Shadow */}
             <div className="w-24 h-5 bg-black/15 rounded-[100%] mt-2 blur-[5px]"></div>
           </div>
        </div>
        
        {/* Ground level elements / landscape */}
        <div className="absolute bottom-0 w-full h-1/4 bg-gradient-to-t from-emerald-500/30 to-transparent backdrop-blur-sm" />
      </div>

      <div className="px-4 space-y-6 -mt-12 relative z-20">
        
        {/* Step Counter */}
        <Card className="rounded-[2rem] border-transparent shadow-xl bg-card">
           <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                 <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    مقياس الخطوات والنشاط
                 </div>
                 <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full font-bold">
                    المستوى: {steps > 8000 ? '🔥 محترف' : steps > 4000 ? '⚡ نشيط' : '🌱 مبتدئ'}
                 </div>
              </CardTitle>
           </CardHeader>
           <CardContent className="flex flex-col items-center pt-2">
              <div className="relative w-40 h-40 flex items-center justify-center">
                 <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" className="stroke-muted fill-none" strokeWidth="12" />
                    <circle cx="80" cy="80" r="70" className="stroke-emerald-500 fill-none" strokeWidth="12" strokeDasharray="439.8" strokeDashoffset={439.8 - (439.8 * Math.min(steps, 10000)) / 10000} strokeLinecap="round" />
                 </svg>
                 <div className="flex flex-col items-center text-center">
                    <span className="text-4xl font-black text-foreground">{steps}</span>
                    <span className="text-xs text-muted-foreground font-bold">/ 10,000 خطوة</span>
                 </div>
              </div>
              
              {!showStepInput ? (
                <div className="flex justify-center gap-2 mt-6 w-full">
                   <Button variant="outline" className="flex-1 rounded-xl font-bold bg-secondary/50 border-border shadow-sm text-foreground hover:bg-secondary" onClick={() => setShowStepInput(true)}>
                     <Edit3 className="w-4 h-4 ml-2" /> إدخال مسافة / خطوات 
                   </Button>
                </div>
              ) : (
                <div className="flex w-full items-center gap-2 mt-6 animate-in slide-in-from-bottom-2">
                  <input 
                    type="number"
                    value={customSteps}
                    onChange={(e) => setCustomSteps(e.target.value)}
                    placeholder="الخطوات..."
                    className="flex-1 h-11 rounded-xl bg-secondary/50 px-4 text-center text-lg font-bold outline-none ring-2 ring-transparent focus:ring-primary/50 transition-all font-mono"
                    dir="ltr"
                  />
                  <Button onClick={submitCustomSteps} className="h-11 rounded-xl px-6 font-bold shadow-md">إضافة</Button>
                  <Button variant="ghost" onClick={() => setShowStepInput(false)} className="h-11 rounded-xl">إلغاء</Button>
                </div>
              )}
           </CardContent>
        </Card>

        {/* Primary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Commute Tracking */}
           <Card className="rounded-[2rem] border-transparent shadow-xl bg-card">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <Navigation className="w-5 h-5 text-indigo-500" />
                    رحلة العمل والانتقالات
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50 gap-4 transition-all hover:bg-secondary/50">
                       <div className="flex w-full sm:w-auto items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                             <MapPin className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">الخروج من المنزل</p>
                             <p className="text-xs text-muted-foreground">{health.commuteStartTime ? new Date(health.commuteStartTime).toLocaleTimeString(['ar-EG', 'en-US'], {hour: 'numeric', minute:'2-digit'}) : 'لم يتم التسجيل'}</p>
                          </div>
                       </div>
                       <Button variant="outline" className="w-full sm:w-auto rounded-xl shadow-sm font-bold bg-background" onClick={() => {
                          handleHealthUpdate('commuteStartTime', new Date().toISOString());
                          toast.success('تم تسجيل بدء الرحلة. قم بتحديث خطواتك حين تصل!');
                          if (!showStepInput) setShowStepInput(true);
                       }}>
                          تسجيل الخروج
                       </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border/50 gap-4 transition-all hover:bg-secondary/50">
                       <div className="flex w-full sm:w-auto items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                             <Home className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                             <p className="text-sm font-bold">العودة للمنزل</p>
                             <p className="text-xs text-muted-foreground">{health.commuteEndTime ? new Date(health.commuteEndTime).toLocaleTimeString(['ar-EG', 'en-US'], {hour: 'numeric', minute:'2-digit'}) : 'لم يتم التسجيل'}</p>
                          </div>
                       </div>
                       <Button variant="outline" className="w-full sm:w-auto rounded-xl shadow-sm font-bold bg-background" onClick={() => {
                          if(!health.commuteStartTime) return toast.error("سجل موعد الخروج أولاً");
                          handleHealthUpdate('commuteEndTime', new Date().toISOString());
                          toast.success('تم تسجيل الوصول بالسلامة. حدث عدد خطواتك الإجمالي!');
                          if (!showStepInput) setShowStepInput(true);
                       }}>
                          تسجيل الوصول
                       </Button>
                    </div>
                 </div>
                 <p className="text-[10px] text-muted-foreground text-center mt-4">
                    ستظهر لك شاشة تعديل الخطوات تلقائياً عند تسجيل الدخول أو الخروج لتسهيل تتبع المسافة.
                 </p>
              </CardContent>
           </Card>

           {/* Hydration */}
           <Card className="rounded-[2rem] border-transparent shadow-xl bg-card">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    ترطيب الجسم والمشروبات
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2">
                       <div 
                          className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-blue-500/20 transition-colors border border-blue-500/20 shadow-sm"
                          onClick={() => handleHealthUpdate('waterCups', 1)}
                       >
                          <CupSoda className="w-8 h-8 text-blue-500" />
                       </div>
                       <span className="text-2xl font-black text-foreground">{health.waterCups || 0}</span>
                       <span className="text-[10px] text-muted-foreground font-bold">أكواب ماء</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                       <div 
                          className="w-16 h-16 bg-amber-800/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-amber-800/20 transition-colors border border-amber-800/20 shadow-sm"
                          onClick={() => handleHealthUpdate('coffeeCups', 1)}
                       >
                          <Coffee className="w-8 h-8 text-amber-800" />
                       </div>
                       <span className="text-2xl font-black text-foreground">{health.coffeeCups || 0}</span>
                       <span className="text-[10px] text-muted-foreground font-bold">قهوة</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                       <div 
                          className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-emerald-600/20 transition-colors border border-emerald-600/20 shadow-sm"
                          onClick={() => handleHealthUpdate('teaCups', 1)}
                       >
                          <CupSoda className="w-8 h-8 text-emerald-600" />
                       </div>
                       <span className="text-2xl font-black text-foreground">{health.teaCups || 0}</span>
                       <span className="text-[10px] text-muted-foreground font-bold">شاي/أعشاب</span>
                    </div>
                 </div>
                 <div className="mt-6">
                    <Button 
                      className={`w-full rounded-xl font-bold h-12 transition-all shadow-md ${health.ateLunch ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                      variant={health.ateLunch ? 'default' : 'secondary'}
                      onClick={() => handleHealthUpdate('ateLunch', !health.ateLunch)}
                    >
                       {health.ateLunch ? '✓ تم تناول وجبة الغداء' : 'تسجيل تناول الغداء (راحة)'}
                    </Button>
                 </div>
                 {weather && weather.temp > 25 && (
                    <div className="mt-4 p-3 bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold rounded-xl flex items-center gap-2">
                       <Droplets className="w-4 h-4 shrink-0" /> الجو حار اليوم، تذكر شرب المزيد من الماء! تم تفعيل التذكير كل 30 دقيقة.
                    </div>
                 )}
              </CardContent>
           </Card>

           {/* Mood Tracking & Location */}
           <Card className="rounded-[2rem] border-transparent shadow-xl bg-card md:col-span-2">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <BatteryCharging className="w-5 h-5 text-purple-500" />
                    الحالة والمكان
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <p className="text-right text-sm font-bold mb-3">كيف تشعر أثناء العمل اليوم؟</p>
                       <div className="flex justify-between md:justify-start md:gap-4 bg-secondary/20 p-2 md:p-3 rounded-2xl border border-secondary/50">
                          {[1,2,3,4,5].map(level => (
                             <button
                                key={level}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${health.moodDuring === level ? 'bg-purple-500 text-white scale-110 shadow-lg shadow-purple-500/30' : 'bg-transparent hover:bg-secondary'}`}
                                onClick={() => setMood(level)}
                             >
                                {level === 1 ? '😫' : level === 2 ? '😔' : level === 3 ? '😐' : level === 4 ? '🙂' : '🤩'}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="border-t md:border-t-0 md:border-r border-border/50 pt-6 md:pt-0 md:pr-6">
                       <p className="text-right text-sm font-bold mb-3">موقع العمل الآن</p>
                       <div className="grid grid-cols-2 gap-2 text-sm">
                          {['office', 'home', 'client', 'mission'].map((loc: any) => (
                             <Button 
                                key={loc} 
                                variant={activeSession?.location === loc ? 'default' : 'outline'}
                                className={`rounded-xl h-12 font-bold ${activeSession?.location === loc ? 'shadow-md shadow-primary/20' : 'bg-secondary/30 border-transparent hover:bg-secondary'}`}
                                onClick={() => {
                                   if(!activeSession) return toast.error("ابدأ الجلسة لتحديد موقع العمل");
                                   updateSession(activeSession.id, { location: loc });
                                   toast.success("تم تحديث موقع العمل");
                                }}
                             >
                                {loc === 'office' ? '🏢 المكتب' : loc === 'home' ? '🏠 المنزل' : loc === 'client' ? '🤝 عميل' : '🚗 مأمورية'}
                             </Button>
                          ))}
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
