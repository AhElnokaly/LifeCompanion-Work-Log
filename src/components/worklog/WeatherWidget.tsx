import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { CloudRain, Sun, Cloud, Wind, Thermometer, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { weatherTips } from '../../lib/weatherTips';
import { useLanguage } from "@/contexts/LanguageContext";

interface WeatherWidgetProps {
  variant?: 'standalone' | 'inline';
  shiftStartHour?: number | null;
  shiftEndHour?: number | null;
}

export default function WeatherWidget({ variant = 'standalone', shiftStartHour, shiftEndHour }: WeatherWidgetProps) {
    const { t, lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<string>('');
  const [shiftSummary, setShiftSummary] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async (latitude: number, longitude: number) => {
      // Check cache first
      const cachedWeatherStr = localStorage.getItem('weather_cache');
      const cachedLoc = localStorage.getItem('weather_loc_cache');
      const isOnline = navigator.onLine !== false;
      
      if (cachedWeatherStr) {
         try {
           const parsedCache = JSON.parse(cachedWeatherStr);
           const age = Date.now() - parsedCache.timestamp;
           // Use cache if under 1 hr old, OR if offline and under 24 hr old
           if (age < 3600000 || (!isOnline && age < 86400000)) {
               const result = parsedCache.data;
               if (isMounted) {
                 setData(result);
                 if (cachedLoc) setLocationName(cachedLoc);
                 generateTip(result.current.weather_code, result.current.temperature_2m);
                 if (shiftStartHour !== undefined && shiftEndHour !== undefined && shiftStartHour !== null && shiftEndHour !== null) {
                    generateShiftSummary(result, shiftStartHour, shiftEndHour);
                 }
                 setLoading(false);
               }
               return; // Exit without fetching
           }
         } catch(e) {}
      }

      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=auto`);
        if (!res.ok) throw new Error('Network response was not ok');
        const result = await res.json();
        
        // Cache weather data for 48 hours
        localStorage.setItem('weather_cache', JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));

        let locName = null;
        try {
           const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ar`);
           if (geoRes.ok) {
              const geoData = await geoRes.json();
              locName = geoData.city || geoData.locality || geoData.principalSubdivision || t('t_auto_515');
              localStorage.setItem('weather_loc_cache', locName);
           }
        } catch (e) {}
        
        if (isMounted) {
          setData(result);
          if (locName) setLocationName(locName);
          generateTip(result.current.weather_code, result.current.temperature_2m);
          
          if (shiftStartHour !== undefined && shiftEndHour !== undefined && shiftStartHour !== null && shiftEndHour !== null) {
             generateShiftSummary(result, shiftStartHour, shiftEndHour);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          // Attempt to load from cache
          const cachedWeather = localStorage.getItem('weather_cache');
          const cachedLoc = localStorage.getItem('weather_loc_cache');
          
          if (cachedWeather) {
            try {
              const parsedCache = JSON.parse(cachedWeather);
              // Fallback cache logic if fetch fails
              const age = Date.now() - parsedCache.timestamp;
              if (age < 86400000) { // 24 hours fallback
                const result = parsedCache.data;
                setData(result);
                if (cachedLoc) setLocationName(cachedLoc);
                generateTip(result.current.weather_code, result.current.temperature_2m);
                
                if (shiftStartHour !== undefined && shiftEndHour !== undefined && shiftStartHour !== null && shiftEndHour !== null) {
                   generateShiftSummary(result, shiftStartHour, shiftEndHour);
                }
                setLoading(false);
                return; // Suppress error since we have cached data
              }
            } catch (e) {
               // ignore parse errors
            }
          }
          
          setError(t('t_auto_516'));
          setLoading(false);
        }
      }
    };

    if (!navigator.geolocation) {
       fetchWeather(30.0444, 31.2357); // Cairo fallback
       return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        fetchWeather(30.0444, 31.2357);
      }
    );

    return () => { isMounted = false; };
  }, [shiftStartHour, shiftEndHour]);

  const generateTip = (weatherCode: number, temp: number) => {
    let condition = 'clear';
    if (weatherCode >= 50 && weatherCode <= 69) condition = 'rain'; // drizzle / rain
    else if (weatherCode >= 70 && weatherCode <= 79) condition = 'snow'; // snow
    else if (weatherCode >= 80 && weatherCode <= 99) condition = 'rain'; // showers / thunderstorms
    else if (weatherCode === 45 || weatherCode === 48) condition = 'fog'; // fog
    else if (temp >= 35) condition = 'hot';
    else if (temp <= 10) condition = 'cold';

    const eligibleTips = weatherTips.filter(t => t.condition === condition);
    if (eligibleTips.length > 0) {
      const randomTip = eligibleTips[Math.floor(Math.random() * eligibleTips.length)].message;
      setTip(randomTip);
    } else {
      setTip(weatherTips.find(t => t.condition === 'clear')?.message || t('t_auto_517'));
    }
  };

  const generateShiftSummary = (result: any, start: number, end: number) => {
     let maxTemp = -100;
     let minTemp = 100;
     let rainExpected = false;
     
     let hoursToCheck = [];
     if (end >= start) {
        for (let i = start; i <= end; i++) hoursToCheck.push(i);
     } else {
        for (let i = start; i < 24; i++) hoursToCheck.push(i);
        for (let i = 0; i <= end; i++) hoursToCheck.push(i + 24);
     }

     for (let h of hoursToCheck) {
        const t = result.hourly.temperature_2m[h];
        if (t === undefined) continue;
        const code = result.hourly.weather_code[h];
        if (t > maxTemp) maxTemp = t;
        if (t < minTemp) minTemp = t;
        if (code >= 50 && code <= 99) rainExpected = true;
     }

     if (hoursToCheck.length > 0 && maxTemp > -100) {
        let summary = `سيرتراوح الطقس في ورديتك بين ${Math.round(minTemp)}° و ${Math.round(maxTemp)}°. `;
        if (rainExpected) summary += t('t_auto_518');
        else if (maxTemp > 35) summary += t('t_auto_519');
        else summary += t('t_auto_520');
        setShiftSummary(summary);
     }
  };

  const getWeatherIcon = (code: number, temp: number) => {
    if (code >= 50 && code <= 99) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code === 45 || code === 48) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (temp >= 35) return <Sun className="w-8 h-8 text-orange-500" />;
    if (temp <= 10) return <Thermometer className="w-8 h-8 text-teal-500" />;
    if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-yellow-500" />;
    return <Cloud className="w-8 h-8 text-gray-300" />;
  };

  const getWeatherLabel = (code: number, temp: number) => {
    if (code >= 50 && code <= 99) return t('t_auto_521');
    if (code === 45 || code === 48) return t('t_auto_522');
    if (temp >= 35) return t('t_auto_523');
    if (temp <= 10) return t('t_auto_524');
    if (code === 0 || code === 1) return t('t_auto_525');
    return t('t_auto_526');
  };

  if (loading) {
    if (variant === 'inline') {
       return <div className="flex justify-center mt-2 opacity-50"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>;
    }
    return (
      <Card className="m-4 p-4 border-white/5 bg-secondary/10 flex justify-center items-center h-28 rounded-[2rem] border-dashed">
         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error) {
    if (variant === 'inline') return null; // silently fail
    return (
      <Card className="m-4 p-4 border-white/5 bg-red-500/10 text-red-500 flex flex-col justify-center items-center h-28 rounded-[2rem] gap-2 text-center text-xs">
         <AlertCircle className="w-5 h-5" />
         {error}
      </Card>
    );
  }

  if (!data) return null;

  if (variant === 'inline') {
    return (
      <div className="flex flex-col w-full mt-3 group relative z-10 animate-in fade-in" dir="rtl">
        <div className="flex items-center justify-between w-full opacity-90 hover:opacity-100 transition-opacity p-2.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-sm">
           <div className="flex items-center gap-2 pl-3 border-l border-white/20">
             <div className="flex flex-col items-center">
               <span className="text-3xl font-black text-white tracking-tighter leading-none" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                  {Math.round(data.current.temperature_2m)}°
               </span>
               {locationName && <span className="text-[10px] text-white/80 font-medium mt-0.5">{locationName}</span>}
             </div>
             {React.cloneElement(getWeatherIcon(data.current.weather_code, data.current.temperature_2m), { className: "w-5 h-5 text-white drop-shadow-md" })}
           </div>
           
           <div className="text-right flex-1 pr-3">
             <p className="text-[10px] sm:text-xs font-medium text-white/95 leading-snug">
               {shiftSummary ? shiftSummary : tip}
             </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="mx-4 mb-24 mt-2 p-5 bg-card/60 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-lg relative overflow-hidden" dir="rtl">
      {/* Decorative gradient based on weather */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none ${data.current.temperature_2m > 30 ? 'bg-orange-500' : 'bg-blue-500'}`} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           {getWeatherIcon(data.current.weather_code, data.current.temperature_2m)}
           <div>
             <div className="flex items-baseline gap-1">
               <span className="text-3xl font-black">{Math.round(data.current.temperature_2m)}°</span>
               <span className="text-sm font-medium text-muted-foreground">{getWeatherLabel(data.current.weather_code, data.current.temperature_2m)}</span>
               {locationName && <span className="text-xs text-muted-foreground/60 mr-1">- {locationName}</span>}
             </div>
             <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
               <Wind className="w-3 h-3" /> {t('t_auto_527')} {Math.round(data.current.wind_speed_10m)} {t('t_auto_528')}
                                       </p>
           </div>
        </div>
        
        {/* Hourly small forecast */}
        <div className="flex gap-2">
           {[0, 2, 4].map((offset, i) => {
              const hourIndex = new Date().getHours() + offset;
              if (hourIndex >= 24 || !data.hourly.temperature_2m[hourIndex]) return null;
              return (
                <div key={i} className="flex flex-col items-center justify-center p-2 bg-secondary/30 rounded-xl min-w-[45px]">
                  <span className="text-[10px] text-muted-foreground mb-1">+{offset}{t('t_auto_9')}</span>
                  <span className="text-xs font-bold">{Math.round(data.hourly.temperature_2m[hourIndex])}°</span>
                </div>
              );
           })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex gap-2 items-start text-sm bg-primary/5 text-primary p-3 rounded-xl">
           <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
           <p className="font-medium leading-relaxed">{shiftSummary ? shiftSummary : tip}</p>
        </div>
      </div>
    </Card>
  );
}
