import React, { useState, useMemo } from 'react';
import { useAICore } from '../../contexts/AICoreContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Brain, Send, Sparkles, TrendingUp, AlertCircle, Activity, Coffee } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { useLanguage } from "@/contexts/LanguageContext";

export default function AICore() {
    const { t, lang } = useLanguage();
  const { askAI, isLoading } = useAICore();
  const { sessions, projects, settings } = useWorkLog();
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: t('t_auto_1') }
  ]);

  // ==========================================
  // AI Core Metrics & Burnout Analysis Engine
  // ==========================================
  // This engine analyzes the raw session data to provide context to the AI model
  // about the user's workload, stress levels, and financial performance.
  const analytics = useMemo(() => {
    // 1. Lifetime Overtime Metrics: Tracks the total accumulated overtime minutes.
    // Purpose: High total overtime over long periods indicates chronic overworking patterns.
    let totalOvertimeMins = 0;
    
    // 2. Continuous Streak: Tracks the number of consecutive calendar days the user has logged work.
    // Purpose: Working without rest days is a primary driver of burnout.
    let daysWorkedInRow = 0;
    
    // 3. Rest Day Violations: Counts how many times the user worked on a designated weekend/rest day.
    // Purpose: Helps the AI advise the user to respect their boundaries and detach from work.
    let workedRestDays = 0;
    
    // Sort sessions in chronological ascending order for streak calculations
    const sorted = [...sessions].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    
    // 4. Current Week Hours: Accumulates duration (in hours) of all sessions in the current week.
    // Purpose: Assesses short-term acute workload (e.g., pulling a 60-hour week).
    let currentWeekHours = 0;

    if (sorted.length > 0) {
      // Calculate consecutive days
      let lastDate = new Date(sorted[sorted.length - 1].startTime);
      daysWorkedInRow = 1;
      
      for (let i = sorted.length - 2; i >= 0; i--) {
        const currentDate = new Date(sorted[i].startTime);
        const dayDiff = differenceInDays(lastDate, currentDate);
        
        if (dayDiff === 0) continue; // Same day session
        if (dayDiff === 1) {
          daysWorkedInRow++;
          lastDate = currentDate;
        } else {
          break; // Streak broken
        }
      }
    }

    sorted.forEach(s => {
      totalOvertimeMins += (s.overtimeMinutes || 0);
      if (s.isRestDayWork) workedRestDays++;

      const sd = new Date(s.startTime);
      if (sd >= weekStart && sd <= weekEnd) {
        currentWeekHours += (s.duration || 0) / 60;
      }
    });

    // ==========================================
    // Burnout Heuristic Algorithm
    // ==========================================
    // Determines a simple qualitative risk based on acute and chronic fatigue indicators.
    let burnoutRisk = t('t_auto_2');
    
    // Critical Risk (حرج جداً): 
    // Triggered if the user has worked 10+ consecutive days (chronic) OR > 55 hours this week (acute).
    if (daysWorkedInRow >= 10 || currentWeekHours >= 55) {
      burnoutRisk = t('t_auto_3');
    } 
    // High Risk (مرتفع): 
    // Triggered if the user has worked 6+ consecutive days (missed a weekend) OR > 45 hours this week.
    else if (daysWorkedInRow >= 6 || currentWeekHours >= 45) {
      burnoutRisk = t('t_auto_4');
    }

    // 5. Total Revenue (Financial Metric):
    // Purpose: Evaluates freelance/project-based earnings by multiplying duration by the project's hourly rate.
    // This gives the AI context to balance "financial success" vs "human burnout".
    let totalRevenue = 0;
    sorted.forEach(s => {
      if (s.projectId) {
         const p = projects.find(proj => proj.id === s.projectId);
         if (p && p.hourlyRate) {
            totalRevenue += ((s.duration || 0) / 60) * p.hourlyRate;
         }
      }
    });

    return { totalOvertimeMins, daysWorkedInRow, workedRestDays, currentWeekHours, burnoutRisk, totalRevenue };
  }, [sessions, projects]);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    
    const userMsg = prompt;
    setPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    
    const enhancedPrompt = `
      سؤال المستخدم: "${userMsg}"
      
      -- السياق الحالي للمستخدم --
      إعدادات العمل: نظام (${settings.system}) بمعدل ساعات (${settings.dailyHours}س)
      تعقيد الاستخدام: ${settings.usageComplexity}
      إجمالي إضافي كل الأوقات (بالدقائق): ${analytics.totalOvertimeMins}
      أيام العمل المتتالية الحالية: ${analytics.daysWorkedInRow}
      خطر الاحتراق الوظيفي: ${analytics.burnoutRisk}
      ساعات العمل هذا الأسبوع: ${analytics.currentWeekHours}
      عدد مرات العمل في أيام العطلات: ${analytics.workedRestDays}
      تقدير الأرباح للمهام المستقلة (جنيهاً): ${analytics.totalRevenue.toFixed(1)}
      الرجاء ذكر هذه الأرباح بشكل إيجابي إذا سأل المستخدم عن أموره المالية.
      
      -- التعليمات --
      1. أجب باللغة العربية بأسلوب احترافي وودود.
      2. كُن مستشاراً داعماً للإنتاجية. إذا كان خطر الاحتراق "حرج جداً" أو "مرتفع"، انصح المستخدم بشدة بالراحة.
      3. لا تذكر القيم الفنية مثل JSON أو أسماء المتغيرات، تحدث بشكل طبيعي.
      4. كن موجزاً وركز على سؤال المستخدم مستفيداً من السياق المقدم.
      5. إذا سألك المستخدم سؤالاً حول استخدام التطبيق أو مشكلة تواجهه ولا ولم تتمكن من إجابته بشكل واضح ومؤكد، أجب فقط بالنص التالي: SUGGEST_WHATSAPP
    `;
    
    const response = await askAI(enhancedPrompt);
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" /> {t('t_auto_5')}
                          </h2>
        <p className="text-muted-foreground">{t('t_auto_6')}</p>
      </div>

      {/* Burnout Tracker Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-4 rounded-2xl flex flex-col items-center justify-center border-white/5 border-l-4 ${analytics.burnoutRisk === t('t_auto_3') ? 'bg-red-500/10 border-l-red-500 animate-pulse' : analytics.burnoutRisk === t('t_auto_4') ? 'bg-orange-500/10 border-l-orange-500' : 'bg-emerald-500/10 border-l-emerald-500'}`}>
           <Activity className={`w-6 h-6 mb-2 ${analytics.burnoutRisk === t('t_auto_3') ? 'text-red-500' : analytics.burnoutRisk === t('t_auto_4') ? 'text-orange-500' : 'text-emerald-500'}`} />
           <span className={`text-xl font-bold ${analytics.burnoutRisk === t('t_auto_3') ? 'text-red-500' : analytics.burnoutRisk === t('t_auto_4') ? 'text-orange-500' : 'text-emerald-500'}`}>
             {t('t_auto_7')} {analytics.burnoutRisk}
           </span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{analytics.daysWorkedInRow}</span>
            <span className="text-xs text-muted-foreground mt-1">{t('t_auto_8')}</span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{Math.floor(analytics.totalOvertimeMins / 60)}{t('t_auto_9')} {(analytics.totalOvertimeMins % 60).toFixed(0)}{t('t_auto_10')}</span>
            <span className="text-xs text-muted-foreground mt-1">{t('t_auto_11')}</span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{analytics.currentWeekHours.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground mt-1">{t('t_auto_12')}</span>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 pb-24">
        <div className="md:col-span-2">
          <Card className="h-[450px] flex flex-col shadow-xl border-primary/20">
            <CardHeader className="bg-secondary/20 pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" /> {t('t_auto_13')}
                                            </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 py-4">
                <div className="space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none'}`}>
                        {msg.text === 'SUGGEST_WHATSAPP' ? (
                          <div className="flex flex-col gap-2 relative">
                             <p className="font-bold text-yellow-500 mb-1">{t('t_auto_14')}</p>
                             <p className="text-muted-foreground text-xs leading-relaxed mb-2">{t('t_auto_15')}</p>
                             <a 
                                href={`https://wa.me/201012345678?text=${encodeURIComponent(t('t_auto_16'))}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 bg-[#25D366] text-white p-2 rounded-lg font-bold hover:bg-[#128C7E] transition-colors"
                             >
                                {t('t_auto_17')}
                                                                       </a>
                          </div>
                        ) : msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-xl p-3 bg-secondary animate-pulse rounded-tl-none text-sm">
                        {t('t_auto_18')}
                                                                    </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="pt-3 pb-3 px-3 bg-secondary/10 border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
                <Input 
                  placeholder={t('t_auto_19')} 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  className="bg-background rounded-xl border-white/10 h-12"
                />
                <Button type="submit" disabled={isLoading || !prompt.trim()} className="h-12 w-12 rounded-xl">
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" /> {t('t_auto_20')}
                                            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.burnoutRisk === t('t_auto_3') && (
                 <div className="bg-red-500/10 p-3 rounded-xl text-sm border border-red-500/20">
                   <p className="font-bold text-red-500 mb-1 flex items-center gap-1">
                     <AlertCircle className="w-4 h-4" /> {t('t_auto_21')}
                                                         </p>
                   <p className="text-muted-foreground text-xs leading-relaxed">{t('t_auto_22')} {analytics.daysWorkedInRow} {t('t_auto_23')}</p>
                 </div>
              )}
              {analytics.workedRestDays > 0 && (
                <div className="bg-secondary p-3 rounded-xl text-sm border border-white/5">
                  <p className="font-bold text-yellow-500 mb-1 flex items-center gap-1">
                    <Coffee className="w-4 h-4" /> {t('t_auto_24')}
                                                        </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t('t_auto_25')}{analytics.workedRestDays} {t('t_auto_26')}</p>
                </div>
              )}
              {analytics.burnoutRisk === t('t_auto_2') && analytics.workedRestDays === 0 && (
                <div className="bg-emerald-500/10 p-3 rounded-xl text-sm border border-emerald-500/20">
                  <p className="font-bold text-emerald-500 mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> {t('t_auto_27')}
                                                        </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t('t_auto_28')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
