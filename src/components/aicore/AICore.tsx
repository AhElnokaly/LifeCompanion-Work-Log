import React, { useState, useMemo } from 'react';
import { useAICore } from '../../contexts/AICoreContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Brain, Send, Sparkles, TrendingUp, AlertCircle, Activity, Coffee } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { differenceInDays, startOfWeek, endOfWeek } from 'date-fns';

export default function AICore() {
  const { askAI, isLoading } = useAICore();
  const { sessions, projects, settings } = useWorkLog();
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([
    { role: 'ai', text: 'مرحباً! أنا المحرك الذكي الخاص بك. يمكنني قراءة سجلات عملك وتحليل بياناتك لتوقع الإرهاق قبل حدوثه وللحفاظ على توازنك. كيف يمكنني مساعدتك؟' }
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
    let burnoutRisk = 'منخفض';
    
    // Critical Risk (حرج جداً): 
    // Triggered if the user has worked 10+ consecutive days (chronic) OR > 55 hours this week (acute).
    if (daysWorkedInRow >= 10 || currentWeekHours >= 55) {
      burnoutRisk = 'حرج جداً';
    } 
    // High Risk (مرتفع): 
    // Triggered if the user has worked 6+ consecutive days (missed a weekend) OR > 45 hours this week.
    else if (daysWorkedInRow >= 6 || currentWeekHours >= 45) {
      burnoutRisk = 'مرتفع';
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
    `;
    
    const response = await askAI(enhancedPrompt);
    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" /> المحرك الذكي (AI Core)
        </h2>
        <p className="text-muted-foreground">يحلل أنماطك ويقدم توقعات للاحتراق الوظيفي واقتراحات مخصصة بناءً على سجل عملك.</p>
      </div>

      {/* Burnout Tracker Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-4 rounded-2xl flex flex-col items-center justify-center border-white/5 border-l-4 ${analytics.burnoutRisk === 'حرج جداً' ? 'bg-red-500/10 border-l-red-500 animate-pulse' : analytics.burnoutRisk === 'مرتفع' ? 'bg-orange-500/10 border-l-orange-500' : 'bg-emerald-500/10 border-l-emerald-500'}`}>
           <Activity className={`w-6 h-6 mb-2 ${analytics.burnoutRisk === 'حرج جداً' ? 'text-red-500' : analytics.burnoutRisk === 'مرتفع' ? 'text-orange-500' : 'text-emerald-500'}`} />
           <span className={`text-xl font-bold ${analytics.burnoutRisk === 'حرج جداً' ? 'text-red-500' : analytics.burnoutRisk === 'مرتفع' ? 'text-orange-500' : 'text-emerald-500'}`}>
             مؤشر التوتر {analytics.burnoutRisk}
           </span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{analytics.daysWorkedInRow}</span>
            <span className="text-xs text-muted-foreground mt-1">أيام عمل متتالية</span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{Math.floor(analytics.totalOvertimeMins / 60)}س {(analytics.totalOvertimeMins % 60).toFixed(0)}د</span>
            <span className="text-xs text-muted-foreground mt-1">إجمالي الإضافي</span>
        </Card>
        <Card className="p-4 rounded-2xl bg-card border-white/5 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{analytics.currentWeekHours.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground mt-1">ساعات هذا الأسبوع</span>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 pb-24">
        <div className="md:col-span-2">
          <Card className="h-[450px] flex flex-col shadow-xl border-primary/20">
            <CardHeader className="bg-secondary/20 pb-3 border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" /> المستشار الآلي للإنتاجية
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 py-4">
                <div className="space-y-4">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-xl p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-xl p-3 bg-secondary animate-pulse rounded-tl-none text-sm">
                        يجري تحليل الأنماط...
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="pt-3 pb-3 px-3 bg-secondary/10 border-t border-white/5">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
                <Input 
                  placeholder="كيف أستعيد طاقتي؟ هل إسكندرية فكرة جيدة؟" 
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
                <AlertCircle className="h-4 w-4 text-primary" /> قراءات فورية للذكاء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.burnoutRisk === 'حرج جداً' && (
                 <div className="bg-red-500/10 p-3 rounded-xl text-sm border border-red-500/20">
                   <p className="font-bold text-red-500 mb-1 flex items-center gap-1">
                     <AlertCircle className="w-4 h-4" /> خطر الاحتراق (Burnout)!
                   </p>
                   <p className="text-muted-foreground text-xs leading-relaxed">أنت تعمل منذ {analytics.daysWorkedInRow} أيام متتالية دون راحة أو لساعات تتجاوز المعدل. يُرجى طلب إجازة غداً للتعافي.</p>
                 </div>
              )}
              {analytics.workedRestDays > 0 && (
                <div className="bg-secondary p-3 rounded-xl text-sm border border-white/5">
                  <p className="font-bold text-yellow-500 mb-1 flex items-center gap-1">
                    <Coffee className="w-4 h-4" /> أرصدة راحة معلقة!
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">يبدو من السجل أنك داومت في العطلة ({analytics.workedRestDays} مرات). هل طالبت ببدل راحة أو ساعات إضافية لتعويضها؟</p>
                </div>
              )}
              {analytics.burnoutRisk === 'منخفض' && analytics.workedRestDays === 0 && (
                <div className="bg-emerald-500/10 p-3 rounded-xl text-sm border border-emerald-500/20">
                  <p className="font-bold text-emerald-500 mb-1 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> توازن مثالي!
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">أنت تدير جدولك باحترافية، وتتمتع بتوازن صحي بين العمل والحياة الشخصية.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
