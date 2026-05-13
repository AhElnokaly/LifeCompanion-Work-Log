import React, { useState, useEffect } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CloudRain, Sun, Cloud, Snowflake, BatteryCharging, Coffee, CupSoda, Droplets, MapPin, Navigation, Zap, Activity, Edit3, Home, Headphones, Moon, Wind, Heart, Sunrise, Sunset } from 'lucide-react';
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
    // Attempt real weather fetching or fall back to cache/simulation
    const fetchRealWeather = async (lat: number, lon: number) => {
       try {
         const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m&timezone=auto`);
         if (!res.ok) throw new Error();
         const result = await res.json();
         localStorage.setItem('weather_cache', JSON.stringify({ data: result, timestamp: Date.now() }));
         let cond = 'Sunny';
         const code = result.current.weather_code;
         if (code >= 51 && code <= 67) cond = 'Rainy';
         else if (code >= 71 || code === 85 || code === 86) cond = 'Cold'; // Snow
         else if (code === 3 || code === 4 || code === 45 || code === 48) cond = 'Cloudy';

         setWeather({
           temp: Math.round(result.current.temperature_2m),
           max: Math.round(result.hourly?.temperature_2m?.[14] || result.current.temperature_2m + 2),
           min: Math.round(result.hourly?.temperature_2m?.[4] || result.current.temperature_2m - 5),
           condition: cond
         });
       } catch (err) {
         setWeather({ temp: 24, max: 27, min: 16, condition: 'Sunny' });
       }
    };

    const cachedWeather = localStorage.getItem('weather_cache');
    let useCache = false;
    
    // Check network status before attempting to fetch
    const isOnline = navigator.onLine !== false;
    
    if (cachedWeather) {
      try {
        const parsedCache = JSON.parse(cachedWeather);
        // If less than 1 hour old, OR we are offline and less than 24h old
        const cacheAge = Date.now() - parsedCache.timestamp;
        if (cacheAge < 3600000 || (!isOnline && cacheAge < 86400000)) {
          useCache = true;
          const result = parsedCache.data;
          
          let cond = 'Sunny';
          const code = result.current.weather_code;
          if (code >= 51 && code <= 67) cond = 'Rainy';
          else if (code >= 71 || code === 85 || code === 86) cond = 'Cold'; // Snow
          else if (code === 3 || code === 4 || code === 45 || code === 48) cond = 'Cloudy';

          setWeather({
            temp: Math.round(result.current.temperature_2m),
            max: Math.round(result.hourly?.temperature_2m?.[14] || result.current.temperature_2m + 2),
            min: Math.round(result.hourly?.temperature_2m?.[4] || result.current.temperature_2m - 5),
            condition: cond
          });
        }
      } catch(e) {}
    }

    if (!useCache) {
       if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(
           (pos) => fetchRealWeather(pos.coords.latitude, pos.coords.longitude),
           () => fetchRealWeather(30.0444, 31.2357)
         );
       } else {
         fetchRealWeather(30.0444, 31.2357);
       }
    }
    
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

  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 18;

  const getActiveHoliday = () => {
    const today = new Date().toISOString().split('T')[0];
    const holiday = settings.customHolidays?.find(h => h.date === today);
    return holiday ? holiday.name : null;
  };

  const activeHoliday = getActiveHoliday();

  const getBackgroundGradient = () => {
    if (activeHoliday) {
        if (activeHoliday.includes('رمضان')) return 'from-indigo-900 to-purple-800';
        if (activeHoliday.includes('عيد')) return 'from-emerald-600 to-teal-400';
        if (activeHoliday.includes('سنة')) return 'from-fuchsia-600 to-pink-500';
        return 'from-amber-500 to-orange-400';
    }
    if (isNight) {
        if (weather?.condition === 'Rainy') return 'from-slate-900 to-indigo-950';
        return 'from-indigo-900 to-slate-900';
    }
    if (!weather) return 'from-sky-300 to-sky-100';
    if (weather.condition === 'Rainy' || weather.condition === 'Snow') return 'from-slate-600 to-slate-400';
    if (weather.temp > 30) return 'from-orange-400 to-amber-200';
    if (weather.temp < 15 || weather.condition === 'Cold') return 'from-blue-300 to-cyan-100';
    return 'from-sky-400 to-sky-200';
  };

  const renderWeatherEffects = () => {
     if (!weather) return <div className="text-[12rem] absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 opacity-90 drop-shadow-2xl animate-in zoom-in duration-1000 leading-none">{isNight ? '🌙' : '☀️'}</div>;
     const cond = weather.condition;
     
     return (
       <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[2rem] z-0">
         {cond === 'Rainy' && (
           <div className="absolute inset-0 z-0 opacity-60 flex justify-around px-4">
              {Array.from({length: 30}).map((_, i) => (
                <div key={i} className="bg-sky-200/60 w-0.5 rounded-full" style={{
                   height: `${20 + Math.random() * 30}px`,
                   marginLeft: `${Math.random() * 10 - 5}px`,
                   animation: `rain-fall ${0.5 + Math.random() * 0.5}s infinite linear`,
                   animationDelay: `${Math.random()}s`
                }} />
              ))}
           </div>
         )}
         {cond === 'Sunny' && (
           <>
              {!isNight ? (
                <>
                  <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-yellow-400/40 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-orange-400/30 rounded-full blur-3xl" />
                </>
              ) : (
                <>
                  <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-purple-400/10 rounded-full blur-3xl" />
                </>
              )}
           </>
         )}
         {cond === 'Cold' && (
            <div className="absolute inset-0 z-0 opacity-80 flex justify-around px-4">
              {Array.from({length: 40}).map((_, i) => (
                <div key={i} className="bg-white rounded-full blur-[1px]" style={{
                   width: `${3 + Math.random() * 4}px`,
                   height: `${3 + Math.random() * 4}px`,
                   animation: `snow-fall ${3 + Math.random() * 2}s infinite linear`,
                   animationDelay: `${Math.random() * 2}s`
                }} />
              ))}
           </div>
         )}
         {cond === 'Cloudy' && (
            <div className="absolute inset-0 z-0 opacity-60">
              <div className="absolute top-4 left-10 text-6xl drop-shadow-lg opacity-80 animate-pulse">☁️</div>
              <div className="absolute top-12 right-20 text-7xl drop-shadow-lg opacity-60 animate-pulse" style={{ animationDelay: '2s'}}>☁️</div>
            </div>
         )}
         {/* Static Aesthetic Element */}
         <div className="text-[12rem] md:text-[14rem] absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/4 opacity-[0.85] drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 leading-none hover:scale-105 transition-transform">
            {isNight ? (
                cond === 'Rainy' ? '🌧️' : 
                cond === 'Cloudy' ? '☁️' : 
                cond === 'Cold' ? '❄️' : '🌙'
            ) : (
                cond === 'Sunny' ? '☀️' : 
                cond === 'Rainy' ? '🌧️' : 
                cond === 'Cloudy' ? '⛅' : 
                cond === 'Cold' ? '❄️' : '☀️'
            )}
         </div>
       </div>
     );
  };

  const health = activeSession ? (activeSession.healthMetrics || {}) : (localHealth || {});

  // Calculate Readiness Score (0-100)
  const getReadinessScore = () => {
     let score = 50; // base score
     if (health.sleepHours >= 7) score += 20;
     else if (health.sleepHours >= 5) score += 10;
     else if (health.sleepHours !== undefined) score -= 10; // penalty for low sleep

     // Steps contribution
     if (steps > 5000) score += 15;
     else if (steps > 2000) score += 5;

     // Hydration
     if (health.waterCups > 4) score += 10;

     // Mood
     if (health.moodDuring >= 4) score += 15;
     else if (health.moodDuring <= 2 && health.moodDuring !== undefined) score -= 10;

     return Math.min(Math.max(score, 10), 100);
  };

  const readinessScore = getReadinessScore();

  // Suggest a vibe based on combination
  const getMusicVibe = () => {
    const isHappy = health.moodDuring >= 4;
    const isSad = health.moodDuring <= 2 && health.moodDuring !== undefined;
    const cond = weather?.condition;
    
    if (cond === 'Rainy') return isHappy ? 'Lo-Fi Jazz ☕' : 'Acoustic Melancholy 🌧️';
    if (cond === 'Sunny') return isHappy ? 'Upbeat Pop & House ☀️' : 'Chill Vibes 🌱';
    if (cond === 'Cold') return 'Focus Ambience / Piano ❄️';
    return isHappy ? 'Deep Focus 🧠' : 'Calm Healing Soundscapes 🌬️';
  };

  return (
    <div className={`max-w-3xl mx-auto space-y-4 pb-20 px-4 mt-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Smart Weather Header - Sleek and Compact */}
      <div className={`relative w-full h-32 md:h-40 rounded-3xl overflow-hidden bg-gradient-to-r ${getBackgroundGradient()} shadow-lg flex items-center justify-between p-6`}>
        {renderWeatherEffects()}
        <div className={`z-10 ${isNight ? 'text-white' : 'text-sky-950'}`}>
          <div className="flex items-center gap-2 mb-1.5 opacity-90 drop-shadow-sm">
             <span className="text-sm font-medium">
                {hour >= 5 && hour < 12 ? 'صباح الخير' : 
                 hour >= 12 && hour < 17 ? 'طاب يومك' : 
                 hour >= 17 && hour < 20 ? 'مساء الخير' : 'تصبح على خير'}
             </span>
             {hour >= 5 && hour < 12 ? <Sunrise className="w-4 h-4" /> : 
              hour >= 12 && hour < 17 ? <Sun className="w-4 h-4" /> : 
              hour >= 17 && hour < 20 ? <Sunset className="w-4 h-4" /> : 
              <Moon className="w-4 h-4" />}
          </div>
          <div className="flex items-end gap-3 flex-row-reverse justify-end">
             <div className={`text-sm font-bold opacity-80 backdrop-blur-md px-3 py-1.5 rounded-2xl flex flex-col items-center shadow-sm ${isNight ? 'bg-black/30' : 'bg-white/30'}`}>
               <span>الصغرى {weather?.min ?? '--'}°</span>
               <span>الكبرى {weather?.max ?? '--'}°</span>
             </div>
             <div className="text-5xl font-black tracking-tighter drop-shadow-sm flex items-center gap-2">
               {weather?.temp ?? '--'}° 
             </div>
          </div>
        </div>
        
        <div className={`z-10 text-left backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm hidden sm:block max-w-[250px] ${isNight && !activeHoliday ? 'bg-black/40 border border-white/10' : 'bg-white/20 border border-white/30'}`}>
           <span className={`block text-sm font-bold opacity-90 mb-1 ${isNight && !activeHoliday ? 'text-blue-100' : 'text-sky-950'}`}>
             {activeHoliday ? `🎉 ${activeHoliday}` : 'نصيحة ذكية 💡'}
           </span>
           <span className={`text-xs font-medium block mb-1 ${isNight && !activeHoliday ? 'text-white' : 'text-sky-950'}`}>
              {activeHoliday ? `نحتفل معك بهذه المناسبة، نتمنى لك وقتاً ممتعاً وأياماً سعيدة!` : 
               weather?.temp !== undefined && weather.temp > 30 ? 'الجو حار، احرص على ترطيب مساحة عملك وشرب الماء باستمرار.' : 
               weather?.condition === 'Rainy' ? 'الجو ممطر بالخارج. يوم مثالي للتركيز وإنهاء المهام المعقدة!' : 
               weather?.temp !== undefined && weather.temp < 15 ? 'الطقس بارد، حافظ على دفء جسمك بمشروب ساخن.' :
               'طقس مثالي، خذ استراحة سريعة للمشي لتحفيز الإبداع.'}
           </span>
           {!activeHoliday && (
               <span className={`text-[10px] font-bold block px-2 py-1 rounded border mt-1 ${isNight ? 'bg-white/10 text-blue-200 border-white/10' : 'bg-white/30 text-sky-900 border-white/20'}`}>
                  👕 {weather?.temp !== undefined && weather.temp > 30 ? 'ملابس قطنية خفيفة، قمصان قصيرة الأكمام.' : 
                      weather?.condition === 'Rainy' ? 'جاكيت مقاوم للماء ومظلة، وملابس دافئة.' : 
                      weather?.temp !== undefined && weather.temp < 15 ? 'جاكيت ثقيل، طبقات صوفية، وربما وشاح للتدفئة.' :
                      weather?.temp !== undefined && weather.temp < 22 ? 'تيشيرت مع جاكيت خفيف أو بلوفر قطني القطع.' :
                      'ملابس ربيعية مريحة، طبقة واحدة تكفي.'
                     }
               </span>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Minimal Step Counter & Hydration */}
         <Card className="rounded-[2rem] border-border shadow-sm bg-card hover:shadow-md transition-all overflow-hidden relative sm:col-span-1 flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            <CardContent className="p-6 flex-1 flex flex-col">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2 text-primary font-bold">
                     <Activity className="w-5 h-5 text-emerald-500" />
                     مؤشر الجاهزية (Readiness)
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowStepInput(!showStepInput)} className="h-8 w-8 rounded-full hover:bg-secondary">
                     <Edit3 className="w-4 h-4 text-emerald-500" />
                  </Button>
               </div>
               
               <div className="flex items-center gap-6">
                  {/* Readiness & Steps */}
                  <div className="relative w-24 h-24 flex shrink-0 items-center justify-center">
                     {/* Outer Ring: Readiness */}
                     <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" className="stroke-secondary fill-none" strokeWidth="6" />
                        <circle cx="48" cy="48" r="40" className={`fill-none transition-all duration-1000 ease-in-out ${readinessScore >= 80 ? 'stroke-emerald-500' : readinessScore >= 50 ? 'stroke-amber-400' : 'stroke-red-500'}`} strokeWidth="6" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (readinessScore / 100))} strokeLinecap="round" />
                        {/* Inner Ring: Steps */}
                        <circle cx="48" cy="48" r="30" className="stroke-secondary/50 fill-none" strokeWidth="4" />
                        <circle cx="48" cy="48" r="30" className="stroke-primary fill-none transition-all duration-1000 ease-in-out" strokeWidth="4" strokeDasharray="188.4" strokeDashoffset={188.4 - (188.4 * Math.min(steps, 10000)) / 10000} strokeLinecap="round" />
                     </svg>
                     <div className="flex flex-col items-center">
                        <span className="text-xl font-black" style={{color: readinessScore >= 80 ? '#10b981' : readinessScore >= 50 ? '#fbbf24' : '#ef4444'}}>{readinessScore}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">score</span>
                     </div>
                  </div>
                  
                  {/* Quick-add grid */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                     <div className="bg-blue-500/5 rounded-xl p-2 border border-blue-500/10 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/10 transition-colors" onClick={() => handleHealthUpdate('waterCups', 1)}>
                        <Droplets className="w-4 h-4 text-blue-500 mb-1" />
                        <span className="text-sm font-black">{health.waterCups || 0}</span>
                     </div>
                     <div className="bg-amber-800/5 rounded-xl p-2 border border-amber-800/10 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-800/10 transition-colors" onClick={() => handleHealthUpdate('coffeeCups', 1)}>
                        <Coffee className="w-4 h-4 text-amber-800 mb-1" />
                        <span className="text-sm font-black">{health.coffeeCups || 0}</span>
                     </div>
                  </div>
               </div>

               <div className="mt-4 text-xs font-bold text-center text-muted-foreground flex items-center justify-center gap-1">
                 الخطوات: {steps > 1000 ? (steps/1000).toFixed(1) + 'k' : steps} / 10k
               </div>

               {showStepInput && (
                 <div className="flex w-full items-center gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                   <input 
                     type="number" value={customSteps} onChange={(e) => setCustomSteps(e.target.value)}
                     placeholder="إضافة خطوات..." className="flex-1 h-10 rounded-xl bg-secondary/50 px-3 text-sm font-bold outline-none" dir="ltr"
                   />
                   <Button onClick={submitCustomSteps} className="h-10 rounded-xl px-4 text-xs font-bold">حفظ</Button>
                 </div>
               )}
            </CardContent>
         </Card>

         {/* Compact Location, Sleep & Mood */}
         <Card className="rounded-[2rem] border-border shadow-sm bg-card hover:shadow-md transition-all sm:col-span-1 flex flex-col h-full">
            <CardContent className="p-6 flex-1 flex flex-col">
               <div className="flex items-center gap-2 text-primary font-bold mb-4">
                  <Heart className="w-5 h-5 text-rose-500" />
                  التركيز والحالة المادية
               </div>
               
               <div className="space-y-4 flex-1">
                  <div className="flex gap-4">
                     <div className="w-1/2">
                       <p className="text-[10px] text-muted-foreground font-bold mb-1.5 flex items-center gap-1"><Moon className="w-3 h-3 text-indigo-400"/> ساعات النوم</p>
                       <div className="flex gap-1.5 bg-secondary/30 p-1 rounded-xl overflow-hidden h-9">
                          {[5, 6, 7, 8].map(h => (
                             <button
                                key={h}
                                className={`flex-1 flex items-center justify-center text-xs font-bold transition-all rounded-lg ${health.sleepHours === h || (h === 8 && health.sleepHours >= 8) || (h===5 && health.sleepHours <= 5 && health.sleepHours !== undefined) ? 'bg-indigo-500 text-white shadow-sm' : 'hover:bg-indigo-500/10'}`}
                                onClick={() => handleHealthUpdate('sleepHours', h)}
                             >
                               {h}{h === 8 ? '+' : ''}
                             </button>
                          ))}
                       </div>
                     </div>
                     <div className="w-1/2">
                        <p className="text-[10px] text-muted-foreground font-bold mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" /> موقع العمل</p>
                        <div className="flex gap-1.5 h-9">
                            {['office', 'home'].map((loc: any) => (
                              <button 
                                  key={loc}
                                  className={`rounded-xl flex-1 font-bold text-xs flex items-center justify-center transition-all ${activeSession?.location === loc ? 'shadow-md bg-emerald-500 text-white border border-emerald-500' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary'}`}
                                  onClick={() => {
                                     if(!activeSession) return toast.error("ابدأ الجلسة لتحديد موقع العمل");
                                     updateSession(activeSession.id, { location: loc });
                                  }}
                              >
                                  {loc === 'office' ? '🏢 المكتب' : '🏠 المنزل'}
                              </button>
                            ))}
                        </div>
                     </div>
                  </div>

                  <div>
                     <p className="text-[10px] text-muted-foreground font-bold mb-1.5 mt-2">الطاقة والمزاج اليوم</p>
                     <div className="flex justify-between bg-secondary/30 p-1.5 rounded-2xl border border-border/50">
                        {[1,2,3,4,5].map(level => (
                           <button
                              key={level}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-300 ${health.moodDuring === level ? 'bg-white shadow-sm scale-110 ring-1 ring-border' : 'hover:scale-110 opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}`}
                              onClick={() => setMood(level)}
                           >
                              {level === 1 ? '😫' : level === 2 ? '😔' : level === 3 ? '😐' : level === 4 ? '🙂' : '🤩'}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Music Vibes */}
         <Card className="rounded-[2rem] border-transparent shadow-sm bg-gradient-to-br from-rose-500/10 to-orange-500/10">
            <CardContent className="p-5 flex items-center gap-4">
               <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-tr from-rose-500 to-orange-500 shadow-lg shadow-orange-500/20 flex items-center justify-center text-white shrink-0">
                  <Headphones className="w-6 h-6" />
               </div>
               <div className="flex flex-col">
                  <span className="text-xs text-rose-600 font-bold mb-0.5">اقتراح الموسيقى الذكي 🎵</span>
                  <span className="font-black text-foreground">{getMusicVibe()}</span>
               </div>
            </CardContent>
         </Card>

         {/* Deep Breath Micro-interaction */}
         <Card className="rounded-[2rem] border-transparent shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:shadow-md transition-all cursor-pointer" onClick={() => {
             toast('خذ نفساً عميقاً... 😮‍💨', { duration: 4000, position: 'top-center' });
             setTimeout(() => toast('احتفظ بالهواء قليلاً...', { duration: 4000, position: 'top-center' }), 4000);
             setTimeout(() => toast('زفير بهدوء... 😌', { duration: 4000, position: 'top-center' }), 8000);
         }}>
            <CardContent className="p-5 flex items-center gap-4">
               <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-teal-500/20 flex items-center justify-center text-white shrink-0">
                  <Wind className="w-6 h-6 animate-pulse" />
               </div>
               <div className="flex flex-col">
                  <span className="text-xs text-emerald-600 font-bold mb-0.5">تصفية الذهن لمدة دقيقة</span>
                  <span className="font-black text-foreground text-sm">اضغط هنا للتنفس العميق</span>
               </div>
            </CardContent>
         </Card>
      </div>
      
      {/* Quick Commute */}
      <Card className="rounded-[2rem] border-transparent shadow-sm bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
         <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                  <Navigation className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <span className="font-bold text-sm">سجل الانتقالات</span>
                  <span className="text-[10px] text-muted-foreground">يحسب المحرك مسافتك آلياً، لكن تستطيع تحديد البداية والنهاية</span>
               </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <Button size="sm" variant={health.commuteStartTime ? 'outline' : 'default'} className="rounded-xl flex-1 sm:flex-auto font-bold h-9" onClick={() => {
                  if(!health.commuteStartTime) handleHealthUpdate('commuteStartTime', new Date().toISOString());
               }}>
                  {health.commuteStartTime ? '✓ تم الخروج' : 'تسجيل الخروج'}
               </Button>
               <Button size="sm" variant={health.commuteEndTime ? 'outline' : 'default'} className="rounded-xl flex-1 sm:flex-auto font-bold h-9 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => {
                  if(!health.commuteStartTime) return toast.error("سجل الخروج أولاً");
                  if(!health.commuteEndTime) handleHealthUpdate('commuteEndTime', new Date().toISOString());
               }}>
                  {health.commuteEndTime ? '✓ تم الوصول' : 'تسجيل الوصول'}
               </Button>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
