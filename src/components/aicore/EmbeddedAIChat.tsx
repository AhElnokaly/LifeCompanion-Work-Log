import React, { useState, useRef, useEffect } from 'react';
import { useAICore } from '../../contexts/AICoreContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Brain, Send, Bot, Sparkles, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_QUESTIONS = [
  "كيف أدخل ورديات العمل المتعددة؟",
  "كيف أعدل على تفاصيل عملي والورديات؟",
  "كيف يُحسب العمل الإضافي (Overtime)؟",
  "هل يمكنني إضافة إجازة أو تصريح بأثر رجعي؟",
  "هل يمكن للذكاء الاصطناعي تقييم أأدائي لهذا الشهر؟",
];

export default function EmbeddedAIChat() {
  const { askAI } = useAICore();
  const { sessions, settings } = useWorkLog(); // Pass real context
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي الخاص بـ LifeCompanion المدمج في واجهتك. كيف يمكنني إفادتك اليوم؟ 🧠' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const m = userMessage.toLowerCase();
    
    // Offline/Online Interception for FAQ (Static responses to save API and work offline)
    let staticReply = null;
    if (m.includes('إجاز') || m.includes('اجاز') || m.includes('عطل')) {
        staticReply = "**كيف أسجل الإجازات؟**\nمن خلال واجهة 'التقويم المتقدم' يمكنك الضغط على أي يوم واختيار (إضافة إجازة) مثل تصريح، نصف يوم، إجازة مرضية، أو إجازة سنوية.";
    } else if (m.includes('حذف') || m.includes('ارشف') || m.includes('أرشف')) {
        staticReply = "**كيف أحذف جلسة أو مهمة؟**\nاضغط على الدائرة الجانبية في أعلى السجل الزمني ثم اختر 'أرشفة' أو من الثلاث نقاط للجلسة. يمكنك لاحقاً الذهاب لقسم 'الأرشيف' لاستعادتها أو حذفها نهائياً.";
    } else if (m.includes('راتب') || m.includes('فلوس') || m.includes('محفظ')) {
        staticReply = "**كيف يعمل نظام المحفظة؟**\nالمحفظة تقوم بضرب ساعات عملك الأساسية والإضافية في (سعر الساعة) الذي تحدده في الإعدادات، وتضيف إليه البدلات والخصومات لتقييم دخلك.";
    } else if (m.includes('مخطط') || m.includes('تصميم') || m.includes('رسم')) {
        staticReply = "**كيف أصمم مخططاً؟**\nاذهب لقسم 'صانع المخططات' من القائمة الجانبية. اختر المعايير المطلوبة ثم اضغط حفظ ليظهر المخطط في المحفظة الخاصة بك.";
    } else if (m.includes('نسخ') || m.includes('احتياط') || m.includes('بيانات') || m.includes('امن')) {
        staticReply = "**كيف أحتفظ ببياناتي؟**\nكل بياناتك تُحفظ محلياً في جهازك. يمكنك الذهاب إلى قائمة 'الإعدادات' والضغط على 'تصدير نسخة احتياطية' لحفظها بأمان.";
    } else if (m.includes('وردي') || m.includes('الوردي') || ((m.includes('كيف') || m.includes('ازاي')) && m.includes('ادخل') && m.includes('عمل'))) {
        staticReply = "**الورديات والوظائف:**\n\n📌 **كيف أدخل ورديات وأكثر من عمل؟**\nانتقل إلى 'التقويم المتقدم' ثم انقر على زر 'الوظائف والورديات' (أيقونة الحقيبة). هناك يمكنك إضافة ورديات مخصصة (كالصباحية والمسائية) بالإضافة إلى وظائف ومشاريع لا نهائية (سواء براتب ثابت أو مستقل).\n\n📌 **كيف أُعدّل تفاصيل العمل أو الوردية؟**\nبنفس الشاشة السابقة (الوظائف والورديات)، ستجد أيقونة 'تعديل' (قلم) بجوار أي وردية أو وظيفة مُضافة مسبقاً.";
    } else if (m.includes('عمل إضافي') || m.includes('اوفرتيم') || m.includes('overtime')) {
        staticReply = "**كيف أحسب العمل الإضافي؟**\nمن واجهة 'الإعدادات'، حدد عدد الساعات القياسي لليوم الخاص بك. أي عمل يتم تسجيله ويتجاوز هذا العدد سيتم احتسابه كعمل إضافي تلقائياً ويُمكنك متابعته من التقويم.";
    }

    if (staticReply) {
       setTimeout(() => {
          setMessages(prev => [...prev, { role: 'ai', text: staticReply as string }]);
          setIsLoading(false);
       }, 600);
       return;
    }

    // Only proceed to AI API if no static FAQ matched
    if (!navigator.onLine) {
        // Fallback for offline when no static match is found
        setTimeout(() => {
            const reply = "عذراً، لم أتمكن من العثور على إجابة مسجلة لسؤالك (لأنك غير متصل بالإنترنت حالياً وتطبيقنا مصمم للعمل محلياً بذكاء).\n\n💡 **اقتراح:** يمكنك تصفح قسم 'الأسئلة الشائعة (Q&A)' لمعرفة المزيد حول التطبيق، أو الاتصال بالإنترنت ليقوم الذكاء الاصطناعي الخاص بنا بتحليل سؤالك والتفاعل معك!";
            setMessages(prev => [...prev, { role: 'ai', text: reply }]);
            setIsLoading(false);
        }, 1000);
        return;
    }

    try {
      import('../../lib/analytics').then(async ({ getStats }) => {
        const stats = getStats(sessions, settings);
        const augmentedPrompt = `[Context Data: Burnout Score: ${stats.burnout}%, Streak: ${stats.streak} days, Monthly Hours: ${stats.hoursMonth.toFixed(1)}, Monthly Overtime: ${stats.otMonth.toFixed(1)}]\n\nUser Question: ${userMessage}`;
        
        try {
            const response = await askAI(augmentedPrompt);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            let errorMsg = 'حدث خطأ غير متوقع. يرجى التحقق من مفتاح Gemini API وتأكد من وجود اتصال قوي بالإنترنت.';
            if (error instanceof Error && error.message.includes('API')) {
               errorMsg = 'مفتاح Gemini API غير صالح أو غير موجود. يرجى الدخول للإعدادات وإضافة مفتاح خاص بك ليعمل الذكاء الاصطناعي.';
            }
            setMessages(prev => [...prev, { role: 'ai', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
      });
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative" dir="rtl">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-20">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-secondary rounded-tl-none border border-white/5 shadow-sm'
                }`}
              >
                {msg.role === 'ai' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          
          {messages.length === 1 && (
             <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-3">
                   <Sparkles className="w-4 h-4 text-indigo-400" />
                   اقترحنا لك هذه الأسئلة:
                </h3>
                <div className="flex flex-col gap-2">
                   {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                         key={i}
                         onClick={() => { setPrompt(q); }}
                         className="flex items-center justify-between p-3 rounded-2xl bg-secondary/20 hover:bg-secondary/40 border border-white/5 transition-colors text-right"
                      >
                         <span className="text-sm font-medium text-foreground/80">{q}</span>
                         <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                   ))}
                </div>
             </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="max-w-[80%] rounded-xl p-3 bg-secondary animate-pulse rounded-tl-none text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 animate-spin text-primary" /> يحلل ويفكر...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <div className="p-3 bg-card border-t shrink-0 absolute bottom-0 left-0 right-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
          <Input 
            placeholder="اسأل رفيق الحياة..." 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="bg-background rounded-full border-white/10 h-14 shadow-sm"
          />
          <Button type="submit" disabled={isLoading || !prompt.trim()} className="h-14 w-14 rounded-full shadow-md shrink-0">
            <Send className="h-5 w-5 rtl:-scale-x-100" />
          </Button>
        </form>
      </div>
    </div>
  );
}
