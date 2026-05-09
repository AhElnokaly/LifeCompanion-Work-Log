import React, { useState, useRef, useEffect } from 'react';
import { useAICore } from '../../contexts/AICoreContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Brain, Send, Bot, Sparkles, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from "@/contexts/LanguageContext";

export default function EmbeddedAIChat() {
    const { t, lang } = useLanguage();

    const SUGGESTED_QUESTIONS = [
      t('t_auto_29'),
      t('t_auto_30'),
      t('t_auto_31'),
      t('t_auto_32'),
      t('t_auto_33')
    ];
  const { askAI } = useAICore();
  const { sessions, settings } = useWorkLog(); // Pass real context
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: t('t_auto_34') }
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
    if (m.includes(t('t_auto_35')) || m.includes(t('t_auto_36')) || m.includes(t('t_auto_37'))) {
        staticReply = t('t_auto_38');
    } else if (m.includes(t('t_auto_39')) || m.includes(t('t_auto_40')) || m.includes(t('t_auto_41'))) {
        staticReply = t('t_auto_42');
    } else if (m.includes(t('t_auto_43')) || m.includes(t('t_auto_44')) || m.includes(t('t_auto_45'))) {
        staticReply = t('t_auto_46');
    } else if (m.includes(t('t_auto_47')) || m.includes(t('t_auto_48')) || m.includes(t('t_auto_49'))) {
        staticReply = t('t_auto_50');
    } else if (m.includes(t('t_auto_51')) || m.includes(t('t_auto_52')) || m.includes(t('t_auto_53')) || m.includes(t('t_auto_54'))) {
        staticReply = t('t_auto_55');
    } else if (m.includes(t('t_auto_56')) || m.includes(t('t_auto_57')) || ((m.includes(t('t_auto_58')) || m.includes(t('t_auto_59'))) && m.includes(t('t_auto_60')) && m.includes(t('t_auto_61')))) {
        staticReply = t('t_auto_62');
    } else if (m.includes(t('t_auto_63')) || m.includes(t('t_auto_64')) || m.includes('overtime')) {
        staticReply = t('t_auto_65');
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
            const reply = t('t_auto_66');
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
            let errorMsg = t('t_auto_67');
            if (error instanceof Error && error.message.includes('API')) {
               errorMsg = t('t_auto_68');
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
                   {t('t_auto_69')}
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
                <Bot className="h-4 w-4 animate-spin text-primary" /> {t('t_auto_70')}
                                            </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <div className="p-3 bg-card border-t shrink-0 absolute bottom-0 left-0 right-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
          <Input 
            placeholder={t('t_auto_71')} 
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
